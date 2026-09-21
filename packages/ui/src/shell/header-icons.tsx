import type { ReactNode, Ref } from "react";

import { cn } from "../lib/utils";
import { navItemKey, ShellAction } from "./link";
import type { ShellLinkComponent } from "./link";

/* Макет: .icons — иконка, подпись, счётчик-пилюля */
export type HeaderIconItem = {
  key?: string;
  /** Подпись под иконкой; она же — имя ссылки для скринридера. */
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Счётчик: 0 и undefined не рисуются. */
  count?: number;
  active?: boolean;
};

export type HeaderIconsProps = {
  items: readonly HeaderIconItem[];
  /** aria-label для <nav>: «Личный кабинет», «Быстрые разделы» и т. п. */
  ariaLabel: string;
  className?: string;
  linkComponent?: ShellLinkComponent;
  ref?: Ref<HTMLElement>;
};

export function HeaderIcons({ items, ariaLabel, className, linkComponent, ref }: HeaderIconsProps) {
  return (
    <nav ref={ref} aria-label={ariaLabel} className={cn("flex items-center gap-1.5", className)}>
      {items.map((item, index) => (
        <ShellAction
          key={navItemKey(item, index)}
          href={item.href}
          onClick={item.onClick}
          current={item.active}
          linkComponent={linkComponent}
          className="rounded-control hover:bg-header-hover relative flex flex-col items-center gap-0.5 px-2.5 py-1 text-[11px] opacity-85 hover:opacity-100 aria-[current=page]:opacity-100"
        >
          <span className="grid size-5 place-items-center" aria-hidden="true">
            {item.icon}
          </span>
          {item.label}
          {item.count ? (
            <span className="bg-danger absolute top-0 right-1.5 rounded-full px-1.5 text-[10px] font-bold text-white">
              {item.count}
            </span>
          ) : null}
        </ShellAction>
      ))}
    </nav>
  );
}
