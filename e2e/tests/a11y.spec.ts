import type { Page } from "@playwright/test";
import { expect, loginAs, test, type DemoRole } from "../fixtures";
import {
  CUSTOMER_ROUTES,
  FACTORY_ROUTES,
  OPERATOR_ROUTES,
  PUBLIC_ROUTES,
  type RouteCase,
} from "../routes";

/* Базовая доступность без сторонних библиотек: у страницы ровно один <h1>,
   а у интерактивных элементов есть доступное имя. Этого хватает, чтобы ловить
   самое частое — безымянные иконочные кнопки и потерянный заголовок экрана.

   Полный аудит (контраст, порядок фокуса, ARIA-роли) сюда не лезет: для него нужен
   axe, и его подключение — отдельное решение, см. e2e/README.md. */

/** Интерактивные элементы без доступного имени: текста, aria-label, aria-labelledby,
    связанного <label>, title, placeholder или alt. */
async function unnamedControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const SELECTOR = [
      "button",
      "a[href]",
      "input:not([type=hidden])",
      "select",
      "textarea",
      "[role=button]",
      "[role=link]",
      "[role=checkbox]",
      "[role=radio]",
      "[role=switch]",
      "[role=tab]",
    ].join(", ");

    const named = (el: Element): boolean => {
      const byLabelledBy = (el.getAttribute("aria-labelledby") ?? "")
        .split(/\s+/u)
        .filter((id) => id.length > 0)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ");
      const byLabel =
        el.id === ""
          ? ""
          : (document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent ?? "");
      return [
        el.textContent,
        el.getAttribute("aria-label"),
        byLabelledBy,
        byLabel,
        el.closest("label")?.textContent ?? "",
        el.getAttribute("title"),
        el.getAttribute("placeholder"),
        el.getAttribute("alt"),
      ].some((value) => (value ?? "").trim().length > 0);
    };

    const visible = (el: Element): boolean => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && el.getAttribute("aria-hidden") !== "true";
    };

    return [...document.querySelectorAll(SELECTOR)]
      .filter((el) => visible(el) && !named(el))
      .slice(0, 10)
      .map(
        (el) =>
          `<${el.tagName.toLowerCase()} role=${el.getAttribute("role") ?? "-"} name=${el.getAttribute("name") ?? "-"}>`,
      );
  });
}

async function audit(page: Page, routes: readonly RouteCase[]): Promise<string[]> {
  const problems: string[] = [];

  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.locator("main")).not.toBeEmpty();
    /* Содержимое кабинета приезжает после оболочки: ждём заголовок, а не считаем сразу.
       Если его нет вовсе — ожидание истечёт, и проверка ниже это и зафиксирует. */
    await page
      .locator("h1")
      .first()
      .waitFor({ timeout: 10_000 })
      .catch(() => undefined);

    const headings = await page.locator("h1").allInnerTexts();
    if (headings.length !== 1) {
      problems.push(`${route.path}: <h1> ровно один ожидался, найдено ${headings.length}`);
    }

    const unnamed = await unnamedControls(page);
    if (unnamed.length > 0) {
      problems.push(`${route.path}: без доступного имени — ${unnamed.join(", ")}`);
    }
  }

  return problems;
}

const GROUPS: readonly { name: string; as: DemoRole | null; routes: readonly RouteCase[] }[] = [
  { name: "публичные экраны", as: null, routes: PUBLIC_ROUTES },
  { name: "кабинет заказчика", as: "Заказчик", routes: CUSTOMER_ROUTES },
  { name: "кабинет завода", as: "Завод", routes: FACTORY_ROUTES },
  { name: "бэк-офис оператора", as: "Оператор", routes: OPERATOR_ROUTES },
];

for (const group of GROUPS) {
  test(`${group.name}: один h1 и доступные имена у элементов управления`, async ({ page }) => {
    test.slow();
    if (group.as !== null) await loginAs(page, group.as);
    const problems = await audit(page, group.routes);
    expect(problems, problems.join("\n")).toEqual([]);
  });
}
