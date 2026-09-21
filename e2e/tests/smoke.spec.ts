import type { Page } from "@playwright/test";
import { expect, horizontalOverflow, loginAs, test, type DemoRole } from "../fixtures";
import {
  CUSTOMER_ROUTES,
  FACTORY_ROUTES,
  OPERATOR_ROUTES,
  PUBLIC_ROUTES,
  type RouteCase,
} from "../routes";

/* Дымовой обход всех маршрутов из дерева маршрутов: каждый экран открывается,
   ничего не пишет в консоль и на 390 px не даёт горизонтальной прокрутки.

   Вход делается один раз на группу: логиниться перед каждым из полутора десятков
   экранов вышло бы втрое дольше без всякой пользы. */

async function walk(
  page: Page,
  routes: readonly RouteCase[],
  errors: string[],
  { checkOverflow }: { checkOverflow: boolean },
): Promise<void> {
  const problems: string[] = [];

  for (const route of routes) {
    await page.goto(route.path);
    // экран отрисовался: у оболочки всегда есть «подвал» с меню категорий
    await expect(page.locator("main")).not.toBeEmpty();
    if (route.heading !== undefined) {
      await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(route.heading);
    }

    if (checkOverflow) {
      const overflow = await horizontalOverflow(page);
      if (overflow > 0) problems.push(`${route.path}: горизонтальная прокрутка ${overflow} px`);
    }

    if (errors.length > 0) {
      problems.push(`${route.path}: ${errors.join(" · ")}`);
      errors.length = 0;
    }
  }

  expect(problems, problems.join("\n")).toEqual([]);
}

const GROUPS: readonly { name: string; as: DemoRole | null; routes: readonly RouteCase[] }[] = [
  { name: "публичные экраны", as: null, routes: PUBLIC_ROUTES },
  { name: "кабинет заказчика", as: "Заказчик", routes: CUSTOMER_ROUTES },
  { name: "кабинет завода", as: "Завод", routes: FACTORY_ROUTES },
  { name: "бэк-офис оператора", as: "Оператор", routes: OPERATOR_ROUTES },
];

for (const group of GROUPS) {
  test(`${group.name}: открываются без ошибок консоли`, async ({ page, consoleErrors }) => {
    test.slow();
    if (group.as !== null) await loginAs(page, group.as);
    await walk(page, group.routes, consoleErrors, { checkOverflow: false });
  });

  test(`@mobile ${group.name}: на 390 px нет горизонтальной прокрутки`, async ({
    page,
    consoleErrors,
  }) => {
    test.slow();
    if (group.as !== null) await loginAs(page, group.as);
    await walk(page, group.routes, consoleErrors, { checkOverflow: true });
  });
}
