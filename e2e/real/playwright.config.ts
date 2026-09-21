import { defineConfig, devices } from "@playwright/test";

/* Конфигурация набора «на настоящем бэкенде».
 *
 * Отличия от `e2e/playwright.config.ts` — принципиальные, поэтому это отдельный файл,
 * а не ветка в общем:
 *   * статику отдаёт сам axum (`WEB_DIST_DIR`), поэтому `webServer` здесь нет: стенд
 *     поднимается руками, см. `e2e/real/README.md`;
 *   * приложение работает НЕ на моках — `useMocks: false` подменяется перехватом
 *     `/config.json` в фикстуре, файл `apps/web/public/config.json` остаётся моковым;
 *   * тесты идут строго последовательно и в одном браузере: сценарии переиспользуют
 *     состояние базы (заказ, созданный первым тестом, разбирают следующие);
 *   * в CI этот набор не гоняется — ему нужны PostgreSQL, API и воркер.
 */

const BASE_URL = process.env.REAL_BASE_URL ?? "http://127.0.0.1:8025";

export default defineConfig({
  testDir: ".",
  outputDir: "./test-results",
  // Состояние базы общее на весь прогон: параллелить нечего и нельзя.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["html", { outputFolder: "./playwright-report", open: "never" }], ["list"]],
  // Сквозной сценарий длинный: регистрация, оформление, загрузка файлов, SSE.
  timeout: 300_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: BASE_URL,
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "real",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
  ],
});
