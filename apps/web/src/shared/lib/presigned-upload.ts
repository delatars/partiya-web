import type { ArtworkUploadResponse } from "@partiya/api-contracts";

/* Загрузка файла по presigned-ссылке — мимо API, прямо в хранилище (ARCHITECTURE.md, 8.2).

   `fetch` здесь не годится: он не умеет отдавать прогресс отправки, а прогресс — половина
   смысла этого экрана (макет 40 МБ загружается заметное время, и полоса должна двигаться).
   Поэтому XHR — единственный способ получить `upload.onprogress` в браузере сегодня.

   Схема `mock://` — сигнал, что настоящего хранилища нет: тогда прогресс имитируется
   таймером. Проверять это здесь, а не в компоненте, правильно: экран не должен знать,
   включены моки или нет. */

export interface UploadHandle {
  /** Прогресс 0–100 приходит сюда по мере отправки. */
  promise: Promise<void>;
  abort: () => void;
}

const MOCK_SCHEME = "mock://";
const MOCK_DURATION_MS = 900;
const MOCK_TICK_MS = 90;

export function uploadArtwork(
  target: ArtworkUploadResponse,
  file: File,
  onProgress: (percent: number) => void,
): UploadHandle {
  if (target.uploadUrl.startsWith(MOCK_SCHEME)) {
    return simulateUpload(onProgress);
  }

  const xhr = new XMLHttpRequest();
  const promise = new Promise<void>((resolve, reject) => {
    xhr.open(target.method, target.uploadUrl, true);
    for (const [name, value] of Object.entries(target.headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      // 413 приходит `text/plain` (лимит тела у приёмника, не problem+json) — по статусу
      reject(
        new Error(
          xhr.status === 413
            ? "Файл больше 25 МБ — хранилище его не приняло. Сожмите файл или пришлите ссылку технологу"
            : `Хранилище отказало (${String(xhr.status)})`,
        ),
      );
    });
    xhr.addEventListener("error", () => {
      reject(new Error("Файл не загрузился — проверьте связь"));
    });
    xhr.addEventListener("abort", () => {
      reject(new DOMException("Загрузка отменена", "AbortError"));
    });
    xhr.send(file);
  });

  return {
    promise,
    abort: () => {
      xhr.abort();
    },
  };
}

/** Имитация загрузки для моков: ровное движение полосы и честная отмена. */
function simulateUpload(onProgress: (percent: number) => void): UploadHandle {
  let timer: ReturnType<typeof setInterval> | undefined;
  let rejectOuter: ((reason: unknown) => void) | undefined;

  const promise = new Promise<void>((resolve, reject) => {
    rejectOuter = reject;
    let elapsed = 0;
    timer = setInterval(() => {
      elapsed += MOCK_TICK_MS;
      const percent = Math.min(100, Math.round((elapsed / MOCK_DURATION_MS) * 100));
      onProgress(percent);
      if (percent >= 100) {
        clearInterval(timer);
        resolve();
      }
    }, MOCK_TICK_MS);
  });

  return {
    promise,
    abort: () => {
      clearInterval(timer);
      rejectOuter?.(new DOMException("Загрузка отменена", "AbortError"));
    },
  };
}

/** Отменённая загрузка — не сбой: показывать её ошибкой было бы враньём. */
export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
