import { expect, test } from "../fixtures";

/* Каталог: фильтры живут в адресе, сортировка перестраивает выдачу,
   пустая выдача объясняет себя, в сравнение влезает не больше четырёх позиций. */

const CATALOG = "/catalog/tekstil/futbolki";

test.describe("Каталог", () => {
  test("фильтры складываются в адрес и переживают перезагрузку", async ({ page }) => {
    await page.goto(CATALOG);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("26");

    await page.getByRole("checkbox", { name: "ЦФО" }).click();
    await expect(page).toHaveURL(/[?&]region=cfo/);

    await page.getByRole("checkbox", { name: "до 500 шт" }).click();
    await expect(page).toHaveURL(/[?&]moq=to500/);

    await page.getByRole("radio", { name: "до 14 дней" }).click();
    await expect(page).toHaveURL(/[?&]lead=14/);

    // счётчик в заголовке пересчитался под выбранные условия
    await expect(heading).toContainText("3");

    // перезагрузка по тому же адресу восстанавливает и фильтры, и выдачу
    await page.reload();
    await expect(page.getByRole("checkbox", { name: "ЦФО" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "до 500 шт" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "до 14 дней" })).toBeChecked();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("3");

    // чип снимает свой фильтр и вычищает его из адреса
    await page.getByRole("button", { name: "Убрать фильтр: ЦФО" }).click();
    await expect(page).not.toHaveURL(/region=cfo/);

    await page.getByRole("button", { name: "Сбросить", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("26");
  });

  test("сортировка переставляет карточки и пишется в адрес", async ({ page }) => {
    await page.goto(CATALOG);
    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    const byPopularity = await cards.first().innerText();

    await page.getByRole("button", { name: "Дешевле" }).click();
    await expect(page).toHaveURL(/[?&]sort=price_asc/);
    await expect(cards.first()).not.toHaveText(byPopularity);

    // «Дешевле» — выдача неубывающая по цене за штуку
    const prices = await page
      .locator("article .price")
      .evaluateAll((nodes) =>
        nodes.map((node) => Number((node.textContent ?? "").replace(/[^\d]/gu, ""))),
      );
    expect(prices.length).toBeGreaterThan(1);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  test("пустая выдача объясняет причину и предлагает выход", async ({ page }) => {
    await page.goto(`${CATALOG}?q=кашемир&moqMax=50`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("0");
    await expect(page.getByText("Под такие условия предложений нет")).toBeVisible();
    await expect(page.locator("article")).toHaveCount(0);

    // «Сбросить все фильтры» снимает условия, но поисковую строку оставляет
    await page.getByRole("button", { name: "Сбросить все фильтры" }).click();
    await expect(page).not.toHaveURL(/moqMax/);
    await expect(page).toHaveURL(/[?&]q=/);

    // выход из тупика — ссылка на весь каталог
    await page.getByRole("link", { name: "Весь каталог" }).click();
    await expect(page).toHaveURL("/catalog");
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("в сравнение кладётся не больше четырёх позиций", async ({ page }) => {
    await page.goto(CATALOG);
    /* Положенная в сравнение карточка меняет подпись кнопки на «Убрать из сравнения»,
       поэтому считаем по карточкам, а не по общему списку кнопок: такая же кнопка
       есть и в лотке сравнения внизу экрана. */
    const cards = page.locator("article");
    for (let index = 0; index < 4; index += 1) {
      const card = cards.nth(index);
      await card.getByRole("button", { name: "Добавить в сравнение" }).click();
      await expect(card.getByRole("button", { name: "Убрать из сравнения" })).toBeVisible();
    }

    // пятая позиция не влезает: кнопка выключена и объясняет почему
    const fifth = cards.nth(4).getByRole("button", { name: "Добавить в сравнение" });
    await expect(fifth).toBeDisabled();
    await expect(fifth).toHaveAttribute("title", /уже 4/);

    await page.getByRole("button", { name: "Сравнить", exact: true }).click();
    await expect(page).toHaveURL(/\/compare/);
    await expect(page.getByRole("table")).toContainText("Минимальная партия");
  });

  test("@mobile фильтры на 390 открываются шторкой", async ({ page }) => {
    await page.goto(CATALOG);
    await page.getByRole("button", { name: /Фильтры/ }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await drawer.getByRole("checkbox", { name: "ЦФО" }).click();
    await expect(page).toHaveURL(/[?&]region=cfo/);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });
});
