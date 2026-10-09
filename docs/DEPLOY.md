# Выкладка фронта

Полная инструкция (VPS, compose, TLS, откат, бэкап) — `partiya-api/docs/DEPLOY.md`. Здесь —
только то, что относится к этому репозиторию.

## Образ

`Dockerfile` собирает `apps/web/dist` (`pnpm --filter @partiya/web build`, Node из `.nvmrc`,
pnpm из `packageManager`) и кладёт его в маленький образ на busybox вместе со скриптом
`deploy/sync-dist.sh`. Образ ничего не отдаёт сам: в compose он запускается одноразово
(сервис `web`) и раскладывает сборку в общий том, из которого читают nginx (статика) и
partiya-api (`WEB_DIST_DIR`, шаблон `index.html` для SEO-слепков).

```sh
docker build -t partiya-web:dev .
docker run --rm --entrypoint cat partiya-web:dev /dist/config.json   # useMocks: false
```

Сборка падает, если в собранном `index.html` нет плейсхолдеров `seo:head` / `seo:body`:
без них partiya-api отвечает на публичные страницы 500.

## Прод-конфиг

`deploy/config.prod.json` (`useMocks: false`) подменяет `config.json` **только в образе**.
`apps/web/public/config.json` остаётся `useMocks: true` — для `pnpm dev` и e2e на моках.
На сервере конфиг можно переопределить без пересборки: `/opt/partiya/web-config/config.json`
(его подхватит `sync-dist.sh` при следующем выкате).

## Раскладка (`deploy/sync-dist.sh`)

Ассеты — поверх, старые сборки не удаляются сразу (открытые вкладки догружают свои чанки;
чистка — через `WEB_ASSETS_KEEP_DAYS` суток), `config.json` и `index.html` — последними
и атомарно (temp + rename).

## Публикация

Образ `ghcr.io/<владелец>/partiya-web` собирает и публикует **workflow «Деплой» в
partiya-api** (`partiya-api/.github/workflows/deploy.yml`, job «Образ web»): он выкачивает
этот репозиторий по SSH deploy key и собирает этот `Dockerfile`. Своего workflow публикации
здесь нет (прежний `deploy-image.yml` удалён): пакет GHCR принадлежит репозиторию, который
его опубликовал, и если бы публиковали оба репозитория, одному из них пришлось бы вручную
выдавать доступ к чужому пакету в UI. Бэк и фронт выкатываются вместе (новый `submit`
требует тела оферты, Q-352).

Какой коммит едет: при теге `vX.Y.Z` в partiya-api — тег `vX.Y.Z` **этого** репозитория,
если он есть, иначе `master`; вручную — `web_ref` (ветка/тег/SHA). Поэтому перед релизом
поставьте тег `vX.Y.Z` здесь. Хотфикс только фронта — «Деплой» вручную с `build_web`
(таблица в `partiya-api/docs/DEPLOY.md`, «Обновление»). Проверить образ локально —
`docker build` выше.

Для этого в **partiya-web** → Settings → Deploy keys нужен read-only ключ, приватная часть
которого лежит в секрете `WEB_REPO_SSH_KEY` репозитория partiya-api (команды —
`partiya-api/docs/DEPLOY.md`, «Секреты и переменные GitHub Actions»).

## CI: доступ к partiya-api

Job «Дрейф типов контракта» (`.github/workflows/ci.yml`) выкачивает соседний приватный
partiya-api ради `docs/openapi.json`. `GITHUB_TOKEN` прогона видит только этот репозиторий,
поэтому — SSH deploy key:

| Где | Что |
|---|---|
| partiya-api → Settings → Deploy keys | публичная часть, **без** «Allow write access» |
| partiya-web → Settings → Secrets and variables → Actions → secret `API_REPO_SSH_KEY` | приватная часть |
| там же, variable `API_REPO` (необяз.) | `владелец/репозиторий`, если не `<владелец>/partiya-api` |

Ключ — отдельный от `WEB_REPO_SSH_KEY` (GitHub не принимает один deploy key в двух
репозиториях). Без секрета (форк, PR из форка) job падает первым шагом с ошибкой
«Нет секрета API_REPO_SSH_KEY».
