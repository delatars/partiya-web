import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";

/* Трекинг заказа в кабинете заказчика: готовность, чат с технологом, приёмка и спор.
   Здесь разрешён демо-пульт (кнопки «→ …»): он двигает статус за фабрику, чтобы не
   гонять вторую роль — сквозной сценарий без пульта проверяет roles-flow.spec.ts. */

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /^Заказчик/ }).click();
  await page.getByRole("button", { name: /Кора/ }).click();
  await expect(page).toHaveURL("/account/orders");
});

/** Демо-пульт: перевести заказ сразу в состояние «ждём приёмки». */
async function jumpToAcceptance(page: Page): Promise<void> {
  await page.getByRole("button", { name: "→ сразу к приёмке" }).click();
  await expect(page.locator("main")).toContainText("Ожидает приёмки");
}

test.describe("Трекинг заказа", () => {
  test("готовность, фотоотчёты и сообщение технологу", async ({ page }) => {
    await page
      .getByRole("link", { name: /№ 4812/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/account\/orders\/4812/);

    const main = page.locator("main");
    await expect(main).toContainText("65 %");
    await expect(main).toContainText("Контроль качества");
    await expect(main).toContainText(/183[\s\u00a0\u202f]400/u);

    // просмотр фотоотчёта: диалог открывается и закрывается по Esc
    await page.locator('button[aria-label^="Открыть фото"]').first().click();
    const viewer = page.getByRole("dialog");
    await expect(viewer).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();

    await page.getByLabel("Сообщение технологу").fill("Когда планируете печать?");
    await page.getByRole("button", { name: "Отправить" }).click();
    await expect(main).toContainText("Когда планируете печать?");
  });

  test("приёмка партии переводит заказ в «Получен»", async ({ page }) => {
    await page.goto("/account/orders/4812");
    await jumpToAcceptance(page);

    await page
      .getByRole("link", { name: /Принять партию|Перейти к приёмке/ })
      .first()
      .click();
    await expect(page).toHaveURL(/acceptance/);
    await expect(page.locator("main")).toContainText("Отчёт контроля качества");

    await page.getByRole("button", { name: "Принять партию" }).click();
    await expect(page).toHaveURL(/\/account\/orders\/4812$/);
    await expect(page.locator("main")).toContainText("Получен");
  });

  test("спор блокирует эскроу", async ({ page }) => {
    await page.goto("/account/orders/4790");
    await jumpToAcceptance(page);

    await page.getByRole("link", { name: "Открыть спор" }).first().click();
    await expect(page).toHaveURL(/dispute/);

    await page.getByLabel("Затронуто изделий").fill("120");
    await page
      .getByPlaceholder("Что именно не так")
      .fill(
        "Размер L фактически соответствует M по ширине: 52 см вместо 56 см по спецификации. " +
          "Замеры 10 изделий приложены.",
      );
    await page.getByRole("radio").nth(1).click();
    await expect(page.locator("main")).toContainText(/Частичный возврат/);

    await page.getByRole("button", { name: "Открыть спор" }).click();
    await expect(page.locator("main")).toContainText("Спор по заказу");
    await expect(page.locator("main")).toContainText("Заблокировано до решения спора");
  });
});
