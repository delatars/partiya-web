import { expect, FACTORY_PHONE, loginByPhone, logout, OPERATOR_PHONE, test } from "./fixtures";

/* (d) Новое предложение завода: ошибка ступеней → исправление → модерация →
 * публикация оператором → предложение в каталоге → карточка → котировка.
 *
 * Тот же путь, что проверяет `e2e/tests/seller-offer.spec.ts` на моках, но здесь его
 * проходят настоящие правила: ступени проверяет движок котировок, модерацию ведёт
 * `catalog::seller`, а в выдачу SKU попадает через ранжирование PostgreSQL. */

test.describe.configure({ mode: "serial" });

/** Название только для этого прогона: в каталоге такого нет, спутать не с чем. */
const TITLE = `Худи real-e2e ${String(Date.now()).slice(-6)}`;

test("SKU: ошибка ступеней → модерация → публикация → каталог → котировка", async ({ page }) => {
  test.slow();
  const main = page.locator("main");

  /* ── 1. Завод заводит SKU с заведомо неверными ступенями ──────────────── */
  await loginByPhone(page, FACTORY_PHONE);
  await page.goto("/seller/offers/new/edit");
  await page.getByLabel("Название в выдаче").fill(TITLE);
  await page.getByLabel("Минимальная партия (MOQ), шт").fill("300");

  await page.getByRole("button", { name: "+ Ступень" }).click();
  await page.getByLabel("Объём ступени 1").fill("300");
  await page.getByLabel("Цена ступени 1").fill("248");
  await page.getByRole("button", { name: "+ Ступень" }).click();
  await page.getByLabel("Объём ступени 2").fill("1000");
  // Дороже на большем объёме — так котировать нельзя, и сервер обязан это сказать.
  await page.getByLabel("Цена ступени 2").fill("260");

  await page.getByRole("button", { name: "Отправить на модерацию" }).click();
  await expect(main).toContainText("Цена на большем объёме не может быть выше");

  /* ── 2. Исправление и отправка на модерацию ───────────────────────────── */
  await page.getByLabel("Цена ступени 2").fill("224");
  await page.getByRole("button", { name: "Отправить на модерацию" }).click();
  await expect(main).toContainText(/отправлено на модерацию|На модерации/iu);

  await page.goto("/seller/offers");
  await expect(main).toContainText(TITLE);

  /* ── 3. Оператор публикует именно эту заявку ──────────────────────────── */
  await logout(page);
  await loginByPhone(page, OPERATOR_PHONE);
  await page.goto("/admin/moderation");
  await expect(main).toContainText(TITLE, { timeout: 30_000 });

  // Выбор заявки — клик по строке очереди (баг № 4), и он уходит в адрес.
  const row = main.locator("table").first().locator("tbody tr").filter({ hasText: TITLE }).first();
  await row.getByRole("button").first().click();
  await expect(page).toHaveURL(/selected=/u);

  const detail = main.locator("aside");
  await expect(detail).toContainText(TITLE);
  await page.getByRole("button", { name: /Опубликовать/u }).click();
  await expect(main).not.toContainText(TITLE, { timeout: 30_000 });

  /* ── 4. Предложение в каталоге, карточка и котировка ──────────────────── */
  await logout(page);
  await page.goto(`/catalog?q=${encodeURIComponent(TITLE)}`);
  const card = main.getByRole("link", { name: new RegExp(TITLE, "u") }).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();

  await page.waitForURL(/\/offer\/\d+/u);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(TITLE);

  // Котировку считает сервер: на 1 000 шт действует вторая ступень — 224 ₽ за штуку.
  await page.getByLabel("Объём, шт").fill("1000");
  await page.getByLabel("Объём, шт").press("Enter");
  await expect(page.locator("#buy-box")).toContainText("224 000 ₽", { timeout: 30_000 });
});
