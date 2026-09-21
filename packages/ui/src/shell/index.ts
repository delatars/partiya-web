/* Оболочка: шапка, меню категорий, подвал, навигация кабинета. Без знания о домене.
 *
 * Ссылки. Оболочка не знает о роутере: <a> рисует компонент приложения.
 * Подход один на весь слой — проп-рендерер ShellLinkComponent (href + className + aria),
 * заданный один раз через ShellLinkProvider; проп linkComponent на компоненте перебивает контекст.
 * Пункты меню и сайдбара описываются данными (label/href/onClick/active), поэтому asChild тут не годится:
 * дочерний элемент пришлось бы передавать на каждый пункт списка.
 *
 * TanStack Router:
 *
 *   import { Link } from "@tanstack/react-router";
 *   import { ShellLinkProvider, type ShellLinkComponent } from "@partiya/ui";
 *
 *   const RouterLink: ShellLinkComponent = ({ href, ...props }) => <Link to={href} {...props} />;
 *
 *   <ShellLinkProvider component={RouterLink}>
 *     <PageShell
 *       header={
 *         <SiteHeader
 *           logo={<Logo label="Партия" href="/" />}
 *           catalog={{ label: "Каталог", href: "/catalog" }}
 *           search={<SearchBar value={q} onValueChange={setQ} submitLabel="Найти" />}
 *           icons={<HeaderIcons ariaLabel="Разделы" items={[{ label: "Заказы", href: "/orders", icon: <Package /> }]} />}
 *           menu={<CategoryMenu ariaLabel="Категории" items={categories} />}
 *         />
 *       }
 *     >
 *       <Outlet />
 *     </PageShell>
 *   </ShellLinkProvider>
 *
 * Активный пункт помечается пропом active → aria-current="page"; стили висят на aria-[current=page].
 * Все тексты (подписи, aria-label, названия категорий) приходят пропами — доменных значений по умолчанию тут нет.
 */

export { AdminLayout, AdminSideNav } from "./admin-layout";
export type { AdminLayoutProps, AdminSideNavProps } from "./admin-layout";

export { AuthLayout } from "./auth-layout";
export type { AuthLayoutProps } from "./auth-layout";

export { CabinetLayout } from "./cabinet-layout";
export type { CabinetLayoutProps } from "./cabinet-layout";

export { AccountCard, CabinetSideNav } from "./cabinet-side-nav";
export type {
  AccountCardProps,
  CabinetSideNavProps,
  SideNavGroup,
  SideNavItem,
} from "./cabinet-side-nav";

export { CategoryMenu } from "./category-menu";
export type { CategoryMenuItem, CategoryMenuProps } from "./category-menu";

export { CompareTray, CompareTrayItem } from "./compare-tray";
export type { CompareTrayItemProps, CompareTrayProps } from "./compare-tray";

export { Container } from "./container";
export type { ContainerProps } from "./container";

export { HeaderIcons } from "./header-icons";
export type { HeaderIconItem, HeaderIconsProps } from "./header-icons";

export { navItemKey, ShellAction, ShellAnchor, ShellLinkProvider, useShellLink } from "./link";
export type {
  ShellActionProps,
  ShellLinkComponent,
  ShellLinkProps,
  ShellLinkProviderProps,
  ShellNavItem,
} from "./link";

export { Logo } from "./logo";
export type { LogoProps } from "./logo";

export { PageHeader } from "./page-header";
export type { PageHeaderProps } from "./page-header";

export { PageShell } from "./page-shell";
export type { PageShellProps } from "./page-shell";

export { SearchBar } from "./search-bar";
export type { SearchBarProps, SearchCategoryOption, SearchSubmitPayload } from "./search-bar";

export { SiteFooter } from "./site-footer";
export type { FooterColumn, FooterLink, SiteFooterProps } from "./site-footer";

export { SiteHeader } from "./site-header";
export type { SiteHeaderCatalogAction, SiteHeaderProps } from "./site-header";

export { SiteHeaderSlim } from "./site-header-slim";
export type { SiteHeaderSlimProps } from "./site-header-slim";

export { useDisclosure } from "./use-disclosure";
export type { Disclosure, DisclosureOptions } from "./use-disclosure";
