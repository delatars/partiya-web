#!/bin/sh
# Раскладка собранного фронта (/dist из образа) в общий том, который читают nginx
# (статика) и api (WEB_DIST_DIR — шаблон index.html для SEO-слепков).
#
# Порядок важен:
#   1. ассеты (`assets/*` с хэшем в имени) — копируются поверх, СТАРЫЕ НЕ УДАЛЯЮТСЯ:
#      вкладка, открытая до выката, догружает ленивые чанки своей сборки;
#   2. прочие файлы (favicon и т. п.);
#   3. config.json — смонтированный /config/config.json, если есть, иначе из образа;
#   4. index.html — последним: пока он старый, он ссылается на старые ассеты, которые
#      никуда не делись; как только он новый — новые ассеты уже на месте.
# Файлы 3–4 пишутся во временный файл и переименовываются (rename атомарен в пределах
# тома), чтобы nginx не отдал половину файла.
# Ассеты, не обновлявшиеся WEB_ASSETS_KEEP_DAYS суток, удаляются (cp обновляет mtime у
# всех файлов текущей сборки, так что под удаление попадают только старые сборки).
set -eu

SRC=/dist
DST=${WEB_DIST_TARGET:-/srv/web}
KEEP_DAYS=${WEB_ASSETS_KEEP_DAYS:-14}
CONFIG_OVERRIDE=/config/config.json

[ -f "$SRC/index.html" ] || { echo "sync-dist: в образе нет $SRC/index.html" >&2; exit 1; }
mkdir -p "$DST/assets"

if [ -d "$SRC/assets" ]; then
  cp -R "$SRC/assets/." "$DST/assets/"
fi

for path in "$SRC"/* "$SRC"/.[!.]*; do
  [ -e "$path" ] || continue
  name=${path##*/}
  case "$name" in
    assets|index.html|config.json) continue ;;
  esac
  cp -R "$path" "$DST/"
done

atomic_copy() {
  cp "$1" "$DST/.$2.tmp"
  chmod 644 "$DST/.$2.tmp"
  mv -f "$DST/.$2.tmp" "$DST/$2"
}

if [ -f "$CONFIG_OVERRIDE" ]; then
  echo "sync-dist: config.json — из $CONFIG_OVERRIDE"
  atomic_copy "$CONFIG_OVERRIDE" config.json
else
  atomic_copy "$SRC/config.json" config.json
fi
atomic_copy "$SRC/index.html" index.html

# Права на чтение всем: api в томе работает от UID 65532, nginx — от nginx.
chmod -R a+rX "$DST"

find "$DST/assets" -type f -mtime +"$KEEP_DAYS" -exec rm -f {} +

echo "sync-dist: готово, $(find "$DST/assets" -type f | wc -l) файлов в assets/"
