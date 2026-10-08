import {
  expect,
  freshPhone,
  loginByPhone,
  logout,
  OFFER_NO,
  registerCustomer,
  runOrderToAcceptance,
  test,
  validInn,
} from "./fixtures";
import type { Locator } from "@playwright/test";

/* (e) повтор партии, (f) промокод, (g) слепок для поисковика.
 *
 * Три независимые проверки на одном стенде: общего состояния у них нет, поэтому и
 * порядок между ними не важен — но набор идёт в один поток (`workers: 1`). */

const OFFER_PATH = `/offer/${String(OFFER_NO)}`;

/* ── (g) SEO ──────────────────────────────────────────────────────────────── */

test("SEO: без JS отдаётся слепок, с JS карточка не перезапрашивается", async ({
  page,
  request,
}) => {
  /* Без JS: слепок собирает крейт `seo`, и поисковик обязан увидеть товар целиком —
     заголовок, описание, канонический адрес и разметку Schema.org. */
  const response = await request.get(OFFER_PATH);
  expect(response.status()).toBe(200);
  const html = await response.text();

  expect(html, "заголовок страницы").toMatch(/<title>[^<]*Футболки 180[^<]*<\/title>/u);
  expect(html, "h1 в разметке").toMatch(/<h1[^>]*>Футболки 180/u);
  expect(html, "канонический адрес").toContain(`rel="canonical" href="${OFFER_PATH}"`);
  expect(html, "og:title").toContain('property="og:title"');
  expect(html, "Schema.org Product").toContain('"@type":"Product"');
  expect(html, "цена ступени в разметке").toContain('"priceCurrency":"RUB"');

  /* С JS: данные приезжают в слепке (`window.__INITIAL__`), и второй раз за той же
     карточкой приложение не ходит — иначе слепок не экономит ни запроса. */
  const refetches: string[] = [];
  await page.route("**/api/v1/offers/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === `/api/v1/offers/${String(OFFER_NO)}`) refetches.push(url.pathname);
    await route.continue();
  });

  await page.goto(OFFER_PATH);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Футболки 180");
  // Калькулятор посчитал — значит экран ожил, а не остался слепком.
  await expect(page.locator("#buy-box")).toContainText("₽");

  expect(refetches, `карточка запрошена повторно: ${refetches.join(", ")}`).toEqual([]);
});

/* ── (f) промокод ─────────────────────────────────────────────────────────── */

/* Промокоды выключены продуктовым решением: поле скрыто флагом `features.promoCodes`
   конфига фронта (по умолчанию выключен), бэк на любой код отвечает 422
   `quote/unknown_promo`. Проверяем, что в оформлении поля нет. */
test("промокоды выключены: поля «Промокод» в оформлении нет", async ({ page }) => {
  test.slow();
  const main = page.locator("main");
  await registerCustomer(page, freshPhone("914"), validInn(), "ООО «Промо e2e»");

  await page.goto(OFFER_PATH);
  await page.getByLabel("Объём, шт").fill("1000");
  await page.getByLabel("Объём, шт").press("Enter");
  const checkout = page.getByRole("link", { name: /Оформить партию/u });
  await expect(checkout).toHaveAttribute("href", /qty=1000\b/u, { timeout: 30_000 });
  await checkout.click();
  await page.waitForURL(/\/order\/new\?/u);

  const summary = main.getByRole("complementary", { name: "Сводка заказа" });
  expect(await totalOf(summary), "сводка посчитана").toBeGreaterThan(0);
  await expect(main.getByLabel("Промокод")).toHaveCount(0);
});

/* Старый сценарий: работает, только если включить `features.promoCodes` в конфиге
   и промокоды на бэке. Оставлен пропущенным как образец на случай включения. */
test.skip("промокод ПАРТИЯ5 снимает 5 % в сводке оформления", async ({ page }) => {
  test.slow();
  const main = page.locator("main");
  await registerCustomer(page, freshPhone("914"), validInn(), "ООО «Промо e2e»");

  await page.goto(OFFER_PATH);
  await page.getByLabel("Объём, шт").fill("1000");
  await page.getByLabel("Объём, шт").press("Enter");
  const checkout = page.getByRole("link", { name: /Оформить партию/u });
  await expect(checkout).toHaveAttribute("href", /qty=1000\b/u, { timeout: 30_000 });
  await checkout.click();
  await page.waitForURL(/\/order\/new\?/u);

  const summary = main.getByRole("complementary", { name: "Сводка заказа" });
  const before = await totalOf(summary);
  // Цена самой партии, без доставки: промокод считается от неё.
  const batch = await amountOf(summary, /Партия [\d ]+ × [\d ]+ ₽/u);

  await main.getByLabel("Промокод").fill("ПАРТИЯ5");
  await summary.getByRole("button", { name: "OK" }).click();

  await expect(summary).toContainText(/ПАРТИЯ5 применён/u, { timeout: 30_000 });
  await expect(summary).toContainText(/Промокод ПАРТИЯ5 −5 %/u);
  const after = await totalOf(summary);

  /* Скидку считает сервер: сверяем не текст, а сумму. 5 % берутся с партии, а не со
     всего счёта — доставку промокод не удешевляет, и это правильно. */
  expect(before, "итог до промокода").toBeGreaterThan(0);
  expect(before - after, `${String(before)} → ${String(after)}`).toEqual(Math.round(batch * 0.05));
});

/** Итог «Итого» из сводки оформления, в рублях: самая большая сумма на ней. */
async function totalOf(summary: Locator): Promise<number> {
  const text = (await summary.innerText()).replace(/\s/gu, " ");
  const totals = [...text.matchAll(/([\d ]+) ₽/gu)].map((match) =>
    Number((match[1] ?? "").replace(/\D/gu, "")),
  );
  return Math.max(0, ...totals);
}

/** Сумма строки сводки, подписанной `label`. */
async function amountOf(summary: Locator, label: RegExp): Promise<number> {
  const text = (await summary.innerText()).replace(/\s/gu, " ");
  const at = text.search(label);
  expect(at, `строка ${label.source} не найдена в сводке`).toBeGreaterThanOrEqual(0);
  const value = /([\d ]+) ₽/u.exec(text.slice(at + text.slice(at).search(/₽/u) + 1));
  return Number((value?.[1] ?? "").replace(/\D/gu, ""));
}

/* ── (e) повтор партии ────────────────────────────────────────────────────── */

/* Q-333 закрыт на бэкенде: `Order.repeatDiscountPercent` — скидка за повтор у этой
   фабрики из карточки предложения (у оффера 2231 — 9 %), а не уже применённая к
   заказу. Кнопка читается «Повторить −9 %». */
test("повтор принятой партии идёт со скидкой −9 %", async ({ page }) => {
  test.slow();
  const main = page.locator("main");
  const customerPhone = freshPhone("913");
  const orderId = await runOrderToAcceptance(page, customerPhone);

  // Повтор доступен по принятой партии, поэтому сначала приёмка.
  await page.goto(`/account/orders/${orderId}/acceptance`);
  await page.getByRole("button", { name: /Принять партию/u }).click();
  await page.waitForURL(new RegExp(`/account/orders/${orderId}(?!/acceptance)`, "u"), {
    timeout: 60_000,
  });

  await page.goto("/account/repeat");
  await expect(main).toContainText(`№ ${orderId}`, { timeout: 30_000 });
  const repeat = main.getByRole("button", { name: /Повторить −9 %/u }).first();
  await expect(repeat, "скидка повтора приходит с карточки предложения").toBeVisible();

  await repeat.click();
  // Повтор — новый черновик по сохранённой спецификации: сервер уводит в оформление.
  await page.waitForURL(/\/order\/(new|\d+)/u, { timeout: 60_000 });
  await expect(main).toContainText(/−9 %|Повтор/u, { timeout: 30_000 });

  await logout(page);
  await loginByPhone(page, customerPhone);
});
