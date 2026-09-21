import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils";

/* Отдельного класса в макете нет — собрано в духе .view / .sorts: квадраты 30px,
   рамка line-2, текущая страница залита акцентом. */

const itemClass =
  "rounded-control border-border-strong text-muted hover:text-text hover:border-action inline-grid h-[30px] min-w-[30px] place-items-center border px-2 text-[13px] transition-colors";
const activeClass = "bg-action border-action text-white hover:text-white";
const disabledClass = "pointer-events-none opacity-45";

/** Страницы с многоточиями: 1 … 4 5 6 … 20 */
export function paginationRange(page: number, pageCount: number, siblings = 1): (number | "gap")[] {
  if (pageCount <= 1) return pageCount === 1 ? [1] : [];

  const pages = new Set<number>([1, pageCount]);
  for (let p = page - siblings; p <= page + siblings; p += 1) {
    if (p >= 1 && p <= pageCount) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  let previous = 0;

  for (const value of sorted) {
    if (previous !== 0 && value - previous > 1) result.push("gap");
    result.push(value);
    previous = value;
  }

  return result;
}

export type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  /** Ссылочная пагинация: URL страницы. Роутер сюда не тянем. */
  hrefFor?: (page: number) => string;
  siblings?: number;
  label?: string;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
};

export function Pagination({
  page,
  pageCount,
  onPageChange,
  hrefFor,
  siblings = 1,
  label = "Пагинация",
  previousLabel = "Предыдущая страница",
  nextLabel = "Следующая страница",
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const items = paginationRange(page, pageCount, siblings);

  const renderItem = (
    target: number,
    content: ReactNode,
    options: { active?: boolean; disabled?: boolean; ariaLabel?: string; key: string },
  ) => {
    const { active, disabled, ariaLabel, key } = options;
    const className = cn(itemClass, active && activeClass, disabled && disabledClass);

    if (hrefFor && !disabled) {
      return (
        <a
          key={key}
          href={hrefFor(target)}
          aria-label={ariaLabel}
          aria-current={active ? "page" : undefined}
          className={className}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        key={key}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-current={active ? "page" : undefined}
        onClick={() => onPageChange?.(target)}
        className={className}
      >
        {content}
      </button>
    );
  };

  return (
    <nav aria-label={label} className={cn("flex flex-wrap items-center gap-1", className)}>
      {renderItem(page - 1, <ChevronLeft aria-hidden="true" className="size-4" />, {
        disabled: page <= 1,
        ariaLabel: previousLabel,
        key: "prev",
      })}
      {items.map((item, index) =>
        item === "gap" ? (
          <span key={`gap${index}`} aria-hidden="true" className="text-muted px-1">
            …
          </span>
        ) : (
          renderItem(item, <span className="num">{item}</span>, {
            active: item === page,
            ariaLabel: `Страница ${item}`,
            key: `p${item}`,
          })
        ),
      )}
      {renderItem(page + 1, <ChevronRight aria-hidden="true" className="size-4" />, {
        disabled: page >= pageCount,
        ariaLabel: nextLabel,
        key: "next",
      })}
    </nav>
  );
}
