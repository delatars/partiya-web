import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "../lib/utils";

/* Макет: .bar (6px, синяя заливка) и .mini (80×5, зелёная, внутри ячейки таблицы) */

type ProgressTone = "action" | "success" | "warning" | "danger";

const toneClass: Record<ProgressTone, string> = {
  action: "bg-action",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

function clampPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

export type ProgressBarProps = {
  value: number;
  max?: number;
  tone?: ProgressTone;
  /** Доступное имя полосы — «Готовность партии» и т. п. */
  label: string;
  className?: string;
  indicatorClassName?: string;
};

export function ProgressBar({
  value,
  max = 100,
  tone = "action",
  label,
  className,
  indicatorClassName,
}: ProgressBarProps) {
  const percent = clampPercent(value, max);

  return (
    <ProgressPrimitive.Root
      value={value}
      max={max}
      aria-label={label}
      className={cn("bg-subtle h-1.5 w-full overflow-hidden rounded-[3px]", className)}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full transition-[width]", toneClass[tone], indicatorClassName)}
        style={{ width: `${percent}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export type MiniBarProps = {
  value: number;
  max?: number;
  tone?: ProgressTone;
  className?: string;
  indicatorClassName?: string;
};

/** Декоративная полоска рядом с числом: значение читается из соседней ячейки. */
export function MiniBar({
  value,
  max = 100,
  tone = "success",
  className,
  indicatorClassName,
}: MiniBarProps) {
  const percent = clampPercent(value, max);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-subtle mr-1.5 inline-block h-[5px] w-20 overflow-hidden rounded-[3px] align-middle",
        className,
      )}
    >
      <span
        className={cn("block h-full", toneClass[tone], indicatorClassName)}
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}
