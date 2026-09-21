import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/utils";

/* Макет: .kpi — подпись 12px, число Montserrat 800 22px, дельта снизу.
   Цвет дельты: up — зелёная, warn — янтарная, обычная — приглушённая. */

const deltaToneClass = {
  up: "text-success",
  warn: "text-warning",
  muted: "text-muted",
} as const;

export type KpiTileProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  deltaTone?: keyof typeof deltaToneClass;
};

export function KpiTile({
  className,
  label,
  value,
  delta,
  deltaTone = "muted",
  ...props
}: KpiTileProps) {
  return (
    <div className={cn("bg-surface rounded-card px-3.5 py-3", className)} {...props}>
      <span className="text-muted block text-xs">{label}</span>
      <b className="price mt-0.5 block text-[22px] leading-tight">{value}</b>
      {delta !== undefined && delta !== null && (
        <span className={cn("block text-xs", deltaToneClass[deltaTone])}>{delta}</span>
      )}
    </div>
  );
}
