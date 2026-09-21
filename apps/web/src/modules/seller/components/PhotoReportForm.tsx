import { Box, Button, Field, Placeholder, Textarea } from "@partiya/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { getApiService, isApiError, SELLER_KEYS } from "@/shared/api";
import { isAbort, uploadArtwork } from "@/shared/lib/presigned-upload";

/* Макет: блок «Фотоотчёт» экрана `seller-order`.

   Загрузка — presigned, как у макета печати (ARCHITECTURE.md, 8.2): сначала
   `POST …/photo-report/upload` за ссылкой, потом файл уходит в хранилище МИМО API,
   и только затем `POST …/photo-report` публикует отчёт в ленте заказа. Иначе фотографии
   пошли бы через API и упёрлись бы в его лимиты тела. */

interface PendingPhoto {
  fileId: string;
  name: string;
  tone: "a" | "b" | "c" | "d";
}

const TONES = ["a", "b", "c", "d"] as const;

export function PhotoReportForm({ orderId, className }: { orderId: number; className?: string }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [caption, setCaption] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const publish = useMutation({
    mutationFn: () =>
      getApiService().publishPhotoReport(orderId, {
        fileIds: photos.map((photo) => photo.fileId),
        caption: caption.trim() || null,
      }),
    onSuccess: async () => {
      setPhotos([]);
      setCaption("");
      await queryClient.invalidateQueries({ queryKey: SELLER_KEYS.all });
    },
  });

  async function addFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const target = await getApiService().requestPhotoReportUpload(orderId, {
          fileName: file.name,
          contentType: file.type || "image/jpeg",
          size: file.size,
        });
        await uploadArtwork(target, file, () => undefined).promise;
        setPhotos((current) => [
          ...current,
          {
            fileId: target.fileId,
            name: file.name,
            tone: TONES[current.length % TONES.length] ?? "a",
          },
        ]);
      }
    } catch (error) {
      if (!isAbort(error)) {
        setUploadError(isApiError(error) ? error.message : "Файл не загрузился");
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Box className={className}>
      <h2 className="font-heading text-base font-bold">Фотоотчёт</h2>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="hatch border-border-strong rounded-card mt-2 flex w-full flex-col items-center gap-1 border border-dashed px-4 py-6 text-center"
      >
        <b className="text-[13.5px]">Перетащите фото или нажмите</b>
        <span className="text-muted text-[12.5px]">
          JPG, PNG, PDF до 40 МБ · с телефона — через Telegram-бота завода
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(event) => {
          void addFiles(event.target.files);
        }}
      />

      {photos.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {photos.map((photo) => (
            <Placeholder
              key={photo.fileId}
              tone={photo.tone}
              radius="control"
              label={photo.name}
              className="h-[84px] w-[110px]"
            />
          ))}
        </div>
      ) : null}

      <Field label="Подпись" className="mt-2.5">
        <Textarea
          rows={2}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Готовые изделия, чёрные. Принт после 26.09"
        />
      </Field>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-muted text-[12.5px]">
          {uploading
            ? "Загружаем…"
            : photos.length === 0
              ? "Приложите хотя бы одно фото"
              : `Готово к публикации: ${String(photos.length)}`}
        </span>
        <Button
          variant="cta"
          disabled={photos.length === 0 || publish.isPending || uploading}
          onClick={() => publish.mutate()}
        >
          {publish.isPending ? "Публикуем…" : "Опубликовать в ленте заказа"}
        </Button>
      </div>
      {uploadError === null ? null : (
        <p className="text-danger mt-1.5 text-[13px]">{uploadError}</p>
      )}
      {publish.error ? (
        <p className="text-danger mt-1.5 text-[13px]">{publish.error.message}</p>
      ) : null}
    </Box>
  );
}
