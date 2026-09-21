import type { ReactNode, Ref } from "react";

import { cn } from "../lib/utils";
import { Container } from "./container";

/* Макет: headerSlim(right) → .top.slim — оформление, вход, онбординг */
export type SiteHeaderSlimProps = {
  logo: ReactNode;
  /** Правая часть: ссылка «как это работает», «сохранить и выйти», шаг мастера. */
  actions?: ReactNode;
  className?: string;
  ref?: Ref<HTMLElement>;
};

export function SiteHeaderSlim({ logo, actions, className, ref }: SiteHeaderSlimProps) {
  return (
    <header ref={ref} className={cn("bg-header text-white", className)}>
      <Container className="flex h-13 items-center gap-4">
        {logo}
        {actions ? (
          <div className="ms-auto flex items-center gap-3 text-[13.5px]">{actions}</div>
        ) : null}
      </Container>
    </header>
  );
}
