import type { ReactNode, Ref } from "react";

import { cn } from "../lib/utils";
import { Container } from "./container";
import { navItemKey, ShellAction } from "./link";
import type { ShellLinkComponent } from "./link";

/* Макет: .menu — полоса под шапкой, активный пункт с подчёркиванием, промо-пункт красным.
   На узких экранах полоса прокручивается горизонтально (как в макете, scrollbar скрыт). */
export type CategoryMenuItem = {
  key?: string;
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  /** promo — акцентный пункт (в макете: скидка на свободную мощность). */
  tone?: "default" | "promo";
};

export type CategoryMenuProps = {
  items: readonly CategoryMenuItem[];
  /** aria-label для <nav>, например «Категории». */
  ariaLabel: string;
  className?: string;
  linkComponent?: ShellLinkComponent;
  ref?: Ref<HTMLElement>;
};

export function CategoryMenu({
  items,
  ariaLabel,
  className,
  linkComponent,
  ref,
}: CategoryMenuProps) {
  return (
    <nav
      ref={ref}
      aria-label={ariaLabel}
      className={cn("bg-surface border-border border-b", className)}
    >
      <Container className="flex h-10 items-center gap-4.5 overflow-x-auto text-[13px] font-medium whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, index) => (
          <ShellAction
            key={navItemKey(item, index)}
            href={item.href}
            onClick={item.onClick}
            current={item.active}
            linkComponent={linkComponent}
            className={cn(
              "hover:text-text aria-[current=page]:border-action aria-[current=page]:text-text shrink-0 border-b-2 border-transparent py-[11px]",
              item.tone === "promo" ? "text-danger" : "text-muted",
            )}
          >
            {item.label}
          </ShellAction>
        ))}
      </Container>
    </nav>
  );
}
