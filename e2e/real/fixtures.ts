import { expect, test as base, type Page, type Response } from "@playwright/test";
import { readFileSync } from "node:fs";

/* Фикстуры набора «на настоящем бэкенде».
 *
 * Главное отличие от моков: приложение обязано ходить по HTTP. Переключает его
 * `useMocks: false`, и подставляется он ПЕРЕХВАТОМ ответа `/config.json`, а не правкой
 * `apps/web/public/config.json`: тот файл остаётся моковым, иначе обычный `pnpm e2e`
 * и `pnpm dev` начнут требовать поднятый бэкенд.
 *
 * Код входа dev-отправитель печатает в лог API (`CODE_SENDER=log`). Путь к логу —
 * в `REAL_API_LOG`; оттуда его и читаем: другого способа получить код у теста нет,
 * и это ровно то, что делает разработчик руками. */

/** Где стоит стенд. */
export const BASE_URL = process.env.REAL_BASE_URL ?? "http://127.0.0.1:8025";
/** Лог API: из него берётся код входа. */
export const API_LOG = process.env.REAL_API_LOG ?? "";

/** Телефон оператора площадки — он же в `PLATFORM_OPERATORS` запущенного API. */
export const OPERATOR_PHONE = "+7 999 000-00-09";
/** Сотрудник сидового завода № 17 «Волна» — заводится SQL-вставкой, см. README (Q-321). */
export const FACTORY_PHONE = "+7 917 000-00-17";

/** В логе `pretty` цвета выводятся escape-последовательностями — снимаем их. */
function plain(text: string): string {
  // eslint-disable-next-line no-control-regex -- ANSI-escape в логе tracing
  return text.replace(/\u001B\[[0-9;]*m/gu, "");
}

/** Сколько кодов уже выдано этому получателю. */
export function codeCount(recipient: string): number {
  if (API_LOG === "") return 0;
  const digits = recipient.replace(/\D/gu, "");
  return [
    ...plain(readFileSync(API_LOG, "utf8")).matchAll(/recipient=(\S+)\s+code=(\d{6})/gu),
  ].filter((match) => (match[1] ?? "").replace(/\D/gu, "") === digits).length;
}

/** Последний код входа, выданный получателю. */
export function lastLoginCode(recipient: string): string {
  if (API_LOG === "") {
    throw new Error(
      "REAL_API_LOG не задан: код входа берётся из лога API (CODE_SENDER=log). " +
        "См. e2e/real/README.md",
    );
  }
  const digits = recipient.replace(/\D/gu, "");
  const found = [
    ...plain(readFileSync(API_LOG, "utf8")).matchAll(/recipient=(\S+)\s+code=(\d{6})/gu),
  ].filter((match) => (match[1] ?? "").replace(/\D/gu, "") === digits);
  const code = found.at(-1)?.[2];
  if (code === undefined) throw new Error(`в логе ${API_LOG} нет кода входа для ${recipient}`);
  return code;
}

/** Ждём кода, выданного ПОСЛЕ запроса: лог дописывается асинхронно. */
export async function waitForNewCode(recipient: string, before: number): Promise<string> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (codeCount(recipient) > before) return lastLoginCode(recipient);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`код входа для ${recipient} не появился в логе за 15 с`);
}

/** Ввод шестизначного кода: поле разбито на шесть клеток с русскими подписями. */
export async function fillCode(page: Page, code: string): Promise<void> {
  await page.getByLabel("Цифра 1 из 6").fill(code);
}

/** Запросить код и ввести его. Форма одна и на входе, и на регистрации.
 *
 * У `POST /auth/code` есть пауза между отправками на один номер: прогоны идут подряд,
 * и оператор со стабильным телефоном в неё упирается. 409 здесь — не ошибка теста:
 * ждём названный сервером срок и просим код ещё раз. */
export async function requestAndEnterCode(page: Page, phone: string): Promise<void> {
  await page.locator("main input[type=tel]").first().fill(phone);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const before = codeCount(phone);
    const answer = page.waitForResponse(
      (response) => response.url().includes("/auth/code") && response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: /Получить код|Отправить повторно/u })
      .first()
      .click();
    const response = await answer;
    if (response.status() < 400) {
      await fillCode(page, await waitForNewCode(phone, before));
      return;
    }
    if (response.status() !== 409) {
      throw new Error(`запрос кода для ${phone}: ${String(response.status())}`);
    }
    const detail = ((await response.json()) as { detail?: string }).detail ?? "";
    const seconds = Number(/через (\d+)/u.exec(detail)?.[1] ?? "60");
    await page.waitForTimeout((seconds + 2) * 1000);
  }
  throw new Error(`код входа для ${phone} так и не отправлен: пауза не кончилась`);
}

/** Вход существующего пользователя по телефону. */
export async function loginByPhone(page: Page, phone: string): Promise<void> {
  await page.goto("/login");
  await requestAndEnterCode(page, phone);
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
}

/** Выход: серверная сессия закрывается, куки чистятся. */
export async function logout(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(async () => {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
  });
  await page.context().clearCookies();
}

/** Контрольная цифра ИНН юрлица (10 знаков) — бэк проверяет её по-настоящему. */
export function validInn(): string {
  const base = String(Date.now()).slice(-9);
  const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
  const sum = base
    .split("")
    .reduce((acc, digit, index) => acc + Number(digit) * (weights[index] ?? 0), 0);
  return base + String((sum % 11) % 10);
}

/** Свободный телефон: у кода входа есть пауза 60 с на один номер. */
export function freshPhone(prefix = "916"): string {
  const digits = String(Date.now()).slice(-7);
  return `+7 ${prefix} ${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 7)}`;
}

export type ApiIssue = { path: string; status: number };

/** Ожидаемые ответы 4xx — их API отдаёт штатно, экран их обрабатывает. */
export function expected(issue: ApiIssue): boolean {
  // Аноним и только что вышедший пользователь: оболочка всегда спрашивает `/me`.
  if (issue.status === 401) return true;
  // Заказ без оплаты ещё не имеет сделки и журнала — экран показывает заглушку.
  if (issue.status === 404 && /\/orders\/\d+\/(escrow|events|dispute)$/u.test(issue.path)) {
    return true;
  }
  // Спор по заказу, где его нет.
  if (issue.status === 404 && /\/admin\/disputes\/\d+$/u.test(issue.path)) return true;
  return false;
}

type Fixtures = {
  /** Ошибки консоли и необработанные исключения страницы. */
  consoleErrors: string[];
  /** Ответы API со статусом 4xx/5xx — кроме заведомо ожидаемых. */
  apiIssues: ApiIssue[];
};

export const test = base.extend<Fixtures>({
  /* Второй параметр фикстуры у Playwright принято звать `use`; здесь он `provide` —
     eslint-plugin-react-hooks принимает вызов `use(…)` за реактовый хук. */
  consoleErrors: async ({ page }, provide) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      // Браузер дублирует каждый неуспешный ответ строкой «Failed to load resource».
      if (text.includes("Failed to load resource")) return;
      errors.push(text);
    });
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    await provide(errors);
  },

  apiIssues: async ({ page }, provide) => {
    const issues: ApiIssue[] = [];
    page.on("response", (response: Response) => {
      const url = new URL(response.url());
      if (!url.pathname.startsWith("/api/v1/")) return;
      if (response.status() < 400) return;
      const issue = { path: url.pathname + url.search, status: response.status() };
      if (!expected(issue)) issues.push(issue);
    });
    await provide(issues);
  },

  /* `useMocks: false` — единственная разница между стендом и обычной сборкой. */
  page: async ({ page }, provide) => {
    await page.route("**/config.json", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ apiBaseUrl: "/api/v1", useMocks: false, features: {} }),
      });
    });
    await provide(page);
  },
});

export { expect };

/** Контрольный оффер сквозного примера макета — футболки завода № 17 «Волна». */
export const OFFER_NO = 2231;

/** Провести НОВЫЙ заказ от регистрации заказчика до открытого окна приёмки.
 *
 * Отдельные сценарии (спор, повтор партии) начинаются с принятой партии, а собирать
 * её кликами в каждом из них — переписывать сквозной тест. Здесь только то, без чего
 * до приёмки не дойти: никаких файлов, чата и фотоотчётов — их проверяет `order.spec.ts`.
 *
 * Роли сменяются на ОДНОЙ вкладке: у кода входа пауза на номер, и лишние сессии её
 * только удлиняют. Возвращается номер заказа.
 */
export async function runOrderToAcceptance(
  page: Page,
  customerPhone: string,
  qty = 1000,
): Promise<string> {
  const main = page.locator("main");
  await registerCustomer(page, customerPhone, validInn(), "ООО «Сценарий e2e»");

  await page.goto(`/offer/${String(OFFER_NO)}`);
  await page.getByLabel("Объём, шт").fill(String(qty));
  await page.getByLabel("Объём, шт").press("Enter");
  /* Ссылка «Оформить партию» несёт параметры котировки и переписывается, когда сервер
     пересчитал цену. Кликать раньше — уйти со старым объёмом или вовсе никуда. */
  const checkout = page.getByRole("link", { name: /Оформить партию/u });
  await expect(checkout).toHaveAttribute("href", new RegExp(`qty=${String(qty)}\\b`, "u"), {
    timeout: 30_000,
  });
  await checkout.click();
  await page.waitForURL(/\/order\/new\?/u);

  await page.getByLabel("Цвета: название 1").fill("Чёрный");
  await page.getByLabel("Цвета: количество 1").fill(String(qty));
  await page.getByLabel("Размерный ряд: название 1").fill("M");
  await page.getByLabel("Размерный ряд: количество 1").fill(String(qty));
  await page.locator("input[type=file]").first().setInputFiles({
    name: "maket.png",
    mimeType: "image/png",
    buffer: PNG_1X1,
  });
  await expect(main).toContainText(/maket\.png/u);
  await page
    .getByRole("button", { name: /^Дальше · /u })
    .first()
    .click();

  await page.getByLabel("Юридический адрес").fill("153000, Иваново, ул. Ленина, д. 1, офис 5");
  await page.getByLabel("Почта бухгалтера").fill("buh@e2e.test");
  await page.getByRole("checkbox", { name: /Принимаю договор-оферту/u }).click();
  await page
    .getByRole("button", { name: /^Дальше · /u })
    .first()
    .click();

  await page.getByRole("button", { name: /Оплатить в эскроу/u }).click();
  await page.waitForURL(/\/order\/\d+\/pay/u, { timeout: 90_000 });
  const orderId = /\/order\/(\d+)\/pay/u.exec(page.url())?.[1] ?? "";
  expect(orderId, "номер заказа со страницы счёта").not.toEqual("");
  const purpose = await main
    .getByText(/Оплата по заказу № \d+/u)
    .first()
    .innerText();
  const dealNo = /сделка (\d+)/u.exec(purpose)?.[1] ?? "";

  // Оператор: деньги пришли.
  await logout(page);
  await loginByPhone(page, OPERATOR_PHONE);
  await page.goto("/admin/finance");
  const invoice = main
    .locator("table")
    .first()
    .locator("tbody tr")
    .filter({ hasText: `№ ${dealNo}-` });
  await expect(invoice).toHaveCount(1);
  await invoice.getByRole("button", { name: "Подтвердить поступление" }).click();
  await expect(invoice).toHaveCount(0, { timeout: 30_000 });

  // Завод: подтверждение и макет технологу.
  await logout(page);
  await loginByPhone(page, FACTORY_PHONE);
  await page.goto(`/seller/orders/${orderId}`);
  for (const label of ["Подтвердить заказ", "Отправить макет технологу"]) {
    const button = page.getByRole("button", { name: label });
    await button.first().waitFor({ state: "visible", timeout: 30_000 });
    await button.first().click();
    await expect(button).toHaveCount(0, { timeout: 30_000 });
  }

  // Заказчик: согласование макета.
  await logout(page);
  await loginByPhone(page, customerPhone);
  await page.goto(`/account/orders/${orderId}`);
  // Кнопку рисует загруженный заказ: ждём её, а не кликаем сразу после перехода.
  const approve = page.getByRole("button", { name: /Согласовать макет/u });
  await approve.first().waitFor({ state: "visible", timeout: 30_000 });
  await approve.first().click();
  /* Согласование запускает производство. Проверяем по исчезнувшей кнопке, а не по
     тексту «Макет на согласовании»: эта строка навсегда остаётся в журнале заказа. */
  await expect(approve).toHaveCount(0, { timeout: 30_000 });

  // Завод: производство до отгрузки.
  await logout(page);
  await loginByPhone(page, FACTORY_PHONE);
  await page.goto(`/seller/orders/${orderId}`);
  await expect(main).toContainText(`№ ${orderId}`);
  for (const label of [
    "Сырьё закуплено — старт производства",
    "Перевести в «Контроль качества»",
    "Отгрузить партию",
  ]) {
    const button = main.getByRole("button", { name: label });
    await button.first().waitFor({ state: "visible", timeout: 30_000 });
    await button.first().click();
    await expect(button).toHaveCount(0, { timeout: 30_000 });
  }

  // Оператор: доставлено. Экрана под это в бэк-офисе нет (Q-332) — зовём маршрут
  // сессией оператора, иначе окно приёмки не открывается вообще.
  await logout(page);
  await loginByPhone(page, OPERATOR_PHONE);
  const delivered = await page.evaluate(async (no: string) => {
    const response = await fetch(`/api/v1/admin/orders/${no}/delivered`, {
      method: "POST",
      credentials: "include",
    });
    return response.status;
  }, orderId);
  expect(delivered, "оператор отмечает партию доставленной").toBe(200);

  await logout(page);
  await loginByPhone(page, customerPhone);
  return orderId;
}

/** Настоящий PNG 1×1: хранилище проверяет тип и размер. */
export const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** Регистрация заказчика целиком: контакт → код → компания → кабинет.
 *
 * Отдельной страницы «выберите организацию» здесь нет: у новичка компания одна. */
export async function registerCustomer(
  page: Page,
  phone: string,
  inn: string,
  name: string,
): Promise<void> {
  await page.goto("/register");
  await requestAndEnterCode(page, phone);

  await page.locator("input[name=inn]").waitFor({ timeout: 30_000 });
  await page.locator("input[name=inn]").fill(inn);
  await page.locator("input[name=name]").fill(name);
  await page.locator("input[name=kpp]").fill("370101001");
  await page.getByText("Заказывать производство").click();
  await page.getByRole("checkbox").first().click();
  await page.getByRole("button", { name: "Создать компанию" }).click();
  await page.waitForURL("**/account/orders", { timeout: 60_000 });
}
