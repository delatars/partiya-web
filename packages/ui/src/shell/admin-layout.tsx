import type { ReactNode, Ref } from "react";

import { cn } from "../lib/utils";
import { navItemKey, ShellAction } from "./link";
import type { ShellLinkComponent } from "./link";
import type { SideNavGroup } from "./cabinet-side-nav";

/* Макет: .adm / .adm-side / .adm-main — бэк-офис: тёмный сайдбар во всю высоту, без шапки сайта.
   Ниже 900 px сайдбар становится горизонтальной лентой пунктов. */
export type AdminLayoutProps = {
  /** Обычно <AdminSideNav />. */
  nav: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  ref?: Ref<HTMLDivElement>;
};

export function AdminLayout({ nav, children, className, contentClassName, ref }: AdminLayoutProps) {
  return (
    <div
      ref={ref}
      className={cn("grid min-h-dvh md:grid-cols-[var(--spacing-sidebar)_1fr]", className)}
    >
      {nav}
      <main className={cn("min-w-0 px-6 py-4.5", contentClassName)}>{children}</main>
    </div>
  );
}

export type AdminSideNavProps = {
  /** Лого бэк-офиса; обычно <Logo size="sm" />. */
  logo?: ReactNode;
  groups: readonly SideNavGroup[];
  /** Низ панели: оператор, смена. Ниже 900 px скрыт, как в макете. */
  footer?: ReactNode;
  /** aria-label для <nav>, например «Разделы бэк-офиса». */
  ariaLabel: string;
  className?: string;
  linkComponent?: ShellLinkComponent;
  ref?: Ref<HTMLElement>;
};

export function AdminSideNav({
  logo,
  groups,
  footer,
  ariaLabel,
  className,
  linkComponent,
  ref,
}: AdminSideNavProps) {
  return (
    <nav
      ref={ref}
      aria-label={ariaLabel}
      className={cn(
        "bg-ink-surface flex flex-col gap-0.5 px-2.5 py-3.5 text-[13.5px] text-white max-md:flex-row max-md:flex-wrap max-md:items-center",
        className,
      )}
    >
      {logo ? <div className="px-2 pt-1 pb-4 max-md:pb-1">{logo}</div> : null}
      {groups.map((group, groupIndex) => (
        <div
          key={group.key ?? groupIndex}
          className="flex flex-col gap-0.5 max-md:flex-row max-md:flex-wrap"
        >
          {group.title ? (
            <div className="px-2.5 pt-3 pb-1 text-[11px] font-bold tracking-[0.06em] text-white/50 uppercase max-md:hidden">
              {group.title}
            </div>
          ) : null}
          {group.items.map((item, itemIndex) => (
            <ShellAction
              key={navItemKey(item, itemIndex)}
              href={item.href}
              onClick={item.onClick}
              current={item.active}
              linkComponent={linkComponent}
              className="rounded-control flex items-center justify-between gap-2 px-2.5 py-2 text-left text-white/65 hover:bg-white/10 aria-[current=page]:bg-white/12 aria-[current=page]:text-white"
            >
              <span className="min-w-0">{item.label}</span>
              {item.count ? (
                <span className="bg-danger shrink-0 rounded-full px-1.5 text-[11px] font-bold text-white">
                  {item.count}
                </span>
              ) : null}
            </ShellAction>
          ))}
        </div>
      ))}
      {footer ? (
        <div className="mt-auto border-t border-white/15 p-2.5 text-[12.5px] text-white/80 max-md:hidden">
          {footer}
        </div>
      ) : null}
    </nav>
  );
}
