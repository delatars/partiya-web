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
  type ApiIssue,
} from "./fixtures";
import type { Page } from "@playwright/test";

/* (a) Обход всех маршрутов под тремя ролями и анонимом на настоящем бэкенде.
 *
 * Что проверяем на каждом экране: он отрисовался (в `main` есть содержимое и, где это
 * уместно, заголовок первого уровня), в консоль ничего не упало, API не ответил 4xx/5xx
 * сверх ожидаемого, и экран не остался вечным скелетоном.
 *
 * Пути параметризованы данными `seed`: оффер 2231 и завод 17 — сквозной пример макета.
 * Заказов у свежей базы нет, поэтому маршруты вида `/account/orders/{id}` проверяет
 * сквозной сценарий (`order.spec.ts`), а не этот обход. */

type Case = { path: string; heading?: RegExp };

const PUBLIC: readonly Case[] = [
  { path: "/" },
  { path: "/catalog/tekstil/futbolki", heading: /Футболки/u },
  { path: "/catalog/tekstil" },
  { path: "/offer/2231", heading: /Футболки 180/u },
  { path: "/factory/17", heading: /Волна/u },
  { path: "/factories" },
  { path: "/compare" },
  { path: "/how-it-works" },
  { path: "/for-factories" },
  { path: "/login", heading: /Вход/u },
  { path: "/register" },
];

const CUSTOMER: readonly Case[] = [
  { path: "/account/orders" },
  { path: "/account/repeat" },
  { path: "/samples" },
  { path: "/favorites" },
  { path: "/documents" },
  { path: "/escrow" },
  { path: "/notifications" },
  { path: "/company" },
  { path: "/order/new?offer=2231&qty=1000" },
  { path: "/sample/new?offer=2231" },
];

const FACTORY: readonly Case[] = [
  { path: "/seller", heading: /Сводка/u },
  { path: "/seller/offers" },
  { path: "/seller/offers/new/edit" },
  { path: "/seller/orders" },
  { path: "/seller/samples" },
  { path: "/capacity" },
  { path: "/finance" },
  { path: "/feedback" },
  { path: "/audit" },
  { path: "/onboarding/factory" },
];

const OPERATOR: readonly Case[] = [
  { path: "/admin", heading: /Обзор/u },
  { path: "/admin/moderation" },
  { path: "/admin/finance" },
  { path: "/admin/disputes" },
  { path: "/admin/taxonomy" },
  { path: "/admin/ranking" },
];

/** Обойти набор маршрутов и собрать все претензии в один список. */
async function walk(
  page: Page,
  routes: readonly Case[],
  consoleErrors: string[],
  apiIssues: ApiIssue[],
): Promise<string[]> {
  const problems: string[] = [];

  for (const route of routes) {
    consoleErrors.length = 0;
    apiIssues.length = 0;
    await page.goto(route.path);
    await expect(page.locator("main")).not.toBeEmpty();

    if (route.heading !== undefined) {
      await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(route.heading);
    } else {
      await page
        .getByRole("heading", { level: 1 })
        .first()
        .waitFor({ timeout: 20_000 })
        .catch(() => undefined);
    }

    // Экран ошибки — «Что-то пошло не так» рисует ErrorBoundary приложения.
    const crashed = await page.getByText(/Что-то пошло не так|Ошибка загрузки/u).count();
    if (crashed > 0) problems.push(`${route.path}: экран ошибки`);

    // Вечный скелетон: данные не приехали и экран так и остался «серым».
    await page.waitForTimeout(1200);
    const skeletons = await page.locator("main [aria-busy='true'], main .animate-pulse").count();
    if (skeletons > 0) problems.push(`${route.path}: скелетон не сменился данными`);

    if (consoleErrors.length > 0) {
      problems.push(`${route.path}: консоль — ${consoleErrors.slice(0, 3).join(" · ")}`);
    }
    if (apiIssues.length > 0) {
      problems.push(
        `${route.path}: API — ${apiIssues
          .slice(0, 5)
          .map((issue) => `${String(issue.status)} ${issue.path}`)
          .join(" · ")}`,
      );
    }
  }

  return problems;
}

test.describe.configure({ mode: "serial" });

test("аноним: публичные экраны открываются без ошибок", async ({
  page,
  consoleErrors,
  apiIssues,
}) => {
  const problems = await walk(page, PUBLIC, consoleErrors, apiIssues);
  expect(problems, problems.join("\n")).toEqual([]);
});

test("завод: кабинет открывается без ошибок", async ({ page, consoleErrors, apiIssues }) => {
  await loginByPhone(page, FACTORY_PHONE);
  const problems = await walk(page, FACTORY, consoleErrors, apiIssues);
  await logout(page);
  expect(problems, problems.join("\n")).toEqual([]);
});

test("оператор: бэк-офис открывается без ошибок", async ({ page, consoleErrors, apiIssues }) => {
  await loginByPhone(page, OPERATOR_PHONE);
  const problems = await walk(page, OPERATOR, consoleErrors, apiIssues);
  await logout(page);
  expect(problems, problems.join("\n")).toEqual([]);
});

test("заказчик: кабинет открывается без ошибок", async ({ page, consoleErrors, apiIssues }) => {
  // Свежий заказчик на каждый прогон: у кода входа пауза 60 с на один номер, а у
  // организации — уникальный ИНН. Заодно это и проверка регистрации.
  await registerCustomer(page, freshPhone(), validInn(), "ООО «Обход e2e»");
  const problems = await walk(page, CUSTOMER, consoleErrors, apiIssues);
  await logout(page);
  expect(problems, problems.join("\n")).toEqual([]);
});
