import { Menu, X } from "lucide-react";
import { useId } from "react";
import type { ReactNode, Ref } from "react";

import { cn } from "../lib/utils";
import { Container } from "./container";
import { ShellAction } from "./link";
import type { ShellLinkComponent } from "./link";
import { useDisclosure } from "./use-disclosure";

/* Макет: header(o) → .top + .wrap (лого, .catbtn, .search, .icons).
   До 900 px — вариант с экрана mobile: бургер, компактный поиск отдельной строкой. */
export type SiteHeaderCatalogAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type SiteHeaderProps = {
  /** Обычно <Logo />. */
  logo: ReactNode;
  /** Кнопка «каталог» слева от поиска; ниже 560 px остаётся только иконка. */
  catalog?: SiteHeaderCatalogAction;
  /** Обычно <SearchBar />. */
  search?: ReactNode;
  /** Поиск для узких экранов; если не задан — используется search. */
  mobileSearch?: ReactNode;
  /** Обычно <HeaderIcons />; ниже 900 px скрыт — продублируйте пункты в mobileMenu. */
  icons?: ReactNode;
  /** Вход или профиль: видны на всех ширинах. */
  actions?: ReactNode;
  /** Обычно <CategoryMenu />: рисуется отдельной полосой под шапкой. */
  menu?: ReactNode;
  /** Содержимое панели под бургером. Без него бургер не рисуется. */
  mobileMenu?: ReactNode;
  menuOpen?: boolean;
  defaultMenuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  /** aria-label бургера, например «Меню». */
  menuButtonLabel?: string;
  className?: string;
  linkComponent?: ShellLinkComponent;
  ref?: Ref<HTMLElement>;
};

export function SiteHeader({
  logo,
  catalog,
  search,
  mobileSearch,
  icons,
  actions,
  menu,
  mobileMenu,
  menuOpen,
  defaultMenuOpen,
  onMenuOpenChange,
  menuButtonLabel,
  className,
  linkComponent,
  ref,
}: SiteHeaderProps) {
  const panelId = useId();
  const { open, toggle } = useDisclosure({
    open: menuOpen,
    defaultOpen: defaultMenuOpen,
    onOpenChange: onMenuOpenChange,
  });

  const hasMobileSearch = mobileSearch !== undefined;

  return (
    <>
      <header ref={ref} className={cn("bg-header text-white", className)}>
        <Container className="flex flex-wrap items-center gap-3 py-2.5 md:h-15 md:flex-nowrap md:gap-4.5 md:py-0">
          {mobileMenu ? (
            <button
              type="button"
              onClick={toggle}
              aria-label={menuButtonLabel}
              aria-expanded={open}
              aria-controls={panelId}
              className="rounded-control bg-header-hover grid size-9 shrink-0 place-items-center md:hidden"
            >
              {open ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </button>
          ) : null}

          {logo}

          {catalog ? (
            <ShellAction
              href={catalog.href}
              onClick={catalog.onClick}
              linkComponent={linkComponent}
              className="rounded-control bg-header-hover hidden shrink-0 items-center gap-2 px-3.5 py-2.25 font-medium md:inline-flex"
            >
              <Menu className="size-4" aria-hidden="true" />
              {catalog.label}
            </ShellAction>
          ) : null}

          {search ? (
            <div
              className={cn(
                "order-last w-full min-w-0 md:order-none md:flex-1",
                hasMobileSearch ? "hidden md:block" : null,
              )}
            >
              {search}
            </div>
          ) : null}

          {hasMobileSearch ? (
            <div className="order-last w-full min-w-0 md:hidden">{mobileSearch}</div>
          ) : null}

          {icons ? <div className="ms-auto hidden items-center md:flex">{icons}</div> : null}

          {actions ? (
            <div className={cn("flex items-center gap-2", icons ? null : "ms-auto")}>{actions}</div>
          ) : null}
        </Container>

        {mobileMenu ? (
          <div id={panelId} hidden={!open} className="border-t border-white/15 md:hidden">
            <Container className="py-3">{mobileMenu}</Container>
          </div>
        ) : null}
      </header>
      {menu}
    </>
  );
}
