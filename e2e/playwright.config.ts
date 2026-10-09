import { defineConfig, devices } from "@playwright/test";

/* E2E гоняются на собранном приложении (`vite preview`), а не на dev-сервере:
   репозиторий лежит на диске Windows (/mnt/x), inotify туда не доходит, и HMR у vite
   работает опросом файлов — под Playwright это выливается в самопроизвольные перезагрузки
   страницы посреди теста. `preview` отдаёт статику из dist и ничего не сторожит.

   Порт 3120 (не 3000): 3000 на машине разработки занят. */

const PORT = Number(process.env.E2E_PORT ?? 3120);
/* Хост задан явно и у сервера, и у URL. Без `--host` vite слушает «localhost», а Node
   берёт первый адрес резолвера: в WSL это 127.0.0.1, на раннере GitHub — ::1. Тогда
   preview жив на [::1], а Playwright ждёт 127.0.0.1 до таймаута webServer. */
const HOST = "127.0.0.1";
const BASE_URL = process.env.E2E_BASE_URL ?? `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  /* Файлы внутри одного спека тоже идут параллельно: состояние моков живёт в
     sessionStorage/localStorage, у каждого теста свой контекст — делить нечего. */
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["html", { outputFolder: "./playwright-report", open: "never" }], ["github"], ["list"]]
    : [["html", { outputFolder: "./playwright-report", open: "never" }], ["list"]],
  /* Первое открытие маршрута тянет свой чанк с диска /mnt/x — там это заметно медленнее. */
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      /* Всё, кроме тестов с меткой @mobile: длинные сквозные сценарии гонять дважды
         незачем — они проверяют логику, а не раскладку. */
      name: "desktop",
      grepInvert: /@mobile/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    {
      /* Ширина 390 — мобильный контрольный размер макета «Лента». Профиль всё равно
         десктопный: `isMobile` у Chromium включает эмуляцию касаний, а приложение
         рассчитано на мышь и на этой ширине тоже (шторка фильтров, липкие панели). */
      name: "mobile",
      grep: /@mobile/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `pnpm --filter @partiya/web exec vite preview --host ${HOST} --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    /* Баннер vite («Local: http://…») в логе — сразу видно, где слушает сервер. */
    stdout: "pipe",
    stderr: "pipe",
  },
});
