import type { Page } from "@playwright/test";

import { expect, horizontalOverflow, test } from "../fixtures";

/* Корневые категории (DECISIONS.md п. 28): сетка карточек на главной и в корне каталога,
   пустая категория объясняет себя, на телефоне сетка в одну колонку без прокрутки вбок. */

const grid = (page: Page) => page.getByRole("list", { name: "Категории" });

test.describe("Категории", () => {
  test("на главной — все 24 корня, текстиль первым, новые категории на месте", async ({ page }) => {
    await page.goto("/");
    const links = grid(page).getByRole("link");
    await expect(links).toHaveCount(24);
    await expect(links.first()).toContainText("Текстиль");
    await expect(links.first()).toContainText("28 предложений");
    await expect(grid(page).getByRole("link", { name: /КИПиА/ })).toContainText(
      "Заводы скоро появятся",
    );
    // объединённая с плиткой макета категория: прежний адрес, новое название (Q-415)
    await expect(grid(page).getByRole("link", { name: /Упаковка и маркировка/ })).toHaveAttribute(
      "href",
      "/catalog/upakovka",
    );
    // старые плитки макета убраны (Q-415)
    for (const title of [
      "Косметика и БАДы",
      "Свечи и декор",
      "Пищевое производство",
      "Пластик и литьё",
    ]) {
      await expect(grid(page).getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
    }
  });

  /* SEO-слепок отдаёт по этому адресу 404 (Q-432); SPA показывает его как любую неизвестную
     категорию — пустой «Каталог», без заголовка и «скоро» убранной плитки. */
  test("адрес убранной категории — неизвестная категория, а не страница свечей", async ({
    page,
  }) => {
    await page.goto("/catalog/svechi");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("Каталог");
    await expect(heading).toContainText("0 предложений");
    await expect(heading).not.toContainText("Свечи");
    await expect(page.getByText("Заводы в этой категории скоро появятся")).toHaveCount(0);
  });

  test("сетка на десктопе — четыре колонки", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expect(grid(page).getByRole("listitem")).toHaveCount(24);
    const tops = await grid(page)
      .getByRole("listitem")
      .evaluateAll((items) => items.slice(0, 5).map((item) => item.getBoundingClientRect().top));
    expect(new Set(tops.slice(0, 4)).size).toBe(1);
    expect(tops[4]).toBeGreaterThan(tops[0] ?? 0);
  });

  test("корень каталога показывает сетку категорий", async ({ page }) => {
    await page.goto("/catalog");
    await expect(grid(page).getByRole("link")).toHaveCount(24);
    await grid(page)
      .getByRole("link", { name: /Подшипники/ })
      .click();
    await expect(page).toHaveURL("/catalog/podshipniki");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Подшипники");
  });

  test("пустая категория — понятное «скоро», а не «сбросьте фильтры»", async ({ page }) => {
    await page.goto("/catalog/nasosy");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Насосы");
    await expect(page.getByText("Заводы в этой категории скоро появятся")).toBeVisible();
    await expect(page.getByText("Под такие условия предложений нет")).toHaveCount(0);
    await page.locator("#catalog-results").getByRole("link", { name: "Подключить завод" }).click();
    await expect(page).toHaveURL("/for-factories");
  });

  test("@mobile на 390 px — одна колонка и без прокрутки вбок", async ({ page }) => {
    for (const path of ["/", "/catalog", "/catalog/nasosy"]) {
      await page.goto(path);
      await expect(page.locator("main")).not.toBeEmpty();
      expect(await horizontalOverflow(page), path).toBe(0);
    }
    await page.goto("/");
    await expect(grid(page).getByRole("listitem")).toHaveCount(24);
    const lefts = await grid(page)
      .getByRole("listitem")
      .evaluateAll((items) => items.slice(0, 3).map((item) => item.getBoundingClientRect().left));
    expect(new Set(lefts).size).toBe(1);
  });
});
