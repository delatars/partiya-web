import type { ReactNode, Ref } from "react";

import { cn } from "../lib/utils";

/* Макет: pageH(h, sub, actions) → .page-h */
export type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Кнопки справа от заголовка. */
  actions?: ReactNode;
  /** h1 по умолчанию; h2 — для заголовка внутри уже озаглавленной страницы. */
  as?: "h1" | "h2";
  id?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export function PageHeader({
  title,
  subtitle,
  actions,
  as: Heading = "h1",
  id,
  className,
  ref,
}: PageHeaderProps) {
  return (
    <div
      ref={ref}
      className={cn("mt-1 mb-3.5 flex flex-wrap items-end justify-between gap-4", className)}
    >
      <div className="min-w-0">
        <Heading
          id={id}
          className={cn(
            "font-heading leading-[1.2] font-bold tracking-[-0.01em]",
            Heading === "h1" ? "text-2xl" : "text-lg",
          )}
        >
          {title}
        </Heading>
        {subtitle ? <p className="text-muted mt-1 max-w-[80ch]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}
