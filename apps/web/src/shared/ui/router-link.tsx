import type { ShellLinkComponent, ShellLinkProps } from "@partiya/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ComponentType, ReactNode, Ref } from "react";

/* Оболочка @partiya/ui описывает навигацию данными — путь приходит строкой.
   Link роутера типизирован по дереву маршрутов и строку не принимает, поэтому здесь
   один явный мост: маршрут проверит сам роутер. В коде страниц, где путь известен
   на этапе сборки, используем обычный Link и типизированный useNavigate маршрута. */

export type AppLinkProps = Omit<ShellLinkProps, "href"> & {
  to: string;
  search?: Record<string, unknown>;
  children?: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
};

export const AppLink = Link as unknown as ComponentType<AppLinkProps>;

export type AppNavigateOptions = {
  to: string;
  search?: Record<string, unknown>;
  replace?: boolean;
};

/** Навигация по строковому пути — для меню, подвала и прочих мест, где путь приходит данными. */
export function useAppNavigate(): (options: AppNavigateOptions) => void {
  const navigate = useNavigate();
  return (options) => {
    void (navigate as unknown as (o: AppNavigateOptions) => Promise<void>)(options);
  };
}

/** "/catalog?trust=free" → { to: "/catalog", search: { trust: "free" } } */
export function parseHref(href: string): { to: string; search: Record<string, unknown> } {
  const index = href.indexOf("?");
  if (index === -1) return { to: href, search: {} };
  const search: Record<string, unknown> = {};
  for (const [key, value] of new URLSearchParams(href.slice(index + 1))) search[key] = value;
  return { to: href.slice(0, index), search };
}

export const RouterLink: ShellLinkComponent = ({ href, ...props }) => {
  const { to, search } = parseHref(href);
  return <AppLink to={to} search={search} {...props} />;
};
