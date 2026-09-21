import type { ReactNode, Ref } from "react";

import { cn } from "../lib/utils";
import { navItemKey, ShellAction } from "./link";
import type { ShellLinkComponent } from "./link";

/* Макет: .side — карточка сайдбара: блок организации, пункты со счётчиками, активный синим */
export type SideNavItem = {
  key?: string;
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Счётчик справа; 0 и undefined не рисуются. */
  count?: number;
  active?: boolean;
};

export type SideNavGroup = {
  key?: string;
  /** Заголовок группы; плоский список — одна группа без заголовка. */
  title?: ReactNode;
  items: readonly SideNavItem[];
};

export type CabinetSideNavProps = {
  groups: readonly SideNavGroup[];
  /** Блок роли и организации сверху; обычно <AccountCard />. */
  account?: ReactNode;
  /** aria-label для <nav>, например «Разделы кабинета». */
  ariaLabel: string;
  /** Низ сайдбара: выход, поддержка. */
  footer?: ReactNode;
  className?: string;
  linkComponent?: ShellLinkComponent;
  ref?: Ref<HTMLElement>;
};

export function CabinetSideNav({
  groups,
  account,
  ariaLabel,
  footer,
  className,
  linkComponent,
  ref,
}: CabinetSideNavProps) {
  return (
    <nav
      ref={ref}
      aria-label={ariaLabel}
      className={cn("bg-surface rounded-card p-2 text-[13.5px] md:sticky md:top-3", className)}
    >
      {account}
      {groups.map((group, groupIndex) => (
        <div key={group.key ?? groupIndex} className="mt-1 first:mt-0">
          {group.title ? (
            <div className="text-muted px-2.5 pt-3 pb-1 text-[11px] font-bold tracking-[0.06em] uppercase">
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
              className="rounded-control text-muted hover:bg-subtle aria-[current=page]:bg-action-soft aria-[current=page]:text-action group flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left aria-[current=page]:font-medium"
            >
              <span className="min-w-0">{item.label}</span>
              {item.count ? (
                <span className="bg-subtle group-aria-[current=page]:bg-action shrink-0 rounded-full px-1.5 text-[11.5px] group-aria-[current=page]:text-white">
                  {item.count}
                </span>
              ) : null}
            </ShellAction>
          ))}
        </div>
      ))}
      {footer}
    </nav>
  );
}

/* Макет: .side .u — кружок с инициалом, название организации, роль */
export type AccountCardProps = {
  name: ReactNode;
  /** Вторая строка: роль, ИНН, город. */
  meta?: ReactNode;
  /** Инициал в кружке; или свой аватар через avatar. */
  initials?: string;
  avatar?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export function AccountCard({ name, meta, initials, avatar, className, ref }: AccountCardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "border-border mb-1.5 flex items-center gap-2.5 border-b px-2.5 pt-2.5 pb-3.5",
        className,
      )}
    >
      {avatar ?? (
        <span
          aria-hidden="true"
          className="bg-header font-heading grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
        >
          {initials}
        </span>
      )}
      <div className="min-w-0">
        <b className="block truncate font-medium">{name}</b>
        {meta ? <div className="text-muted truncate text-[12.5px]">{meta}</div> : null}
      </div>
    </div>
  );
}
