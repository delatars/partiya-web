import type { ReactNode, Ref } from "react";

import { cn } from "../lib/utils";
import { Container } from "./container";
import { navItemKey, ShellAction } from "./link";
import type { ShellLinkComponent } from "./link";

/* Макет: footer() → .foot — первая колонка шире (описание), дальше колонки ссылок */
export type FooterLink = {
  key?: string;
  label: ReactNode;
  href?: string;
  onClick?: () => void;
};

export type FooterColumn = {
  key?: string;
  title: ReactNode;
  links: readonly FooterLink[];
};

export type SiteFooterProps = {
  /** Первая широкая ячейка: название и описание платформы. */
  intro?: ReactNode;
  columns: readonly FooterColumn[];
  /** Нижняя строка: копирайт, реквизиты. */
  bottom?: ReactNode;
  ariaLabel?: string;
  className?: string;
  linkComponent?: ShellLinkComponent;
  ref?: Ref<HTMLElement>;
};

export function SiteFooter({
  intro,
  columns,
  bottom,
  ariaLabel,
  className,
  linkComponent,
  ref,
}: SiteFooterProps) {
  return (
    <footer
      ref={ref}
      aria-label={ariaLabel}
      className={cn("bg-surface border-border mt-9 border-t py-6.5", className)}
    >
      <Container className="grid grid-cols-2 gap-6 text-[13.5px] md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        {intro ? <div className="col-span-2 md:col-span-1">{intro}</div> : null}
        {columns.map((column, columnIndex) => (
          <div key={column.key ?? columnIndex}>
            <h4 className="font-heading mb-2 text-[13px] font-bold">{column.title}</h4>
            {column.links.map((link, linkIndex) => (
              <ShellAction
                key={navItemKey(link, linkIndex)}
                href={link.href}
                onClick={link.onClick}
                linkComponent={linkComponent}
                className="text-muted hover:text-text block py-0.75 text-left"
              >
                {link.label}
              </ShellAction>
            ))}
          </div>
        ))}
      </Container>
      {bottom ? (
        <Container className="text-muted border-border mt-6 border-t pt-4 text-[12.5px]">
          {bottom}
        </Container>
      ) : null}
    </footer>
  );
}
