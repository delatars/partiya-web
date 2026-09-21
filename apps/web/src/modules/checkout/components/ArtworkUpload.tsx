import type { ArtworkLimits, OrderArtwork } from "@partiya/api-contracts";
import { Button, cn, ProgressBar, Spinner } from "@partiya/ui";
import { Trash2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";

import {
  ARTWORK_LIMITS,
  artworkBadge,
  artworkRejection,
  artworkStatusText,
  formatFileSize,
} from "../lib/artwork";

/* Макет: .upload — строка файла, .dropzone — область «перетащите сюда».

   Два источника файла (кнопка и перетаскивание) ведут в один обработчик: пользователь
   не должен получать разное поведение в зависимости от того, как он положил файл.

   Отклонённые файлы не исчезают молча — они остаются в списке с причиной. Иначе
   перетащил человек 40-мегабайтный TIFF, ничего не произошло, и он не понял почему. */

/** Файл, который не дошёл до сервера: его нет в заказе, но показать его надо. */
export interface LocalArtwork {
  key: string;
  fileName: string;
  size: number;
  /** 0–100, пока идёт загрузка. */
  progress: number | null;
  error: string | null;
}

export interface ArtworkUploadProps {
  files: OrderArtwork[];
  local: LocalArtwork[];
  limits?: ArtworkLimits;
  disabled?: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (fileId: string) => void;
  onDismissLocal: (key: string) => void;
}

export function ArtworkUpload({
  files,
  local,
  limits = ARTWORK_LIMITS,
  disabled = false,
  onAdd,
  onRemove,
  onDismissLocal,
}: ArtworkUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = [...limits.contentTypes, ".ai", ".eps"].join(",");
  const full = files.length >= limits.maxFiles;

  const add = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onAdd([...list]);
  };

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !full) setDragging(true);
        }}
        onDragLeave={() => {
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled || full) return;
          add(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-card bg-page flex flex-col items-center gap-1 border-[1.5px] border-dashed px-4 py-5 text-center",
          dragging ? "border-action bg-action-soft" : "border-border-strong",
          (disabled || full) && "opacity-60",
        )}
      >
        <Upload aria-hidden="true" className="text-muted size-5" />
        <p className="text-[13.5px]">
          Перетащите макет сюда или{" "}
          <label
            htmlFor={inputId}
            className={cn(
              "text-action underline",
              disabled || full ? "cursor-not-allowed" : "cursor-pointer",
            )}
          >
            выберите файл
          </label>
        </p>
        <p className="text-muted text-xs">
          PDF, AI, EPS, PNG, TIFF, SVG от 300 dpi · до {Math.round(limits.maxSize / 1024 / 1024)} МБ
          · проверку макета делает технолог фабрики
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={accept}
          disabled={disabled || full}
          className="sr-only"
          onChange={(event) => {
            add(event.target.files);
            // один и тот же файл должен выбираться повторно — иначе onChange не сработает
            event.target.value = "";
          }}
        />
      </div>

      {full && (
        <p className="text-muted mt-1.5 text-xs">
          Больше {limits.maxFiles} файлов к заказу приложить нельзя — удалите лишние.
        </p>
      )}

      {(files.length > 0 || local.length > 0) && (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {files.map((file) => (
            <li key={file.id}>
              <FileRow
                name={file.fileName}
                size={file.size}
                status={artworkStatusText(file)}
                failed={file.status === "failed" || file.status === "rejected"}
                busy={file.status === "uploading"}
                onRemove={
                  disabled
                    ? undefined
                    : () => {
                        onRemove(file.id);
                      }
                }
              />
            </li>
          ))}
          {local.map((item) => (
            <li key={item.key}>
              <FileRow
                name={item.fileName}
                size={item.size}
                status={item.error ?? "загружается"}
                failed={item.error !== null}
                busy={item.error === null}
                progress={item.progress}
                onRemove={() => {
                  onDismissLocal(item.key);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FileRow({
  name,
  size,
  status,
  failed,
  busy,
  progress,
  onRemove,
}: {
  name: string;
  size: number;
  status: string;
  failed: boolean;
  busy: boolean;
  progress?: number | null;
  onRemove?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-control flex items-center gap-3 px-3 py-2.5 text-[13.5px]",
        failed ? "bg-danger-soft" : "bg-subtle",
      )}
    >
      <span
        aria-hidden="true"
        className="font-heading border-border-strong bg-surface text-danger grid h-10 w-[34px] flex-none place-items-center rounded border text-[9px] font-bold"
      >
        {artworkBadge(name)}
      </span>
      <div className="min-w-0 flex-1">
        <b className="block truncate font-medium">{name}</b>
        <span className={cn("text-[12.5px]", failed ? "text-danger" : "text-muted")}>
          {formatFileSize(size)} · {status}
        </span>
        {progress !== undefined && progress !== null && !failed && (
          <ProgressBar value={progress} label={`Загрузка ${name}`} className="mt-1.5 h-1" />
        )}
      </div>
      {busy && progress === undefined && (
        <Spinner size="sm" label="Загружается" className="text-muted" />
      )}
      {onRemove && (
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Удалить ${name}`}
          onClick={onRemove}
          className="flex-none px-2"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      )}
    </div>
  );
}

export { artworkRejection };
