import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { Slot } from "radix-ui";

import { cn } from "../lib/utils";

/* Макет: .tabbar — разделы кабинета ссылками (каждая вкладка = свой URL).
   Роутер сюда не проникает: либо href, либо asChild с ссылкой роутера. */

export type TabBarProps = HTMLAttributes<HTMLElement> & { label?: string };

export function TabBar({ className, label = "Разделы", ...props }: TabBarProps) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "border-border flex gap-4 overflow-x-auto border-b whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

export type TabBarItemProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  active?: boolean;
  /** Отдать разметку вкладки ссылке роутера */
  asChild?: boolean;
  /** Счётчик справа от названия */
  count?: ReactNode;
};

export function TabBarItem({
  className,
  active,
  asChild,
  count,
  children,
  ...props
}: TabBarItemProps) {
  const Comp = asChild ? Slot.Root : "a";
  const badge = count !== undefined && count !== null && (
    <span className="bg-subtle text-muted num rounded-full px-1.5 text-[11.5px]">{count}</span>
  );

  return (
    <Comp
      aria-current={active ? "page" : undefined}
      className={cn(
        "text-muted hover:text-text -mb-px flex items-center gap-1.5 border-b-2 border-transparent px-0.5 py-2.5 font-medium transition-colors",
        active && "text-text border-action",
        className,
      )}
      {...props}
    >
      {/* Slottable оставляет ссылку потребителя корнем, а счётчик кладёт внутрь неё */}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
      {badge}
    </Comp>
  );
}
