import { Children, Fragment, type AnchorHTMLAttributes, type HTMLAttributes } from "react";
import { Slot } from "radix-ui";

import { cn } from "../lib/utils";

/* Макет: .crumbs — «Каталог › Одежда › Худи», разделитель рисуем сами */

export type BreadcrumbsProps = HTMLAttributes<HTMLElement> & { label?: string };

export function Breadcrumbs({
  className,
  label = "Хлебные крошки",
  children,
  ...props
}: BreadcrumbsProps) {
  const items = Children.toArray(children);

  return (
    <nav aria-label={label} className={cn("text-muted py-3 text-[12.5px]", className)} {...props}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <li aria-hidden="true" className="text-border-strong">
                ›
              </li>
            )}
            <li>{item}</li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

export type BreadcrumbLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** Отдать разметку ссылке роутера */
  asChild?: boolean;
};

export function BreadcrumbLink({ className, asChild, ...props }: BreadcrumbLinkProps) {
  const Comp = asChild ? Slot.Root : "a";

  return <Comp className={cn("hover:text-text transition-colors", className)} {...props} />;
}

export type BreadcrumbPageProps = HTMLAttributes<HTMLSpanElement>;

export function BreadcrumbPage({ className, ...props }: BreadcrumbPageProps) {
  return <span aria-current="page" className={cn("text-text", className)} {...props} />;
}
