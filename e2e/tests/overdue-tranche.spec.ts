import { expect, loginAs, logout, test } from "../fixtures";

/* Просроченный второй транш 50/50 (Q-401, вариант «в»). Фикстура 4795: 50/50, первый
   срок второго транша истёк, автопродление на 48 ч тоже — заказ у оператора.
   Завод видит «передано оператору», оператор — строку в «Просроченных траншах»,
   бейдж в меню и два действия: «Продлить» и «Открыть спор». */

test("оператор продлевает просроченный второй транш, завод видит новое состояние", async ({
  page,
}) => {
  test.slow();
  const main = page.locator("main");

  await loginAs(page, "Завод");
  await page.goto("/seller/orders/4795");
  await expect(page.getByTestId("final-payment-alert")).toContainText(
    "заказ передан оператору платформы",
  );

  await logout(page);
  await loginAs(page, "Оператор");
  await expect(page.getByRole("link", { name: /Просроченные транши/ })).toContainText("1");
  await page.goto("/admin/overdue-tranches");
  await expect(main).toContainText("№ 4795");
  await expect(main).toContainText("4795-2-СЧ");
  await expect(main).toContainText("Автопродление");

  // без комментария — ошибка в поле, заказ остаётся в очереди
  await page.getByRole("button", { name: "Продлить" }).click();
  await expect(main).toContainText(/почему продлеваете/u);

  await page.getByLabel("Комментарий").fill("Заказчик прислал платёжку, ждём зачисления");
  await page.getByRole("button", { name: "72 ч" }).click();
  await page.getByRole("button", { name: "Продлить" }).click();
  await expect(main).toContainText("Срок продлён до");
  await expect(main).toContainText("Просроченных траншей нет");

  await logout(page);
  await loginAs(page, "Завод");
  await page.goto("/seller/orders/4795");
  await expect(page.getByTestId("final-payment-alert")).toContainText(
    "Срок оплаты второго транша продлён до",
  );
});

test("оператор открывает спор по просроченному второму траншу", async ({ page }) => {
  test.slow();
  const main = page.locator("main");

  await loginAs(page, "Оператор");
  await page.goto("/admin/overdue-tranches");
  await expect(main).toContainText("№ 4795");
  await page.getByLabel("Комментарий").fill("Заказчик не выходит на связь третьи сутки");
  await page.getByRole("button", { name: "Открыть спор" }).click();
  await expect(main).toContainText("открыт спор от имени платформы");

  await page.goto("/admin/disputes");
  await expect(main).toContainText("4795");
});
