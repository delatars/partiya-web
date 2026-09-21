import { ChevronDown } from "lucide-react";
import { useId } from "react";
import type { ReactNode, Ref } from "react";

import { cn } from "../lib/utils";
import { useDisclosure } from "./use-disclosure";

/* Макет: cabinet(nav, body) → .cab-layout (232 px + контент).
   Ниже 900 px колонки складываются; если задан navToggleLabel — сайдбар прячется под кнопку. */
export type CabinetLayoutProps = {
  /** Обычно <CabinetSideNav />. */
  nav: ReactNode;
  children?: ReactNode;
  /** Текст кнопки-раскрывашки на узких экранах. Без него сайдбар виден всегда. */
  navToggleLabel?: string;
  navOpen?: boolean;
  defaultNavOpen?: boolean;
  onNavOpenChange?: (open: boolean) => void;
  className?: string;
  contentClassName?: string;
  ref?: Ref<HTMLDivElement>;
};

export function CabinetLayout({
  nav,
  children,
  navToggleLabel,
  navOpen,
  defaultNavOpen,
  onNavOpenChange,
  className,
  contentClassName,
  ref,
}: CabinetLayoutProps) {
  const navId = useId();
  const { open, toggle } = useDisclosure({
    open: navOpen,
    defaultOpen: defaultNavOpen,
    onOpenChange: onNavOpenChange,
  });
  const collapsible = navToggleLabel !== undefined;

  return (
    <div
      ref={ref}
      className={cn("grid items-start gap-4 md:grid-cols-[var(--spacing-sidebar)_1fr]", className)}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={navId}
          className="bg-surface rounded-card border-border flex w-full items-center justify-between border px-3.5 py-2.5 font-medium md:hidden"
        >
          {navToggleLabel}
          <ChevronDown
            className={cn("size-4 transition-transform", open ? "rotate-180" : null)}
            aria-hidden="true"
          />
        </button>
      ) : null}

      <div id={navId} className={cn("md:block", collapsible && !open ? "hidden" : null)}>
        {nav}
      </div>

      <section className={cn("min-w-0", contentClassName)}>{children}</section>
    </div>
  );
}
