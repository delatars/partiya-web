import { expect, loginAs, logout, normalize, test } from "../fixtures";

/* Сквозной сценарий трёх ролей на одном заказе 4811 — без демо-пульта: каждый переход
   делает настоящий экран своей роли. Заканчивается выплатой заводу 168 728 ₽
   (183 400 ₽ минус комиссия платформы).

   Всё внутри одного теста и одного контекста: состояние заказа живёт в хранилище
   браузера, разнести шаги по тестам значило бы потерять его между ними. */

test.describe.configure({ mode: "serial" });

test("заказ 4811 проходит путь заказчик → оператор → завод → заказчик → завод", async ({
  page,
}) => {
  test.slow(); // пять входов и десяток переходов: штатного таймаута мало
  const main = page.locator("main");

  // ── 1. заказчик: счёт на 183 400 ₽
  await loginAs(page, "Заказчик");
  await expect(page.locator("table tbody tr").first()).toBeVisible();

  await page.goto("/account/orders/4811");
  await expect(main).toContainText("Ожидает оплаты");

  await page.goto("/order/4811/pay");
  await expect(main).toContainText(/183[\s\u00a0\u202f]400/u);

  // ── 2. оператор: подтвердить поступление
  await logout(page);
  await loginAs(page, "Оператор");
  await page.goto("/admin/finance");
  await expect(main).toContainText("4811");
  await page.getByRole("button", { name: "Подтвердить поступление" }).first().click();
  await expect(page.getByRole("button", { name: "Подтвердить поступление" })).toHaveCount(0);

  // ── 3. завод: подтвердить заказ и отправить макет технологу
  await logout(page);
  await loginAs(page, "Завод");
  await page.goto("/seller/orders");
  await expect(main).toContainText("4811");

  await page.goto("/seller/orders/4811");
  await expect(main).toContainText("№ 4811");
  await page.getByRole("button", { name: "Подтвердить заказ" }).click();
  await expect(main).toContainText("В производстве");

  await page.getByRole("button", { name: "Отправить макет технологу" }).click();
  await expect(main).toContainText("Следующий шаг за заказчиком");

  // ── 4. заказчик согласовывает макет
  await logout(page);
  await loginAs(page, "Заказчик");
  await page.goto("/account/orders/4811");
  await expect(main).toContainText("Макет на согласовании");
  await page.getByRole("button", { name: /Согласовать макет/ }).click();
  // статус сменился — иначе «Сырьё закуплено» нашлось бы в списке будущих ступеней
  await expect(main).not.toContainText("Макет на согласовании");

  // ── 5. завод ведёт производство и отгружает
  await logout(page);
  await loginAs(page, "Завод");
  await page.goto("/seller/orders/4811");
  await expect(main).toContainText("Внести прогресс");

  const start = page.getByRole("button", { name: "Сырьё закуплено — старт производства" });
  await start.click();
  await expect(start).toHaveCount(0);

  const fact = page.getByLabel("Факт: Отшито");
  await fact.fill("650");
  await page.getByRole("button", { name: "Сохранить: Отшито" }).click();
  await expect(fact).toHaveValue("650");

  /* Переход подтверждаем исчезновением кнопки, а не текстом «Отгружен»: названия всех
     ступеней и так напечатаны в списке «Ступени заказа», и поиск по тексту всегда успешен. */
  const toQc = page.getByRole("button", { name: "Перевести в «Контроль качества»" });
  await toQc.click();
  await expect(toQc).toHaveCount(0);

  const ship = page.getByRole("button", { name: "Отгрузить партию" });
  await ship.click();
  await expect(ship).toHaveCount(0);

  // ── 6. заказчик принимает партию
  await logout(page);
  await loginAs(page, "Заказчик");
  await page.goto("/account/orders/4811");
  await page
    .getByRole("link", { name: /Принять партию/ })
    .first()
    .click();
  await expect(page).toHaveURL(/acceptance/);
  await page.getByRole("button", { name: "Принять партию" }).click();
  await expect(page).toHaveURL(/\/account\/orders\/4811$/);
  await expect(main).toContainText(/Получен|Партия принята/);

  // ── 7. завод видит выплату
  await logout(page);
  await loginAs(page, "Завод");
  await page.goto("/finance");
  await expect.poll(async () => normalize(await main.innerText())).toContain("168 728 ₽");
  await expect(main).toContainText(/183[\s\u00a0\u202f]400/u);
});
