import { X } from "lucide-react";
import type { ReactNode, Ref } from "react";

import { cn } from "../lib/utils";
import { Container } from "./container";

/* Макет: .tray — фиксированный лоток над подвалом. Что лежит внутри — дело приложения. */
export type CompareTrayProps = {
  /** Название лотка; текст приходит пропом. */
  title: ReactNode;
  /** Число элементов: рисуется рядом с названием через «·». */
  count?: number;
  /** Слот элементов; обычно <CompareTrayItem />. Ниже 900 px скрыт, как в макете. */
  children?: ReactNode;
  /** Подсказка справа от элементов, например «добавьте ещё до 4». */
  hint?: ReactNode;
  /** Кнопки справа. */
  actions?: ReactNode;
  /** false — лоток не рисуется. */
  open?: boolean;
  /** aria-label для region, например «Отложенные позиции». */
  ariaLabel: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export function CompareTray({
  title,
  count,
  children,
  hint,
  actions,
  open = true,
  ariaLabel,
  className,
  ref,
}: CompareTrayProps) {
  if (!open) return null;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      className={cn(
        "bg-surface border-border shadow-tray fixed inset-x-0 bottom-0 z-40 border-t",
        className,
      )}
    >
      <Container className="flex min-h-16 flex-wrap items-center gap-3.5 py-2">
        <b className="font-medium">
          {title}
          {count === undefined ? null : <span className="num"> · {count}</span>}
        </b>
        {children ? <div className="hidden items-center gap-2 md:flex">{children}</div> : null}
        {hint ? <span className="text-muted text-[12.5px]">{hint}</span> : null}
        {actions ? <div className="ms-auto flex items-center gap-2">{actions}</div> : null}
      </Container>
    </div>
  );
}

/* Макет: .tray .it — миниатюра, название, короткая строка параметров */
export type CompareTrayItemProps = {
  /** Миниатюра 32×32. */
  media?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  onRemove?: () => void;
  /** aria-label кнопки удаления. */
  removeLabel?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export function CompareTrayItem({
  media,
  title,
  meta,
  onRemove,
  removeLabel,
  className,
  ref,
}: CompareTrayItemProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "border-border rounded-control flex items-center gap-2 border py-1 pr-2 pl-1 text-[12.5px]",
        className,
      )}
    >
      {media ? (
        <span className="block size-8 shrink-0 overflow-hidden rounded">{media}</span>
      ) : null}
      <span className="min-w-0">
        <b className="block truncate font-medium">{title}</b>
        {meta ? <span className="text-muted block truncate">{meta}</span> : null}
      </span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="text-muted hover:text-text grid size-5 shrink-0 place-items-center"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
