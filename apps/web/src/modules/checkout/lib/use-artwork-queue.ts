import type { Order } from "@partiya/api-contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { getApiService, isApiError } from "@/shared/api";

import { artworkRejection } from "./artwork";
import { isAbort, uploadArtwork } from "@/shared/lib/presigned-upload";
import type { LocalArtwork } from "../components/ArtworkUpload";

/* Очередь загрузки макетов.

   Загрузка идёт в три шага (ARCHITECTURE.md, 8.2 — presigned upload):

     1. `POST /orders/{id}/artwork` — сервер выдаёт одноразовую ссылку и заводит файл
        со статусом `uploading`;
     2. браузер кладёт файл прямо в хранилище, мимо API, и показывает прогресс;
     3. `POST …/complete` — сервер узнаёт, что файл долетел, и отдаёт обновлённый заказ.

   Пока идёт второй шаг, файла «на сервере» ещё нет в том виде, в каком его можно
   показать, — поэтому у очереди своя локальная строка с прогрессом. Отклонённые файлы
   в сеть вообще не идут: причина показывается сразу, из чистой функции.

   Всё, что может сорваться (сеть, размер, тип, отменённая загрузка), оседает в той же
   локальной строке, а не в тосте: человек должен видеть, ЧТО именно не загрузилось. */

export interface ArtworkQueue {
  local: LocalArtwork[];
  /** Идёт хотя бы одна загрузка — «Дальше» ждёт её. */
  busy: boolean;
  add: (files: File[]) => void;
  remove: (fileId: string) => void;
  dismiss: (key: string) => void;
}

export function useArtworkQueue(
  orderId: number | undefined,
  handlers: { onUploaded: (order: Order) => void },
): ArtworkQueue {
  const [local, setLocal] = useState<LocalArtwork[]>([]);
  const aborts = useRef(new Map<string, () => void>());
  const onUploaded = useRef(handlers.onUploaded);
  onUploaded.current = handlers.onUploaded;

  useEffect(() => {
    const running = aborts.current;
    return () => {
      // ушли со страницы — незавершённые загрузки отменяем, иначе они будут висеть
      for (const abort of running.values()) abort();
      running.clear();
    };
  }, []);

  const patchLocal = useCallback((key: string, patch: Partial<LocalArtwork>) => {
    setLocal((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }, []);

  const dropLocal = useCallback((key: string) => {
    setLocal((rows) => rows.filter((row) => row.key !== key));
    aborts.current.delete(key);
  }, []);

  const add = useCallback(
    (files: File[]) => {
      if (orderId === undefined) return;

      for (const file of files) {
        const key = `${file.name}:${String(file.size)}:${String(Date.now())}:${Math.random()
          .toString(36)
          .slice(2, 7)}`;

        // отклонённый файл в сеть не идёт: причину видно сразу, запрос был бы лишним
        const rejection = artworkRejection(file);
        if (rejection !== undefined) {
          setLocal((rows) => [
            ...rows,
            { key, fileName: file.name, size: file.size, progress: null, error: rejection },
          ]);
          continue;
        }

        setLocal((rows) => [
          ...rows,
          { key, fileName: file.name, size: file.size, progress: 0, error: null },
        ]);

        void (async () => {
          try {
            const target = await getApiService().requestArtworkUpload(orderId, {
              fileName: file.name,
              contentType: file.type,
              size: file.size,
            });

            const handle = uploadArtwork(target, file, (percent) => {
              patchLocal(key, { progress: percent });
            });
            aborts.current.set(key, handle.abort);
            await handle.promise;
            aborts.current.delete(key);

            await getApiService().completeArtworkUpload(orderId, target.fileId);
            const fresh = await getApiService().getOrder(orderId);
            onUploaded.current(fresh);
            // файл уехал на сервер — локальная строка больше не нужна
            dropLocal(key);
          } catch (error) {
            aborts.current.delete(key);
            if (isAbort(error)) {
              dropLocal(key);
              return;
            }
            patchLocal(key, {
              progress: null,
              error: isApiError(error)
                ? (error.problem?.detail ?? error.message)
                : "Файл не загрузился — попробуйте ещё раз",
            });
          }
        })();
      }
    },
    [orderId, patchLocal, dropLocal],
  );

  const remove = useCallback(
    (fileId: string) => {
      if (orderId === undefined) return;
      void (async () => {
        try {
          await getApiService().deleteArtwork(orderId, fileId);
          const fresh = await getApiService().getOrder(orderId);
          onUploaded.current(fresh);
        } catch {
          /* не удалилось — файл останется в списке, следующий заход покажет правду */
        }
      })();
    },
    [orderId],
  );

  return {
    local,
    busy: local.some((row) => row.error === null),
    add,
    remove,
    dismiss: dropLocal,
  };
}
