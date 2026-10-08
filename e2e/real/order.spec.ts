import {
  expect,
  FACTORY_PHONE,
  freshPhone,
  loginByPhone,
  logout,
  OPERATOR_PHONE,
  registerCustomer,
  test,
  validInn,
} from "./fixtures";
import type { BrowserContext } from "@playwright/test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* (b) Сквозной сценарий на настоящем бэкенде: от регистрации заказчика до приёмки.
 *
 * Один тест, а не десять: состояние заказа переходит от роли к роли, и разнести шаги
 * по независимым тестам нельзя — второй начнётся с несуществующего заказа.
 *
 * Файлы (макет печати, снимок фотоотчёта) создаются на диске и загружаются
 * по-настоящему: подписанная ссылка, PUT в хранилище, подтверждение — весь путь. */

test.describe.configure({ mode: "serial" });

/** Небольшой настоящий PNG: 1×1 пиксель. Хранилище проверяет тип и размер. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function tempFile(name: string, bytes: Buffer): string {
  const dir = mkdtempSync(join(tmpdir(), "partiya-e2e-"));
  const path = join(dir, name);
  writeFileSync(path, bytes);
  return path;
}

test("сквозной заказ: регистрация → оформление → оплата → производство → приёмка", async ({
  page,
}) => {
  test.slow();
  const main = page.locator("main");
  const customerPhone = freshPhone();
  const artwork = tempFile("maket.png", PNG_1X1);
  const photo = tempFile("cex.png", PNG_1X1);

  /* ── 1. Регистрация заказчика ─────────────────────────────────────────── */
  await registerCustomer(page, customerPhone, validInn(), "ООО «Сквозной e2e»");

  /* ── 2. Карточка 2231: 1 000 шт + доп. цвет + WB → 183 400 ₽ ──────────── */
  await page.goto("/offer/2231");
  await page.getByLabel("Объём, шт").fill("1000");
  await page.getByLabel("Объём, шт").press("Enter");
  await page.locator("#buy-box").getByText("Доп. цвет принта").click();
  await expect(page.locator("#buy-box")).toContainText("183 400 ₽");

  /* ── 3. Оформление: четыре шага ───────────────────────────────────────── */
  await page.getByRole("link", { name: /Оформить партию/u }).click();
  await page.waitForURL(/\/order\/new\?/u);
  await expect(main).toContainText("183 400 ₽");

  // Шаг 1: цвета, размеры и настоящая загрузка макета.
  await page.getByLabel("Цвета: название 1").fill("Чёрный");
  await page.getByLabel("Цвета: количество 1").fill("1000");
  await page.getByLabel("Размерный ряд: название 1").fill("M");
  await page.getByLabel("Размерный ряд: количество 1").fill("1000");
  await page.locator("input[type=file]").first().setInputFiles(artwork);
  await expect(main).toContainText(/maket\.png/u);
  await page
    .getByRole("button", { name: /^Дальше · /u })
    .first()
    .click();

  // Шаг «Плательщик и документы»: организацию подставляет сервер, адрес и оферта — руками.
  await page.getByLabel("Юридический адрес").fill("153000, Иваново, ул. Ленина, д. 1, офис 5");
  await page.getByLabel("Почта бухгалтера").fill("buh@e2e.test");
  await page.getByRole("checkbox", { name: /Принимаю договор-оферту/u }).click();
  await page
    .getByRole("button", { name: /^Дальше · /u })
    .first()
    .click();

  // Шаг 4: оформить и уйти на счёт.
  await page.getByRole("button", { name: /Оплатить в эскроу/u }).click();
  await page.waitForURL(/\/order\/\d+\/pay/u, { timeout: 90_000 });
  const orderId = /\/order\/(\d+)\/pay/u.exec(page.url())?.[1] ?? "";
  expect(orderId).not.toEqual("");
  await expect(main).toContainText(/Счёт|эскроу/u);
  await expect(main).toContainText("183 400 ₽");
  /* Назначение платежа везде с номером заказа (DECISIONS п.6): заказчик видит ту же
     строку, что оператор в очереди «Ожидают поступления». */
  const dealRef = `Оплата по заказу № ${orderId},`;
  await expect(main.getByText(dealRef).first()).toBeVisible();

  /* ── 4. Оператор подтверждает поступление денег ───────────────────────── */
  await logout(page);
  await loginByPhone(page, OPERATOR_PHONE);
  await page.goto("/admin/finance");
  const invoice = main.locator("table").first().locator("tbody tr").filter({ hasText: dealRef });
  await expect(invoice).toHaveCount(1);
  const confirmed = page.waitForResponse(
    (response) =>
      response.url().includes("/confirm-funds") && response.request().method() === "POST",
  );
  await invoice.getByRole("button", { name: "Подтвердить поступление" }).click();
  expect((await confirmed).status(), "подтверждение поступления").toBe(200);
  await expect(invoice).toHaveCount(0, { timeout: 30_000 });

  /* ── 5. Завод подтверждает заказ ──────────────────────────────────────── */
  await logout(page);
  await loginByPhone(page, FACTORY_PHONE);
  await page.goto(`/seller/orders/${orderId}`);
  await expect(main).toContainText(`№ ${orderId}`);
  await expect(main).toContainText("169 480 ₽");
  await page.getByRole("button", { name: "Подтвердить заказ" }).click();
  await expect(main).toContainText("Отправить макет технологу");

  // Макет уходит на согласование заказчику.
  await page.getByRole("button", { name: "Отправить макет технологу" }).click();
  await expect(main).not.toContainText("Отправить макет технологу");
  // Двойная подпись: сначала технолог завода, затем заказчик.
  const factoryApprove = main.getByRole("button", { name: "Согласовать макет" });
  await factoryApprove.click();
  await expect(factoryApprove).toHaveCount(0, { timeout: 30_000 });

  /* ── 6. Заказчик согласует макет, оставаясь на открытой странице трекинга ── */
  await logout(page);
  await loginByPhone(page, customerPhone);
  await page.goto(`/account/orders/${orderId}`);
  await expect(main).toContainText(`Заказ № ${orderId}`);
  await expect(main).toContainText("Макет на согласовании");
  await page
    .getByRole("button", { name: /Согласовать макет/u })
    .first()
    .click();
  // Согласование запускает производство: лента и статус меняются сразу.
  await expect(main).toContainText(/Сырьё закуплено|В производстве|Макет согласован/u);

  /* ── 7. Завод: прогресс и фотоотчёт с настоящей загрузкой снимка ──────── */
  const customerTracking = page;
  const factoryPage = await page.context().browser()?.newContext();
  // Отдельный контекст: заводская сессия не должна вытеснить заказчика — страница
  // трекинга остаётся ОТКРЫТОЙ, и по ней проверяется живое событие (SSE).
  expect(factoryPage).toBeDefined();
  const factory = await (factoryPage as BrowserContext).newPage();
  await factory.route("**/config.json", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ apiBaseUrl: "/api/v1", useMocks: false, features: {} }),
    });
  });
  await loginByPhone(factory, FACTORY_PHONE);
  await factory.goto(`/seller/orders/${orderId}`);
  const factoryMain = factory.locator("main");

  await factoryMain.getByLabel("Факт: Раскроено").fill("1000");
  await factoryMain.getByLabel("Сохранить: Раскроено").click();
  await expect(factoryMain).toContainText(/Последнее обновление/u);

  await factory.locator("input[type=file]").first().setInputFiles(photo);
  await factoryMain.getByLabel(/Подпись/u).fill("Раскрой готов, печать запущена");
  await factoryMain.getByRole("button", { name: "Опубликовать в ленте заказа" }).click();

  /* ── 8. SSE: событие приезжает на ОТКРЫТУЮ страницу без перезагрузки ──── */
  await expect(customerTracking.locator("main")).toContainText(/Фотоотчёт|Раскроено/u, {
    timeout: 60_000,
  });

  /* ── 9. Чат в обе стороны ─────────────────────────────────────────────── */
  await factoryMain
    .getByRole("textbox", { name: /Сообщение|Написать/u })
    .first()
    .fill("Печать запущена, цветопроба по макету совпала.");
  await factoryMain
    .getByRole("button", { name: /Отправить/u })
    .first()
    .click();
  await expect(customerTracking.locator("main")).toContainText("цветопроба", { timeout: 60_000 });

  await customerTracking
    .getByRole("textbox", { name: /Сообщение|Написать/u })
    .first()
    .fill("Спасибо, ждём фото отгрузки.");
  await customerTracking
    .getByRole("button", { name: /Отправить/u })
    .first()
    .click();
  /* Обратную сторону проверяем ПОСЛЕ перезагрузки: живой канал (`/orders/{id}/stream`)
     подключает только экран трекинга заказчика — кабинет завода читает заказ обычным
     запросом. Это не дефект этого теста, а незакрытая дыра продукта: см. отчёт, Q-331. */
  await factory.reload();
  await expect(factoryMain).toContainText("ждём фото отгрузки", { timeout: 60_000 });

  /* ── 10. Резерв мощности: заказ держит недели на `/capacity` ──────────── */
  await factory.goto("/capacity");
  await expect(factory.locator("main")).toContainText(/Резерв|резерв/u);
  const reserved = await factory
    .locator("main")
    .getByText(/\d+\s*(шт|%)/u)
    .count();
  expect(reserved, "план мощности показывает занятые недели").toBeGreaterThan(0);

  /* ── 11. Завод доводит партию до отгрузки ─────────────────────────────── */
  await factory.goto(`/seller/orders/${orderId}`);
  await expect(factoryMain).toContainText(`№ ${orderId}`);
  for (const label of [
    "Сырьё закуплено — старт производства",
    "Перевести в «Контроль качества»",
    "Отгрузить партию",
  ]) {
    // Кнопку рисует `availableCommands` заказа, а он приезжает запросом: ждём её
    // появления, а не проверяем наличие сразу после перехода.
    const button = factoryMain.getByRole("button", { name: label });
    await button.first().waitFor({ state: "visible", timeout: 30_000 });
    await button.first().click();
    await expect(button).toHaveCount(0, { timeout: 30_000 });
  }
  // Бейдж статуса — единственное место, где написан сам статус (в ленте этапов
  // «Отгружен» стоит всегда): баг № 6 сделал его `role="status"`.
  await expect(factoryMain.getByRole("status").first()).toHaveText("Отгружен");
  await factory.close();

  /* ── 12. Оператор отмечает доставку ───────────────────────────────────── */
  await logout(page);
  await loginByPhone(page, OPERATOR_PHONE);
  /* Запасной путь оператора — экран «Доставка» (Q-332): номер заказа → подтверждение.
     Штатно доставку отмечает завод с трек-номером (см. `runOrderToAcceptance`). */
  await page.goto("/admin/delivery");
  await main.getByLabel("Номер заказа").fill(orderId);
  await main.getByRole("button", { name: "Доставлено…" }).click();
  await main.getByRole("button", { name: "Да, доставлено" }).click();
  await expect(main).toContainText(`Заказ № ${orderId} в приёмке`, { timeout: 30_000 });

  /* ── 13. Заказчик принимает партию с отзывом ──────────────────────────── */
  await logout(page);
  await loginByPhone(page, customerPhone);
  await page.goto(`/account/orders/${orderId}/acceptance`);
  await expect(main).toContainText(/Приёмка|Принять партию/u);
  await main.getByLabel("Замечания к партии").fill("Партия принята, брака нет.");
  await main.getByLabel("Оценка 5").click();
  await main.getByLabel("Текст отзыва").fill("Сроки выдержаны, качество печати ровное.");
  await page.getByRole("button", { name: /Принять партию/u }).click();
  await page.waitForURL(new RegExp(`/account/orders/${orderId}(?!/acceptance)`, "u"), {
    timeout: 60_000,
  });
  await expect(main).toContainText(/Получен|Завершён|Принят/u, { timeout: 30_000 });

  /* ── 14. Деньги завода: 169 480 ₽ на `/finance` ───────────────────────── */
  await logout(page);
  await loginByPhone(page, FACTORY_PHONE);
  await page.goto("/finance");
  await expect(main).toContainText("169 480 ₽", { timeout: 30_000 });
});
