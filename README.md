# partiya-web

Фронтенд платформы «Партия» — маркетплейса производственных мощностей. React SPA, деплой статикой за nginx.
Бэкенд — `../partiya-api` (Rust + axum). Архитектура — [`../partiya-api/docs/ARCHITECTURE.md`](../partiya-api/docs/ARCHITECTURE.md).

## Макет — источник истины по UI

```bash
pnpm mockup            # http://localhost:4100 — или просто открыть mockups/lenta/index.html
```

`mockups/lenta/` — статический HTML-макет «Лента»: 49 экранов в 7 зонах (витрина, сделка, вход, кабинет заказчика,
кабинет завода, состояния, бэк-офис). Панель внизу — навигация по зонам, `#map` — карта экранов, Alt+←/→ — листать.

| Файл            | Что                                                |
| --------------- | -------------------------------------------------- |
| `lenta.css`     | токены `:root` и стили шести исходных экранов      |
| `lenta-ext.css` | стили дорисованных экранов, те же токены           |
| `data.js`       | единые данные: предложения, заказ № 4812, кабинеты |
| `app.js`        | хелперы, реестр `screen()`, роутер, панель макета  |
| `screens/*.js`  | экраны по зонам                                    |

CSS макета — спецификация для `packages/ui`: класс макета ↔ компонент (таблица в ARCHITECTURE.md, 7.5).

## Стек

pnpm + Turborepo · React 19 · Vite 6 (SWC) · TypeScript strict · TanStack Router (файловый) + Query · Tailwind CSS 4 ·
cva + clsx + tailwind-merge · Zod 3 · Vitest · ESLint 9 + `eslint-plugin-boundaries`.

## Раскладка

```
apps/web/                 SPA: публичная часть + кабинеты
  src/main.tsx            loadConfig → моки → render (createRoot, не hydrate — см. SEO-слепки, 7.4)
  src/app/App.tsx         QueryClient + Router
  src/routes/             файловые маршруты; routeTree.gen.ts генерируется, руками не править
  src/modules/<модуль>/   components · pages · api · index.ts (единственная публичная дверь)
  src/shared/             api (IApiService + мок-декораторы) · lib
packages/ui/              дизайн-система с нуля по макету: токены (примитивы → семантика), Button, Tag
packages/api-contracts/   типы контракта; временно руками, далее — генерация из openapi.json бэкенда
packages/realtime/        SSE-клиент: fetch + ReadableStream, Last-Event-ID, реконнект
packages/shared/          runtime-конфиг /config.json, фича-флаги
mockups/lenta/            макет
```

Границы слоёв держит линтер: `shared ↛ modules`, `modules/X ↛ modules/Y`, снаружи в модуль — только через `index.ts`.

## Команды

```bash
pnpm install
pnpm dev                  # web на :3000, /api → http://localhost:8000 (partiya-api)
pnpm build                # сначала генерирует routeTree, затем tsc + vite build
pnpm typecheck
pnpm lint
```

`public/config.json` → `useMocks: true`: каталог работает на фикстурах без бэкенда.

## E2E

Сквозные тесты Playwright — в [`e2e/`](e2e/README.md). Гоняются на собранном приложении
и на моках, бэкенд не нужен.

```bash
pnpm build && pnpm e2e    # 33 теста, desktop 1440 + mobile 390, около минуты
pnpm e2e:install          # докачать Chromium (один раз)
```

Проверяются каталог и фильтры, калькулятор партии, вход и регистрация, оформление,
трекинг и приёмка, сквозной сценарий трёх ролей, редактор SKU с модерацией, дымовой
обход всех маршрутов и базовая доступность. Отчёт — `e2e/playwright-report`,
трейсы падений — `e2e/test-results` (оба в `.gitignore`).

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml), на каждый push и pull request;
новый пуш в ветку отменяет предыдущий прогон. Окружение (pnpm, Node из `.nvmrc`,
`pnpm install --frozen-lockfile` с кэшем стора) поднимает общий шаг
`.github/actions/setup`.

| Job                   | Команда                                                                  | Примечание                                                            |
| --------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Формат                | `pnpm format:check`                                                      | `continue-on-error`: 6 файлов ещё не отформатированы, TODO в workflow |
| Линтер                | `pnpm lint`                                                              |                                                                       |
| Типы                  | `pnpm typecheck` + `pnpm exec tsc -p e2e --noEmit`                       | `e2e/` не пакет воркспейса, turbo его не видит                        |
| Модульные тесты       | `pnpm test`                                                              | vitest, 352 теста                                                     |
| Сборка                | `pnpm build`                                                             | `apps/web/dist` уходит артефактом                                     |
| E2E                   | `pnpm e2e`                                                               | берёт `dist` из сборки; браузер из кэша; отчёт и трейсы — артефактом  |
| Дрейф типов контракта | `pnpm --filter @partiya/api-contracts generate` + `git diff --exit-code` | `continue-on-error`, см. ниже                                         |

Воспроизвести локально одной командой:

```bash
pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e
```

**Про дрейф типов контракта.** `packages/api-contracts` генерируется из
`../partiya-api/docs/openapi.json` — снимка из соседнего репозитория, которого в этом
репозитории нет. Job `contracts-drift` выкачивает `partiya-api` рядом
(переменная репозитория `API_REPO`, токен `API_REPO_TOKEN` для приватного),
перегенерирует типы и сверяет их с закоммиченными. Пока не решено, где живут
репозитории и под каким токеном ходить, job не валит сборку. Альтернативы — копия
`openapi.json` в этом репозитории со сверкой хэша или публикация `@partiya/api-contracts`
пакетом из CI бэкенда.

## Состояние

Каркас. Работает: главная-заглушка, `/catalog` с сортировкой в URL на моках. Дальше — перенос экранов макета:
оболочка (`SiteHeader`, `CategoryMenu`, `CompareTray`) → каталог с фасетами → карточка с калькулятором → оформление.
