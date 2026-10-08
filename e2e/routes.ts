import type { DemoRole } from "./fixtures";

/* Опись маршрутов для дымового обхода. Источник — дерево маршрутов
   `apps/web/src/routeTree.gen.ts` (генерируется из `src/routes/**`): при добавлении
   экрана сюда надо дописать строку, иначе он останется без дымового теста.

   Параметры путей подставлены демо-значениями из фикстур моков:
   оффер 2231 и завод 17 — сквозной пример макета, заказы 4812/4790/4811 — кабинеты. */

export interface RouteCase {
  /** Путь с подставленными параметрами. */
  path: string;
  /** Под кем открывать. `null` — аноним. */
  as: DemoRole | null;
  /** Чем экран себя называет: проверка, что отрисовался он, а не пустая оболочка. */
  heading?: RegExp;
}

export const PUBLIC_ROUTES: readonly RouteCase[] = [
  { path: "/", as: null },
  { path: "/catalog/tekstil/futbolki", as: null, heading: /Футболки/ },
  { path: "/catalog/tekstil", as: null },
  { path: "/catalog", as: null, heading: /Каталог/ },
  { path: "/catalog/nasosy", as: null, heading: /Насосы/ },
  { path: "/offer/2231", as: null, heading: /Футболки 180/ },
  { path: "/factory/17", as: null, heading: /Волна/ },
  { path: "/factories", as: null },
  { path: "/compare", as: null },
  { path: "/how-it-works", as: null },
  { path: "/for-factories", as: null },
  { path: "/login", as: null, heading: /Вход/ },
  { path: "/register", as: null },
];

export const CUSTOMER_ROUTES: readonly RouteCase[] = [
  { path: "/account/orders", as: "Заказчик" },
  { path: "/account/orders/4812", as: "Заказчик", heading: /4812/ },
  { path: "/account/orders/4790/dispute", as: "Заказчик" },
  { path: "/account/repeat", as: "Заказчик" },
  { path: "/samples", as: "Заказчик" },
  { path: "/favorites", as: "Заказчик" },
  { path: "/documents", as: "Заказчик" },
  { path: "/escrow", as: "Заказчик" },
  { path: "/notifications", as: "Заказчик" },
  { path: "/company", as: "Заказчик" },
  { path: "/order/new?offer=2231&qty=1000", as: "Заказчик" },
  { path: "/order/4811/pay", as: "Заказчик" },
  { path: "/sample/new?offer=2231", as: "Заказчик" },
];

export const FACTORY_ROUTES: readonly RouteCase[] = [
  { path: "/seller", as: "Завод", heading: /Сводка/ },
  { path: "/seller/offers", as: "Завод" },
  { path: "/seller/offers/new/edit", as: "Завод" },
  { path: "/seller/orders", as: "Завод" },
  // 4812 — заказ, который завод видит сразу; 4811 до оплаты в его очередь не попадает
  { path: "/seller/orders/4812", as: "Завод", heading: /4812/ },
  { path: "/seller/samples", as: "Завод" },
  { path: "/capacity", as: "Завод" },
  { path: "/finance", as: "Завод" },
  { path: "/feedback", as: "Завод" },
  { path: "/audit", as: "Завод" },
  { path: "/onboarding/factory", as: "Завод" },
];

export const OPERATOR_ROUTES: readonly RouteCase[] = [
  { path: "/admin", as: "Оператор", heading: /Обзор/ },
  { path: "/admin/moderation", as: "Оператор" },
  { path: "/admin/finance", as: "Оператор" },
  { path: "/admin/disputes", as: "Оператор" },
  { path: "/admin/taxonomy", as: "Оператор" },
  { path: "/admin/ranking", as: "Оператор" },
  { path: "/admin/stuck", as: "Оператор", heading: /Зависшие/ },
  { path: "/admin/overdue-tranches", as: "Оператор", heading: /Просроченные транши/ },
  { path: "/admin/delivery", as: "Оператор", heading: /Доставка/ },
];

export const ALL_ROUTES: readonly RouteCase[] = [
  ...PUBLIC_ROUTES,
  ...CUSTOMER_ROUTES,
  ...FACTORY_ROUTES,
  ...OPERATOR_ROUTES,
];
