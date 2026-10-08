import {
  expect,
  FACTORY_PHONE,
  freshPhone,
  loginByPhone,
  logout,
  OPERATOR_PHONE,
  runOrderToAcceptance,
  test,
} from "./fixtures";

/* (c) Спор: претензия из приёмки → ответ завода → частичный возврат оператором.
 *
 * Проверяется не только экран, но и деньги: после решения сумма возврата, доля завода
 * и комиссия обязаны сойтись с итогом заказа — иначе эскроу «потерял» рубли.
 *
 * Заказ здесь свой, второй: первый (`order.spec.ts`) уже принят, а по принятой партии
 * спор не открыть. */

test.describe.configure({ mode: "serial" });

test("спор: претензия из приёмки → ответ завода → частичный возврат оператором", async ({
  page,
}) => {
  test.slow();
  const main = page.locator("main");
  const customerPhone = freshPhone("915");
  const orderId = await runOrderToAcceptance(page, customerPhone);

  /* ── 1. Заказчик открывает спор из приёмки ────────────────────────────── */
  await page.goto(`/account/orders/${orderId}/acceptance`);
  await page.getByRole("link", { name: /Есть претензия/u }).click();
  await page.waitForURL(/\/dispute$/u);

  await page.getByLabel("Причина претензии").click();
  await page.getByRole("option", { name: "Брак изделий" }).click();
  await page.getByLabel("Затронуто изделий").fill("120");
  await page
    .getByLabel("Описание")
    .fill("Брак на 120 изделиях: кривой шов по низу, замеры приложены.");
  await page
    .getByRole("radio", { name: /Частичный возврат/u })
    .first()
    .click();
  /* Сумму требования считает сервер, а не браузер (Q-204): она подписана прямо на
     варианте и дальше обязана совпасть с решением оператора. Текст берём у группы:
     у самой radix-радиокнопки подпись лежит рядом, а не внутри. */
  const remedies = (
    await page.getByRole("radiogroup", { name: "Требование по претензии" }).innerText()
  ).replace(/\s/gu, " ");
  const refundRub = Number(
    /Частичный возврат · ([\d ]+) ₽/u.exec(remedies)?.[1]?.replace(/\D/gu, "") ?? "0",
  );
  expect(refundRub, remedies).toBeGreaterThan(0);

  await page.getByRole("button", { name: /Открыть спор/u }).click();

  // Навигации нет: экран сам превращается в карточку открытого спора.
  await expect(main).toContainText(/Брак изделий/u, { timeout: 60_000 });

  /* ── 2. Завод отвечает на претензию ───────────────────────────────────── */
  await logout(page);
  await loginByPhone(page, FACTORY_PHONE);
  /* Экрана ответа на претензию в кабинете завода нет: `POST /seller/orders/{id}/dispute/reply`
     описан в контракте и работает, но ни одна страница его не зовёт (см. отчёт, Q-332). */
  const replied = await page.evaluate(async (no: string) => {
    const response = await fetch(`/api/v1/seller/orders/${no}/dispute/reply`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        comment: "Брак признаём частично: перекос по 120 шт из партии, готовы вернуть.",
      }),
    });
    return response.status;
  }, orderId);
  expect(replied, "завод отвечает на претензию").toBe(200);

  /* ── 3. Оператор решает спор частичным возвратом ──────────────────────── */
  await logout(page);
  await loginByPhone(page, OPERATOR_PHONE);
  await page.goto(`/admin/disputes?selected=${orderId}`);
  await expect(main).toContainText(`№ ${orderId}`, { timeout: 30_000 });
  // Ответ завода приехал в карточку — оператор решает не по одной стороне.
  await expect(main).toContainText(/Брак признаём частично/u);

  await page.getByRole("radio", { name: /^Частичный возврат/u }).click();
  // Распределение эскроу пересчитывает сервер: возврат заказчику перестаёт быть нулём.
  await expect(main.getByText("Заказчику").locator("xpath=following-sibling::*[1]")).not.toHaveText(
    "0 ₽",
  );
  await page
    .getByRole("textbox", { name: /Обоснование/u })
    .fill("Брак подтверждён выборкой: возврат за 120 шт, остаток — заводу.");

  /* Распределение снимаем ДО решения: после него эскроу уже разобран, и варианты в
     карточке пересчитываются от нулевого остатка — сверять по ним нечего. */
  const card = (await page.evaluate(async (no: string) => {
    const response = await fetch(`/api/v1/admin/disputes/${no}`, { credentials: "include" });
    return response.json();
  }, orderId)) as {
    escrowAmount: number;
    options: { resolution: string; customerAmount: number; factoryAmount: number; fee: number }[];
  };
  const chosen = card.options.find((option) => option.resolution === "partial_refund");
  expect(chosen, "вариант частичного возврата посчитан").toBeDefined();
  const split = chosen as NonNullable<typeof chosen>;

  const resolved = page.waitForResponse(
    (response) => response.url().includes("/resolve") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Вынести решение" }).click();
  expect((await resolved).status(), "решение оператора").toBe(200);
  await expect(main).toContainText(/Решён/u, { timeout: 30_000 });

  /* ── 4. Суммы сходятся ────────────────────────────────────────────────── */
  /* Проверяем тождество, а не выписанное число: возврат заказчику + доля завода +
     комиссия обязаны в точности дать сумму эскроу. Копейки берём из карточки
     оператора — на экране они уже округлены до рублей. */
  const done = (await page.evaluate(async (no: string) => {
    const response = await fetch(`/api/v1/admin/disputes/${no}`, { credentials: "include" });
    return response.json();
  }, orderId)) as { decision: { resolution: string; amount: number | null } | null };

  expect(done.decision?.resolution).toEqual("partial_refund");
  expect(done.decision?.amount, "решение исполнено на сумму требования").toEqual(refundRub * 100);

  expect(split.customerAmount, "возврат — ровно сумма требования").toEqual(refundRub * 100);
  expect(
    split.customerAmount + split.factoryAmount + split.fee,
    "возврат + выплата + комиссия = эскроу",
  ).toEqual(card.escrowAmount);
  /* Комиссия — только с доли завода (Q-194) и без доставки (DECISIONS п.2):
     доставка остаётся заводу целиком (Q-341). Доставка до Коледино из сида — 9 400 ₽. */
  const deliveryKop = 9_400 * 100;
  expect(split.fee).toEqual(
    Math.round(((card.escrowAmount - split.customerAmount - deliveryKop) * 8) / 100),
  );

  /* ── 5. Деньги видны заводу ───────────────────────────────────────────── */
  await logout(page);
  await loginByPhone(page, FACTORY_PHONE);
  await page.goto("/finance");
  await expect(main).toContainText(/Выплат|Финансы/u, { timeout: 30_000 });
  // Экран округляет копейки до рубля; разделитель разрядов в разметке неразрывный,
  // поэтому сравниваем по цифрам, а не по строке.
  const payout = Math.round(split.factoryAmount / 100).toLocaleString("ru-RU");
  await expect(main).toContainText(new RegExp(payout.replace(/\D/gu, "\\D?"), "u"), {
    timeout: 30_000,
  });
});
