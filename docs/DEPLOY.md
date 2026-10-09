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

`.github/workflows/deploy-image.yml`: тег `v*` (или вручную с тегом) → образ
`ghcr.io/<владелец>/partiya-web:<тег>` и `:sha-<коммит>`. Выкат делает workflow «Деплой» в
partiya-api: бэк и фронт выкатываются вместе (новый `submit` требует тела оферты, Q-352),
поэтому тег `vX.Y.Z` ставится в оба репозитория — деплой бэка ждёт этот образ.
Пакету `partiya-web` в GHCR нужно дать доступ на чтение репозиторию `partiya-api`
(Package settings → Manage Actions access).
