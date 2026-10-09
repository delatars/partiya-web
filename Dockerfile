# syntax=docker/dockerfile:1
#
# Образ статики фронта «Партии»: собранный `apps/web/dist` + скрипт, который при
# деплое раскладывает его в общий том. Сам образ ничего не отдаёт — отдают nginx и
# axum (SEO-слепки), оба читают этот том. Почему так, а не «nginx со статикой внутри»,
# — partiya-api/docs/DEPLOY.md, раздел «Как устроена выкладка».
#
#   docker build -t partiya-web:dev .
#
# В образе лежит ПРОД-конфиг (`deploy/config.prod.json`, useMocks: false) вместо
# `apps/web/public/config.json`: исходник в репозитории не меняется и остаётся
# useMocks: true для локальной разработки.

ARG NODE_IMAGE=node:20.19-alpine3.22
ARG RUNTIME_IMAGE=busybox:1.37.0-musl

FROM ${NODE_IMAGE} AS build
ENV PNPM_HOME=/pnpm \
    TURBO_TELEMETRY_DISABLED=1 \
    DO_NOT_TRACK=1 \
    CI=1
ENV PATH=$PNPM_HOME:$PATH
# Версия pnpm — из поля packageManager в package.json (corepack).
RUN corepack enable
WORKDIR /src
# Сначала только лок: `pnpm fetch` качает пакеты в стор по pnpm-lock.yaml, и этот
# слой не пересобирается, пока лок не изменился.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --frozen-lockfile
COPY . .
RUN pnpm install --frozen-lockfile --offline \
 && pnpm --filter @partiya/web build \
 && cp deploy/config.prod.json apps/web/dist/config.json \
 && grep -q 'seo:head' apps/web/dist/index.html \
 && grep -q 'seo:body' apps/web/dist/index.html

FROM ${RUNTIME_IMAGE} AS runtime
COPY --from=build /src/apps/web/dist /dist
COPY deploy/sync-dist.sh /usr/local/bin/sync-dist
# Одноразовый запуск: разложить /dist в том /srv/web и выйти (см. deploy/compose.yaml
# в partiya-api, сервис `web`).
ENTRYPOINT ["/bin/sh", "/usr/local/bin/sync-dist"]
