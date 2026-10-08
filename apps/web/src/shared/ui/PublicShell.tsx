import {
  CategoryMenu,
  HeaderIcons,
  Logo,
  PageShell,
  SearchBar,
  ShellLinkProvider,
  SiteFooter,
  SiteHeader,
} from "@partiya/ui";
import { useRouterState } from "@tanstack/react-router";
import { ArrowLeftRight, Bell, Heart, Package, User } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { CATEGORIES, categoryHref, MENU_CATEGORY_LIMIT } from "@/shared/lib/categories";
import { useUserCounters } from "@/shared/lib/counters";
import { homePathFor } from "@/shared/lib/guards";
import { useSession } from "@/shared/lib/session";
import { useListsStore } from "@/shared/stores/lists-store";
import { AppLink, parseHref, RouterLink, useAppNavigate } from "@/shared/ui/router-link";

/* Макет: header() + .menu + .tray + footer(). Один каркас на все публичные страницы,
   включая 404 и экран ошибки, — поэтому он здесь, а не внутри layout-маршрута. */

const SEARCH_PLACEHOLDER = "Что произвести? футболки, худи, шоперы, металлокаркас…";

/** Ссылка на вход с возвратом туда, куда человек нажал. */
function loginHref(target: string): string {
  return `/login?redirect=${encodeURIComponent(target)}`;
}

const SEARCH_CATEGORIES = [
  { value: "", label: "Все категории" },
  ...CATEGORIES.map((category) => ({ value: category.slug, label: category.title })),
];

const MENU_EXTRA = [
  { key: "factories", label: "Заводы", href: "/factories" },
  { key: "promo", label: "Свободная мощность −15 %", href: "/catalog?trust=free", tone: "promo" },
  { key: "how", label: "Как это работает", href: "/how-it-works" },
  { key: "for-factories", label: "Заводам", href: "/for-factories" },
] as const;

const FOOTER_COLUMNS = [
  {
    title: "Заказчикам",
    links: [
      { label: "Каталог", href: "/catalog" },
      { label: "Как это работает", href: "/how-it-works" },
      { label: "Образцы", href: "/sample/new" },
      { label: "Эскроу и споры", href: "/how-it-works" },
    ],
  },
  {
    title: "Заводам",
    links: [
      { label: "Подключить завод", href: "/for-factories" },
      { label: "Аудит платформы", href: "/for-factories" },
      { label: "Комиссия", href: "/for-factories" },
    ],
  },
  {
    title: "Платформа",
    links: [
      { label: "Оферта", href: "/how-it-works" },
      { label: "Политика данных", href: "/how-it-works" },
      { label: "Поддержка", href: "/how-it-works" },
      { label: "Войти", href: "/login" },
    ],
  },
];

export type PublicShellProps = {
  children?: ReactNode;
  tray?: ReactNode;
  /** Кабинеты в макете заканчиваются контентом — подвал там не рисуется. */
  withFooter?: boolean;
  /** false — контент кладётся без контейнера (страница сама решает раскладку). */
  container?: boolean;
};

export function PublicShell({
  children,
  tray,
  withFooter = true,
  container = true,
}: PublicShellProps) {
  const navigate = useAppNavigate();
  const session = useSession();
  const compareCount = useListsStore((state) => state.compare.length);
  const favoritesCount = useListsStore((state) => state.favorites.length);
  // счётчики шапки — из данных (`GET /me/counters` + канал `/me/stream`), не константы
  const counters = useUserCounters();

  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const urlQuery = useRouterState({
    select: (state) => {
      const value = (state.location.search as Record<string, unknown>).q;
      return typeof value === "string" ? value : "";
    },
  });

  const [query, setQuery] = useState(urlQuery);
  const [category, setCategory] = useState("");
  // запрос живёт в URL; поле шапки следует за ним — иначе «назад» показывает старый текст
  useEffect(() => setQuery(urlQuery), [urlQuery]);

  const submit = ({ value }: { value: string }) => {
    navigate({
      to: category ? `/catalog/${category}` : "/catalog",
      search: value.trim() ? { q: value.trim() } : {},
    });
  };

  const icons = [
    {
      key: "compare",
      label: "Сравнение",
      icon: <ArrowLeftRight className="size-5" />,
      href: "/compare",
      count: compareCount,
    },
    {
      key: "favorites",
      label: "Избранное",
      icon: <Heart className="size-5" />,
      href: "/favorites",
      count: favoritesCount,
    },
    // аноним: иконки остаются на месте, но ведут на вход и возвращают обратно (Q-85)
    {
      key: "orders",
      label: "Заказы",
      icon: <Package className="size-5" />,
      href: session.isAuthenticated ? "/account/orders" : loginHref("/account/orders"),
      count: counters?.ordersAwaitingAction,
    },
    {
      key: "notifications",
      label: "Уведомления",
      icon: <Bell className="size-5" />,
      href: session.isAuthenticated ? "/notifications" : loginHref("/notifications"),
      count: counters?.unreadNotifications,
    },
    session.isAuthenticated
      ? {
          key: "account",
          label: "Кабинет",
          icon: <User className="size-5" />,
          href: homePathFor(session.me),
        }
      : { key: "login", label: "Войти", icon: <User className="size-5" />, href: "/login" },
  ];

  /* В полосу меню — первые корни по порядку таксономии; все 28 — плитками в каталоге и
     в выпадающем списке поиска (Q-418). */
  const menuItems = [
    ...CATEGORIES.slice(0, MENU_CATEGORY_LIMIT).map((item) => ({
      key: item.slug,
      label: item.title,
      href: categoryHref([item.slug]),
      active: pathname.startsWith(categoryHref([item.slug])),
    })),
    ...MENU_EXTRA.map((item) => ({ ...item, active: pathname === item.href })),
  ];

  return (
    <ShellLinkProvider component={RouterLink}>
      <PageShell
        tray={tray}
        container={container}
        contentClassName="pt-0"
        header={
          <SiteHeader
            logo={<Logo label="Партия" href="/" />}
            catalog={{ label: "Каталог", href: "/catalog" }}
            menuButtonLabel="Меню"
            search={
              <SearchBar
                value={query}
                onValueChange={setQuery}
                onSubmit={submit}
                placeholder={SEARCH_PLACEHOLDER}
                inputLabel="Что произвести"
                submitLabel="Найти"
                categories={SEARCH_CATEGORIES}
                category={category}
                onCategoryChange={setCategory}
                categoryLabel="Категория поиска"
              />
            }
            mobileSearch={
              <SearchBar
                compact
                value={query}
                onValueChange={setQuery}
                onSubmit={submit}
                placeholder="Что произвести?"
                inputLabel="Что произвести"
                submitLabel="Найти"
              />
            }
            icons={<HeaderIcons ariaLabel="Разделы платформы" items={icons} />}
            menu={<CategoryMenu ariaLabel="Категории" items={menuItems} />}
            mobileMenu={
              <nav aria-label="Меню" className="grid gap-1 text-[13.5px]">
                {icons.map((item) => {
                  const { to, search } = parseHref(item.href);
                  return (
                    <AppLink
                      key={item.key}
                      to={to}
                      search={search}
                      className="rounded-control px-2 py-2 hover:bg-white/10"
                    >
                      {item.label}
                    </AppLink>
                  );
                })}
              </nav>
            }
          />
        }
        footer={
          !withFooter ? null : (
            <SiteFooter
              ariaLabel="Подвал сайта"
              columns={FOOTER_COLUMNS}
              intro={
                <>
                  <b className="font-heading font-bold">Партия</b>
                  <p className="text-muted mt-1.5 max-w-[40ch] text-[12.5px]">
                    Маркетплейс производственных мощностей. Оплата через эскроу, производство под
                    контролем.
                  </p>
                </>
              }
            />
          )
        }
      >
        {children}
      </PageShell>
    </ShellLinkProvider>
  );
}
