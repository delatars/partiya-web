import { expect, normalize, test } from "../fixtures";

/* Карточка предложения и калькулятор партии. Сквозной пример макета:
   1 000 шт + доп. цвет принта + доставка до склада WB = 183 400 ₽;
   на 3 000 шт срабатывает следующая ступень — 135 ₽/шт. */

const OFFER = "/offer/2231";

test.describe("Карточка предложения", () => {
  test("калькулятор считает сквозной пример макета", async ({ page }) => {
    await page.goto(OFFER);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Футболки 180 г/м²");

    const aside = page.locator("aside").first();
    const quantity = page.getByLabel("Объём, шт");

    await quantity.fill("1000");
    await quantity.blur();
    await expect(aside).toContainText("/шт при 1 000");

    await page.getByLabel("Доп. цвет принта").click();
    await expect(aside.getByText("Доп. цвет принта")).toBeVisible();

    await page.getByLabel("Вариант доставки").click();
    await page.getByRole("option", { name: /склада WB/ }).click();

    await expect.poll(async () => normalize(await aside.innerText())).toContain("Итого 183 400 ₽");
  });

  test("следующая ступень объёма роняет цену до 135 ₽", async ({ page }) => {
    await page.goto(OFFER);
    const aside = page.locator("aside").first();
    const quantity = page.getByLabel("Объём, шт");

    await expect(aside).toContainText("до следующей ступени");

    await quantity.fill("3000");
    await quantity.blur();
    await expect
      .poll(async () => normalize(await aside.innerText()))
      .toContain("135 ₽ /шт при 3 000");
  });

  test("параметры калькулятора читаются из адреса", async ({ page }) => {
    await page.goto(`${OFFER}?qty=1000&options=extra-print-color&delivery=wb`);
    const aside = page.locator("aside").first();
    // поле показывает объём с разрядами: «1 000» (пробел неразрывный)
    await expect(page.getByLabel("Объём, шт")).toHaveValue(/^1[\s\u00a0\u202f]?000$/u);
    await expect(page.getByLabel("Доп. цвет принта")).toBeChecked();
    await expect.poll(async () => normalize(await aside.innerText())).toContain("Итого 183 400 ₽");
  });

  test("несуществующее предложение отдаёт экран «не найдено»", async ({ page }) => {
    const response = await page.goto("/offer/9999");
    expect(response?.status()).toBe(200); // SPA: сервер всегда отдаёт index.html
    await expect(page.getByText(/не найден/i).first()).toBeVisible();
  });
});
