import type { ReactNode, Ref } from "react";

import { cn } from "../lib/utils";
import { Container } from "./container";

/* Каркас публичной страницы: шапка + <main class="wrap"> + подвал (+ лоток снизу) */
export type PageShellProps = {
  header?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Фиксированный лоток снизу (CompareTray): контенту добавляется нижний отступ. */
  tray?: ReactNode;
  /** false — контент кладётся в <main> как есть, без контейнера. */
  container?: boolean;
  width?: "page" | "narrow";
  className?: string;
  contentClassName?: string;
  ref?: Ref<HTMLDivElement>;
};

export function PageShell({
  header,
  children,
  footer,
  tray,
  container = true,
  width = "page",
  className,
  contentClassName,
  ref,
}: PageShellProps) {
  return (
    <div ref={ref} className={cn("flex min-h-dvh flex-col", tray ? "pb-24" : null, className)}>
      {header}
      <main className={cn("flex-1 pt-3", contentClassName)}>
        {container ? <Container width={width}>{children}</Container> : children}
      </main>
      {footer}
      {tray}
    </div>
  );
}
