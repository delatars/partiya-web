import type { Page } from "@playwright/test";
import { expect, normalize, test } from "../fixtures";

/* Оформление партии: карточка → вход → четыре шага → счёт → заказ в кабинете.
   Сквозной пример макета — 1 000 футболок с доп. цветом принта и доставкой до склада WB,
   183 400 ₽. */

/** Раскрыть шаг, если он свёрнут: повторный клик по заголовку его закрывает. */
async function openStep(page: Page, name: RegExp | string): Promise<void> {
  const head = page.getByRole("button", { name }).first();
  if ((await head.getAttribute("aria-expanded")) === "false") await head.click();
}

test.describe("Оформление партии", () => {
  test("аноним доходит до счёта, и заказ появляется в кабинете", async ({ page }) => {
    await page.goto("/offer/2231?qty=1000&options=extra-print-color&delivery=wb");
    const offerAside = page.locator("aside").first();
    await expect
      .poll(async () => normalize(await offerAside.innerText()))
      .toContain("Итого 183 400 ₽");

    // CTA анонима уводит на вход и возвращает в оформление
    await page.getByRole("link", { name: "Оформить партию" }).click();
    await expect(page).toHaveURL(/\/login\?redirect=/);
    await page.getByRole("button", { name: /^Заказчик/ }).click();
    await page.getByRole("button", { name: /Кора/ }).click();
    await expect(page).toHaveURL(/\/order\/new/);

    const aside = page.locator("aside").first();

    // шаг 1: макет
    await openStep(page, /Параметры партии и макет/);
    await page.setInputFiles('input[type="file"]', {
      name: "logo_front.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% макет для e2e\n%%EOF\n"),
    });
    await expect(page.getByText("на проверке у технолога")).toBeVisible();

    // шаг 2: доставка
    await openStep(page, /Доставка/);
    await page.getByText("Доставка до склада WB", { exact: false }).first().click();

    // шаг 3: плательщик
    await openStep(page, /Плательщик и документы/);
    await page.getByRole("checkbox", { name: /Принимаю договор-оферту/ }).check();

    // шаг 4: оплата — заведомо неверный промокод отвергается
    await openStep(page, /^Оплата/);
    await page.getByLabel("Промокод").fill("НЕТТАКОГО");
    await page.getByRole("button", { name: "OK" }).click();
    await expect(page.getByText(/не найден/)).toBeVisible();
    await page.getByLabel("Промокод").fill("");

    await expect.poll(async () => normalize(await aside.innerText())).toContain("Итого 183 400 ₽");

    // счёт
    await page.getByRole("button", { name: "Оплатить в эскроу" }).click();
    await expect(page).toHaveURL(/\/order\/\d+\/pay/);
    const orderId = /\/order\/(\d+)\/pay/.exec(page.url())?.[1];
    expect(orderId).toBeTruthy();
    await expect(page.getByText(/183[\s\u00a0\u202f]400/)).toBeVisible();

    await page.getByRole("button", { name: /Я оплатил \(демо\)/ }).click();
    await expect(page.getByText("ждём подтверждения фабрики")).toBeVisible();

    // заказ в кабинете
    await page.goto("/account/orders");
    const row = page.locator("table tbody tr").filter({ hasText: String(orderId) });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Ожидает подтверждения");
  });

  test("черновик оформления переживает перезагрузку", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /^Заказчик/ }).click();
    await page.getByRole("button", { name: /Кора/ }).click();

    await page.goto("/order/new?offer=2231&qty=1000&options=extra-print-color");
    await page.setInputFiles('input[type="file"]', {
      name: "logo_front.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% макет для e2e\n%%EOF\n"),
    });
    await expect(page.getByText("на проверке у технолога")).toBeVisible();

    await openStep(page, /Доставка/);
    await page.getByText("Самовывоз с фабрики", { exact: false }).first().click();
    const aside = page.locator("aside").first();
    // самовывоз стоит 0 ₽: строки доставки в сводке нет, итог падает до партии с опцией
    await expect.poll(async () => normalize(await aside.innerText())).toContain("Итого 174 000 ₽");

    /* Уходим со страницы и возвращаемся по адресу БЕЗ ?draft=: черновик должен
       подхватиться по офферу, а не по идентификатору в адресе. */
    const withoutDraft = page.url().replace(/[?&]draft=\d+/u, "");
    await page.goto("/catalog");
    await page.goto(withoutDraft);
    await page.reload();

    const batchStep = page.getByRole("button", { name: /Параметры партии и макет/ });
    await expect(batchStep).toContainText(/1[\s\u00a0\u202f]000 шт/u);
    await expect(batchStep).toContainText("макет: 1");
    await expect(page.getByRole("button", { name: /Доставка/ })).toContainText(
      "Самовывоз с фабрики",
    );
    await expect.poll(async () => normalize(await aside.innerText())).toContain("Итого 174 000 ₽");
  });

  test("заказ образца оплачивается картой", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /^Заказчик/ }).click();
    await page.getByRole("button", { name: /Кора/ }).click();

    await page.goto("/sample/new?offer=2231");
    await expect(page.locator("aside").first()).toContainText("Итого");
    await page.getByRole("button", { name: "Оплатить картой" }).click();
    await expect(page.getByText(/заказан/)).toBeVisible();
  });
});
