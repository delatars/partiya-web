import type { Page } from "@playwright/test";
import { expect, MOCK_CODE, test } from "../fixtures";

/* Вход: аноним уезжает на /login и возвращается туда, куда шёл; неверный код
   отвергается; ИНН с неверной контрольной суммой не пропускается на регистрации. */

/** Клетки кода. Своего доступного имени по-русски у них нет (см. отчёт), поэтому
    цепляемся за стабильный атрибут radix, а не за классы вёрстки. */
const OTP_CELLS = "input[data-radix-otp-input]";

async function typeCode(page: Page, code: string): Promise<void> {
  await page.locator(OTP_CELLS).first().click();
  await page.keyboard.type(code, { delay: 40 });
}

test.describe("Вход и регистрация", () => {
  test("аноним уходит на вход и возвращается на запрошенный экран", async ({ page }) => {
    await page.goto("/account/orders");
    await expect(page).toHaveURL("/login?redirect=%2Faccount%2Forders");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Вход");

    await page.getByRole("textbox", { name: "Телефон" }).fill("+7 916 000-12-34");
    await page.getByRole("button", { name: "Получить код" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Код из SMS");

    await typeCode(page, MOCK_CODE);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("С возвращением");

    await page.getByRole("button", { name: /Кора/ }).click();
    await expect(page).toHaveURL("/account/orders");
  });

  test("неверный код отвергается, верный — принимается", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Телефон" }).fill("+7 916 000-12-34");
    await page.getByRole("button", { name: "Получить код" }).click();

    await typeCode(page, "111111");
    await expect(page.getByText("Код неверный или устарел")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    await typeCode(page, MOCK_CODE);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("С возвращением");
  });

  test("выход закрывает кабинет", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /^Заказчик/ }).click();
    await page.getByRole("button", { name: /Кора/ }).click();
    await expect(page).toHaveURL("/account/orders");

    await page.getByRole("button", { name: "Выйти" }).click();
    await expect(page).toHaveURL(/^(?!.*\/account).*$/);

    await page.goto("/seller");
    await expect(page).toHaveURL(/\/login\?redirect=/);
  });

  test("ИНН с неверной контрольной суммой не проходит регистрацию", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("textbox", { name: "Телефон" }).fill("+7 999 111-22-33");
    await page.getByRole("button", { name: "Получить код" }).click();
    await typeCode(page, MOCK_CODE);
    /* На «Регистрации компании» форма кода жила во втором <h1> (см. отчёт),
       поэтому шаг опознаём по появлению реквизитов, а не по заголовку. */
    await expect(page.getByRole("textbox", { name: "ИНН" })).toBeVisible();

    await page.getByRole("textbox", { name: "ИНН" }).fill("7701234567");
    await page.getByRole("textbox", { name: "Наименование" }).fill("ООО «Северный шов»");
    await page.getByRole("checkbox").first().click();
    await page.getByRole("button", { name: "Создать компанию" }).click();

    await expect(page.getByText(/Контрольная сумма ИНН не сходится/)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "ИНН" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page).toHaveURL(/\/register/);

    // корректный ИНН пропускает дальше — на онбординг завода
    await page.getByRole("textbox", { name: "ИНН" }).fill("7736207543");
    await page.getByRole("textbox", { name: "КПП" }).fill("773601001");
    await page.getByRole("radio", { name: /Принимать заказы/ }).click();
    await page.getByRole("button", { name: "Создать компанию" }).click();
    await expect(page).toHaveURL(/\/onboarding\/factory/);
  });
});
