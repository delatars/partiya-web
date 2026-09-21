import { Star } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/utils";

/* Макет: .rating — «★ 4,8 · 128 отзывов · 90 заказов»; всё после оценки приглушено */

export type RatingProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  value: number | string;
  /** Приглушённый хвост: счётчики, единицы измерения — текст задаёт потребитель */
  meta?: ReactNode;
  /** Оценка без звезды — например, в плотной таблице */
  hideStar?: boolean;
};

function formatValue(value: number | string): string {
  if (typeof value === "string") return value;
  return value.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function Rating({ className, value, meta, hideStar, ...props }: RatingProps) {
  const text = formatValue(value);

  return (
    <span
      className={cn("inline-flex items-center gap-[3px] text-[12.5px] font-medium", className)}
      {...props}
    >
      {!hideStar && (
        <Star aria-hidden="true" className="fill-warning text-warning size-3.5 flex-none" />
      )}
      <span className="num">{text}</span>
      {meta !== undefined && meta !== null && (
        <span className="text-muted font-normal">{meta}</span>
      )}
    </span>
  );
}
