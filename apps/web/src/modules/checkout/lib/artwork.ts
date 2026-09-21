import type { ArtworkLimits, OrderArtwork } from "@partiya/api-contracts";

/* Правила для файлов макета.

   Проверяем на клиенте ДО запроса presigned-ссылки — не вместо сервера, а до него:
   человек должен узнать про 40-мегабайтный TIFF сразу, а не после загрузки. Последнее
   слово всё равно за сервером, и те же 413/415 он вернёт сам (см. мок-бэкенд).

   ⚠ Лимиты приезжают в ответе на запрос загрузки (`ArtworkUploadResponse.limits`) —
   зашивать мегабайты в браузер нельзя. Эта константа — только для проверки «до запроса»
   и для текстов подсказки; она обязана совпадать с тем, что настроено на бэке. */

const MB = 1024 * 1024;

export const ARTWORK_LIMITS: ArtworkLimits = {
  maxSize: 25 * MB,
  contentTypes: [
    "application/pdf",
    "application/postscript",
    "application/illustrator",
    "image/png",
    "image/tiff",
    "image/svg+xml",
  ],
  maxFiles: 10,
};

/** Расширения на случай, когда браузер не знает MIME-типа: у `.ai` и `.eps` он часто пуст. */
const ALLOWED_EXTENSIONS = ["pdf", "ai", "eps", "ps", "png", "tif", "tiff", "svg"];

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** Подходит ли файл по типу. Тип ИЛИ расширение — иначе `.ai` не загрузить ни в одном
    браузере: Chrome отдаёт для него пустой `type`, Firefox — `application/octet-stream`. */
export function isAllowedArtworkType(contentType: string, fileName: string): boolean {
  if (ARTWORK_LIMITS.contentTypes.includes(contentType)) return true;
  return ALLOWED_EXTENSIONS.includes(extensionOf(fileName));
}

/** Почему файл не подойдёт; `undefined` — подойдёт. Текст показывается строкой списка. */
export function artworkRejection(
  file: { name: string; size: number; type: string },
  limits: ArtworkLimits = ARTWORK_LIMITS,
): string | undefined {
  if (!isAllowedArtworkType(file.type, file.name)) {
    return "Не тот формат: нужен PDF, AI, EPS, PNG, TIFF или SVG";
  }
  if (file.size > limits.maxSize) {
    return `Больше ${String(Math.round(limits.maxSize / MB))} МБ — сожмите файл или пришлите ссылку технологу`;
  }
  if (file.size === 0) return "Файл пустой";
  return undefined;
}

/** «1,2 МБ» — как размер подписан в макете. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} Б`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / MB).toFixed(1).replace(".", ",")} МБ`;
}

/** Значок формата в квадратике слева от имени файла (.fic макета). */
export function artworkBadge(fileName: string): string {
  const extension = extensionOf(fileName);
  return extension.length > 0 ? extension.slice(0, 4).toUpperCase() : "ФАЙЛ";
}

/** Файл, который засчитывается как приложенный макет. Загружающийся и сбойный — нет. */
export function isUsableArtwork(file: OrderArtwork): boolean {
  return file.status === "review" || file.status === "approved";
}

/** Подпись состояния файла — та же мысль, что «на проверке у технолога» в макете. */
export function artworkStatusText(file: OrderArtwork): string {
  switch (file.status) {
    case "uploading":
      return "загружается";
    case "review":
      return "на проверке у технолога";
    case "approved":
      return "принят технологом";
    case "rejected":
      return file.error ?? "технолог вернул макет";
    case "failed":
      return file.error ?? "не загрузился";
    default:
      return "";
  }
}
