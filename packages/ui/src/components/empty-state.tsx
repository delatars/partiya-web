import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/utils";

/* Макет: empty — штрихованный квадрат 72px, заголовок, текст до 46ch, действие */

export type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Своя иллюстрация вместо штриховки */
  illustration?: ReactNode;
};

export function EmptyState({
  className,
  title,
  description,
  action,
  illustration,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cn("px-4 py-7 text-center", className)} {...props}>
      {illustration ?? (
        <div
          aria-hidden="true"
          className="hatch border-border-strong mx-auto mb-3 size-18 rounded-[18px] border border-dashed"
        />
      )}
      <h3 className="text-sm font-bold">{title}</h3>
      {description !== undefined && description !== null && (
        <p className="text-muted mx-auto mt-1.5 mb-3.5 max-w-[46ch]">{description}</p>
      )}
      {action !== undefined && action !== null && (
        <div className="flex flex-wrap justify-center gap-2">{action}</div>
      )}
    </div>
  );
}
