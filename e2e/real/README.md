# e2e на настоящем бэкенде

Набор `e2e/real/**` гоняет приложение против живого `partiya-api` и PostgreSQL:
без моков, с настоящей регистрацией, загрузкой файлов, SSE, деньгами и письмами
в лог. Он **не входит** в `pnpm e2e` и не гоняется в CI — ему нужен поднятый стенд.

|                | `pnpm e2e`                                | `pnpm e2e:real`                                |
| -------------- | ----------------------------------------- | ---------------------------------------------- |
| данные         | моки в браузере                           | PostgreSQL + API                               |
| статику отдаёт | `vite preview` (`webServer`)              | сам axum (`WEB_DIST_DIR`)                      |
| `useMocks`     | `true` (из `apps/web/public/config.json`) | `false` — перехватом `/config.json` в фикстуре |
| в CI           | да                                        | нет                                            |

`apps/web/public/config.json` остаётся моковым всегда: иначе `pnpm dev` и обычный
`pnpm e2e` начнут требовать поднятый бэкенд.

## Поднять стенд

Порты 3000/8000/5432/9000 в окружении разработки заняты, поэтому здесь свои:
API — `127.0.0.1:8025`, PostgreSQL — `55442`.

### 1. PostgreSQL

```sh
docker run -d --rm --name partiya-pg-final \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=partiya \
  -p 55442:5432 postgres:17-alpine
```

### 2. Схема и витрина

```sh
cd ../partiya-api          # рядом с partiya-web
export CARGO_TARGET_DIR=$HOME/.cache/partiya-target
export DATABASE_URL=postgres://postgres:dev@127.0.0.1:55442/partiya

cargo run -p partiya-api -- migrate
cargo run -p partiya-api -- seed   # 8 категорий, 10 заводов, 30 офферов, промокод ПАРТИЯ5
```

### 3. Сотрудник завода № 17 (Q-321)

В сиде у заводов есть юрлицо, но нет людей: вход по телефону заведёт пользователя,
а членства не создаст, и кабинет завода останется пустым. Заводим сотрудника руками —
телефон тот же, что в фикстурах (`FACTORY_PHONE`):

```sh
docker exec -i -e PGPASSWORD=dev partiya-pg-final psql -U postgres -d partiya <<'SQL'
INSERT INTO iam.users (id, phone, name)
VALUES (gen_random_uuid(), '+79170000017', 'Технолог «Волны»')
ON CONFLICT (lower(phone)) WHERE phone IS NOT NULL DO NOTHING;

INSERT INTO iam.memberships (id, user_id, org_id, role)
SELECT gen_random_uuid(), u.id, f.org_id, 'owner'
  FROM iam.users u, factory.factories f
 WHERE u.phone = '+79170000017' AND f.no = 17
ON CONFLICT (user_id, org_id) DO NOTHING;
SQL
```

Оператора площадки заводить не нужно: им становится любой, чей телефон перечислен
в `PLATFORM_OPERATORS` (Q-110). В фикстурах это `+7 999 000-00-09`.

### 4. Сборка фронта

Статику отдаёт сам axum, поэтому фронт нужно собрать заранее:

```sh
cd ../partiya-web
pnpm --filter @partiya/web build
```

### 5. API и воркер

Лог API обязателен: **код входа берётся из него** (`CODE_SENDER=log`), другого
способа получить код у теста нет.

```sh
cd ../partiya-api
export DATABASE_URL=postgres://postgres:dev@127.0.0.1:55442/partiya
export UPLOAD_SIGNING_SECRET=dev-upload-secret-change-me

env BIND_ADDR=127.0.0.1:8025 CODE_SENDER=log \
    PLATFORM_OPERATORS=+79990000009 \
    WEB_DIST_DIR=$PWD/../partiya-web/apps/web/dist \
    RUST_LOG=info \
    cargo run -p partiya-api -- api > /tmp/partiya-api.log 2>&1 &

cargo run -p partiya-api -- worker > /tmp/partiya-worker.log 2>&1 &
```

Проверка: `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8025/healthz` → `200`,
и `curl -s http://127.0.0.1:8025/ | head -c 100` отдаёт HTML приложения.

Воркер нужен по-настоящему: на нём живут таймеры приёмки, чистка ключей
идемпотентности и рассылка уведомлений.

## Запуск

```sh
cd ../partiya-web
export REAL_BASE_URL=http://127.0.0.1:8025
export REAL_API_LOG=/tmp/partiya-api.log

pnpm e2e:real                       # весь набор
pnpm e2e:real -- order.spec.ts      # один файл
pnpm e2e:real -- --headed           # посмотреть глазами
```

| переменная          | по умолчанию            | зачем                                                            |
| ------------------- | ----------------------- | ---------------------------------------------------------------- |
| `REAL_BASE_URL`     | `http://127.0.0.1:8025` | где стоит стенд                                                  |
| `REAL_API_LOG`      | пусто                   | лог API; **без него вход невозможен** — в нём код                |
| `REAL_DATABASE_URL` | пусто                   | пока не используется; зарезервировано под прямые проверки в базе |

Отчёт — `e2e/real/playwright-report/`, трассы падений — `e2e/real/test-results/`.
Оба каталога в `.gitignore` и в игнорах ESLint/prettier.

## Что в наборе

| файл              | сценарий                                                                                                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes.spec.ts`  | (a) обход всех маршрутов под тремя ролями и анонимом: нет ошибок консоли, нет 4xx/5xx сверх ожидаемых, нет экрана ошибки и вечного скелетона                                                                           |
| `order.spec.ts`   | (b) сквозной заказ: регистрация → карточка 2231 → оформление с загрузкой макета → счёт → подтверждение денег оператором → производство → SSE на открытой странице → чат → доставка → приёмка с отзывом → деньги завода |
| `dispute.spec.ts` | (c) спор: претензия из приёмки → ответ завода → частичный возврат оператором → суммы сходятся                                                                                                                          |
| `sku.spec.ts`     | (d) новый SKU: ошибка ступеней → исправление → модерация → публикация → каталог → котировка                                                                                                                            |
| `extras.spec.ts`  | (e) повтор партии, (f) промокод `ПАРТИЯ5`, (g) слепок для поисковика                                                                                                                                                   |

Набор идёт **в один поток** (`workers: 1`, `fullyParallel: false`): состояние базы
общее, заказ из одного сценария разбирают следующие.

## Особенности, о которые легко споткнуться

- **Пауза кода входа.** У `POST /auth/code` пауза 60 с на один номер. Фикстура
  `requestAndEnterCode` ловит 409, ждёт названный сервером срок и просит код заново;
  заказчики каждый раз заводятся со свежим телефоном (`freshPhone`), а оператор и
  завод — стабильные, и на них пауза срабатывает.
- **ИНН проверяется по-настоящему.** `validInn()` считает контрольную цифру.
- **База не откатывается.** Каждый прогон добавляет заказы и SKU. Чтобы начать
  с чистого листа — пересоздать контейнер и повторить шаги 2–3.
- **Гидратация.** Кнопки рисует загруженный запросом заказ: в тестах они ждутся
  (`waitFor`), а не проверяются сразу после `goto`.
- **`test.fixme`.** Один сценарий (повтор партии, −9 %) помечен как незакрытый дефект
  и не валит прогон — см. комментарий в `extras.spec.ts`.

## Остановить стенд

```sh
pkill -f 'partiya-api api'; pkill -f 'partiya-api worker'
docker stop partiya-pg-final
```
