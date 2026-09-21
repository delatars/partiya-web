import type { OrderPhoto } from "@partiya/api-contracts";
import { Dialog, DialogContent, DialogTitle, Placeholder } from "@partiya/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { formatDateTime } from "@/shared/lib/dates";

/* Макет: .strip — полоса фотоотчёта внутри события ленты, с просмотром по клику.
 *
 * Просмотрщик — общий на весь экран, а не на строку: человек листает фотографии подряд,
 * не возвращаясь к ленте. Поэтому полоса не открывает диалог сама, а сообщает наверх,
 * какую фотографию из общего списка открыли. */

export function PhotoStrip({
  photos,
  onOpen,
  size = "md",
}: {
  photos: OrderPhoto[];
  onOpen: (photoId: string) => void;
  size?: "sm" | "md";
}) {
  if (photos.length === 0) return null;
  const box = size === "sm" ? "h-12 w-16" : "h-16 w-21";

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {photos.map((photo) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => {
            onOpen(photo.id);
          }}
          className="rounded-control focus-visible:outline-action overflow-hidden focus-visible:outline-2"
          aria-label={`Открыть фото: ${photo.label}`}
        >
          {photo.url === null ? (
            <Placeholder tone={photo.tone ?? "a"} className={`${box} rounded-control`} />
          ) : (
            <img src={photo.url} alt={photo.label} className={`${box} object-cover`} />
          )}
        </button>
      ))}
    </div>
  );
}

/** Просмотрщик фотоотчётов: стрелки ←/→, Esc — от диалога. */
export function PhotoViewer({
  photos,
  openId,
  onClose,
}: {
  photos: OrderPhoto[];
  openId: string | null;
  onClose: () => void;
}) {
  const index = photos.findIndex((photo) => photo.id === openId);
  const [current, setCurrent] = useState(Math.max(0, index));

  useEffect(() => {
    if (index >= 0) setCurrent(index);
  }, [index]);

  const go = useCallback(
    (delta: number) => {
      setCurrent((value) => {
        if (photos.length === 0) return 0;
        return (value + delta + photos.length) % photos.length;
      });
    },
    [photos.length],
  );

  useEffect(() => {
    if (openId === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [go, openId]);

  const photo = photos[current];
  if (openId === null || !photo) return null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size="lg" closeLabel="Закрыть просмотр">
        <DialogTitle>{photo.label}</DialogTitle>
        <p className="text-muted mt-0.5 text-[12.5px]">
          {formatDateTime(photo.takenAt)} · {String(current + 1)} из {String(photos.length)}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Предыдущее фото"
            onClick={() => {
              go(-1);
            }}
            className="hover:bg-subtle rounded-control grid size-9 flex-none place-items-center"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          {photo.url === null ? (
            <Placeholder
              tone={photo.tone ?? "a"}
              label={photo.label}
              className="rounded-card h-[46vh] min-h-56 flex-1"
            />
          ) : (
            <img
              src={photo.url}
              alt={photo.label}
              className="rounded-card h-[46vh] flex-1 object-contain"
            />
          )}
          <button
            type="button"
            aria-label="Следующее фото"
            onClick={() => {
              go(1);
            }}
            className="hover:bg-subtle rounded-control grid size-9 flex-none place-items-center"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </div>
        <p className="text-muted mt-2 text-center text-[12.5px]">
          Листайте стрелками ← и →, закрыть — Esc
        </p>
      </DialogContent>
    </Dialog>
  );
}
