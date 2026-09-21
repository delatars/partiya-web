import type { SessionArea } from "@/shared/lib/guards";

/* Состав бокового меню кабинета. Порядок и подписи — из макета (custNav / sellerNav),
   набор — из области сессии: заказчик, завод, оператор.

   Счётчики приходят из данных (`GET /me/counters`), а не зашиты константами: придуманная
   «14» в меню у нового аккаунта хуже пустого места. Ноль не рисуется вовсе. */

export interface CabinetNavItem {
  label: string;
  href: string;
  /** Откуда берётся цифра справа от пункта. */
  counter?: CabinetCounterKey;
}

/** Какие счётчики умеет показывать меню. Имена — поля `UserCounters`. */
export type CabinetCounterKey =
  | "ordersAwaitingAction"
  | "documentsAwaitingSignature"
  | "unreadNotifications"
  | "unreadMessages"
  | "openDisputes";

const CUSTOMER_NAV: readonly CabinetNavItem[] = [
  { label: "Заказы", href: "/account/orders", counter: "ordersAwaitingAction" },
  { label: "Повторные партии", href: "/account/repeat" },
  { label: "Образцы", href: "/samples" },
  { label: "Сравнение", href: "/compare" },
  { label: "Избранное", href: "/favorites" },
  { label: "Документы и ЭДО", href: "/documents", counter: "documentsAwaitingSignature" },
  { label: "Эскроу и счета", href: "/escrow" },
  { label: "Компания", href: "/company" },
  { label: "Уведомления", href: "/notifications", counter: "unreadNotifications" },
];

const FACTORY_NAV: readonly CabinetNavItem[] = [
  { label: "Сводка", href: "/seller" },
  { label: "Предложения", href: "/seller/offers" },
  { label: "Заказы", href: "/seller/orders", counter: "ordersAwaitingAction" },
  { label: "Запросы образцов", href: "/seller/samples" },
  { label: "Мощность", href: "/capacity" },
  { label: "Финансы", href: "/finance" },
  { label: "Отзывы и вопросы", href: "/feedback", counter: "unreadMessages" },
  { label: "Аудит и документы", href: "/audit" },
  { label: "Компания", href: "/company" },
];

/** Оператор в кабинет не ходит — у него бэк-офис; сюда он попадает только через «Компания». */
const OPERATOR_NAV: readonly CabinetNavItem[] = [
  { label: "Бэк-офис", href: "/admin" },
  { label: "Уведомления", href: "/notifications", counter: "unreadNotifications" },
];

export function cabinetNav(area: SessionArea | null): readonly CabinetNavItem[] {
  switch (area) {
    case "factory":
      return FACTORY_NAV;
    case "operator":
      return OPERATOR_NAV;
    case "customer":
      return CUSTOMER_NAV;
    default:
      // вошёл, но компании нет: меню пустое, страницу закроет guard
      return [];
  }
}

/** Активен ли пункт. Сравнение точное: «/seller» не подсвечивается на «/seller/offers». */
export function isNavItemActive(item: CabinetNavItem, pathname: string): boolean {
  return item.href === pathname;
}
