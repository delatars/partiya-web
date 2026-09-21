import { expect, test as base, type Page } from "@playwright/test";

/* Общие фикстуры e2e.

   Приложение работает на моках (`apps/web/public/config.json` → `useMocks: true`):
   бэкенд для этих тестов не нужен. Состояние моков живёт в sessionStorage (сессия входа)
   и localStorage (сравнение, избранное, заказы), поэтому каждый тест получает свой
   browser context — Playwright даёт его по умолчанию, чистить руками нечего. */

/** Демо-роли на экране `/login`. Кнопки показываются только при `useMocks: true`. */
export type DemoRole = "Заказчик" | "Завод" | "Оператор";

/* Организация, которую надо выбрать после входа. Экран выбора показывается только тем,
   у кого компаний больше одной: Анна Кораблёва — «Кора» и завод «Волна». Волков видит
   только «Волну», у оператора организаций нет — обоих пускает сразу. */
const ORG_OF: Record<DemoRole, RegExp | null> = {
  Заказчик: /Кора/,
  Завод: null,
  Оператор: null,
};

/** Куда роль попадает после входа. */
export const HOME_OF: Record<DemoRole, string> = {
  Заказчик: "/account/orders",
  Завод: "/seller",
  Оператор: "/admin",
};

/** Постоянный код моков: любой другой шестизначный отвергается. */
export const MOCK_CODE = "000000";

/** Вход демо-ролью через настоящий экран входа (без подмены хранилища). */
export async function loginAs(page: Page, role: DemoRole): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(`^${role}`) }).click();

  const org = ORG_OF[role];
  if (org !== null) {
    await page.getByRole("heading", { name: "Выберите организацию" }).waitFor();
    await page.getByRole("button", { name: org }).first().click();
  }
  await page.waitForURL(HOME_OF[role]);
}

/** Выход = сброс только сеанса входа. Заказы, SKU и план мощности живут в localStorage,
    и чистить его означало бы терять всё, что успела сделать предыдущая роль. */
export async function logout(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => {
    window.sessionStorage.removeItem("partiya.mock.auth.v1");
  });
}

/** Ширина документа не должна превышать ширину окна: горизонтальной прокрутки быть не должно. */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** Сумма из текста: «183 400 ₽» → 183400. Пробелы в вёрстке неразрывные. */
export function parseMoney(text: string): number {
  const match = /(\d[\d\s\u00a0\u202f]*)\s*₽/u.exec(text);
  if (match === null) return Number.NaN;
  return Number(match[1]?.replace(/[\s\u00a0\u202f]/gu, ""));
}

/** Текст со схлопнутыми пробелами — так его удобно сверять с макетом. */
export function normalize(text: string): string {
  return text.replace(/[\s\u00a0\u202f]+/gu, " ").trim();
}

type Fixtures = {
  /** Копилка ошибок страницы и консоли: тест сам решает, когда её проверить. */
  consoleErrors: string[];
};

/* Второй параметр фикстуры у Playwright принято звать `use`; здесь он `provide` —
   eslint-plugin-react-hooks принимает вызов `use(…)` за реактовый хук и ругается. */
export const test = base.extend<Fixtures>({
  consoleErrors: async ({ page }, provide) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    await provide(errors);
  },
});

export { expect };
