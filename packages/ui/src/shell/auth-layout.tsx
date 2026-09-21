import type { ReactNode, Ref } from "react";

import { cn } from "../lib/utils";
import { Container } from "./container";

/* Макет: .auth-wrap / .auth / .auth-side — экраны login и register */
export type AuthLayoutProps = {
  /** Обычно <SiteHeaderSlim />. */
  header?: ReactNode;
  children?: ReactNode;
  /** Правая колонка-пояснение; ниже 900 px уезжает под карточку. */
  aside?: ReactNode;
  className?: string;
  cardClassName?: string;
  ref?: Ref<HTMLDivElement>;
};

export function AuthLayout({
  header,
  children,
  aside,
  className,
  cardClassName,
  ref,
}: AuthLayoutProps) {
  return (
    <div ref={ref} className={cn("flex min-h-dvh flex-col", className)}>
      {header}
      <main className="flex-1">
        <Container
          className={cn(
            "grid items-start justify-center gap-4 pt-4 md:pt-10",
            aside ? "md:grid-cols-[440px_320px]" : "md:grid-cols-[440px]",
          )}
        >
          <div className={cn("bg-surface rounded-card p-7.5", cardClassName)}>{children}</div>
          {aside ? <aside className="bg-action-soft rounded-card p-5.5">{aside}</aside> : null}
        </Container>
      </main>
    </div>
  );
}
