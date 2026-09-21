import { expect, loginAs, logout, test } from "../fixtures";

/* Редактор SKU завода: ошибка ступеней → исправление → модерация → публикация
   оператором → предложение видно в каталоге. Один тест: состояние SKU переходит
   от роли к роли и разнести шаги нельзя. */

test.describe.configure({ mode: "serial" });

/** Название только для e2e: в фикстурах каталога такого нет, спутать не с чем. */
const TITLE = "Худи e2e, футер 400 г/м²";

test("новое предложение проходит модерацию и появляется в каталоге", async ({ page }) => {
  test.slow();
  const main = page.locator("main");

  await loginAs(page, "Завод");
  await page.goto("/seller/offers/new/edit");
  await page.getByLabel("Название в выдаче").fill(TITLE);
  await page.getByLabel("Минимальная партия (MOQ), шт").fill("300");

  // две ступени, вторая дороже первой — движок котировок такой оффер отвергает
  await page.getByRole("button", { name: "+ Ступень" }).click();
  await page.getByLabel("Объём ступени 1").fill("300");
  await page.getByLabel("Цена ступени 1").fill("248");
  await page.getByRole("button", { name: "+ Ступень" }).click();
  await page.getByLabel("Объём ступени 2").fill("1000");
  await page.getByLabel("Цена ступени 2").fill("260");

  await page.getByRole("button", { name: "Отправить на модерацию" }).click();
  await expect(main).toContainText("Цена на большем объёме не может быть выше");

  await page.getByLabel("Цена ступени 2").fill("224");
  await page.getByRole("button", { name: "Отправить на модерацию" }).click();
  await expect(main).toContainText(/отправлено на модерацию|На модерации/i);

  await page.goto("/seller/offers");
  await expect(main).toContainText(TITLE);

  // ── оператор публикует
  await logout(page);
  await loginAs(page, "Оператор");
  await page.goto("/admin/moderation");
  await expect(main).toContainText(TITLE);

  /* Баг № 4 закрыт: заявку выбирает клик по строке, и выбор уходит в search-параметр
     URL. Кликаем по ВТОРОЙ строке очереди — раньше карточку справа всегда подставлял
     сервер, и «Опубликовать» публиковала первую заявку, а не выбранную. */
  const detail = main.locator("aside").getByRole("heading", { level: 3 });
  // Первая таблица страницы — сама очередь; в карточке справа есть вторая («Что изменилось»).
  const queue = main.locator("table").first();
  const rows = queue.locator("tbody tr");
  await expect(rows.nth(1)).toBeVisible();
  const second = rows.nth(1).getByRole("button").first();
  const secondTitle = (await second.innerText()).trim();
  await second.click();

  await expect(page).toHaveURL(/selected=/);
  await expect(detail).toContainText(secondTitle);

  /* Теперь выбираем свою заявку тем же кликом и публикуем именно её. */
  const ours = rows.filter({ hasText: TITLE });
  await expect(ours).toHaveCount(1);
  await ours.getByRole("button").first().click();
  await expect(detail).toContainText(TITLE);

  await page.getByLabel("Комментарий заводу").fill("Проверено, публикуем.");
  await page.getByRole("button", { name: "Опубликовать" }).click();
  // опубликованная заявка ушла из очереди — значит решение приняли по выбранной строке
  await expect(queue.locator("tbody")).not.toContainText(TITLE);

  /* ── заказчик видит предложение в каталоге. Ищем поиском, а не глазами по первой
     странице: в «Текстиле» три десятка предложений, на страницу выводится дюжина. */
  await page.goto("/catalog/tekstil?q=e2e");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("1 предложение");
  await expect(main.getByText(TITLE).first()).toBeVisible();
});
