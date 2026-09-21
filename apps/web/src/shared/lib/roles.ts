import type { OrgRole } from "@partiya/api-contracts";

/* Роли и права. Зеркало `partiya-api/crates/iam/src/domain/role.rs` — таблица
   «Что может каждая роль» с экрана `account.company` макета.

   Зачем копия на фронте: показать таблицу прав и спрятать кнопку, которой человек всё равно
   не сможет воспользоваться. Решает доступ всегда бэк (`require_permission`); расхождение
   этой таблицы с role.rs — не дыра, а неудобный интерфейс, и ловится тестом рядом. */

export const ROLE_ORDER: readonly OrgRole[] = [
  "owner",
  "manager",
  "technologist",
  "accountant",
  "viewer",
];

/** `Role::title()` бэка. Дублируется, потому что роль показывается и там, где `/me` не спрашивали. */
export const ROLE_TITLES: Record<OrgRole, string> = {
  owner: "Владелец",
  manager: "Закупщик",
  technologist: "Технолог",
  accountant: "Бухгалтер",
  viewer: "Наблюдатель",
};

/** Административный вес, `Role::rank()`. Технолог и бухгалтер намеренно равны. */
const ROLE_RANK: Record<OrgRole, number> = {
  owner: 3,
  manager: 2,
  technologist: 1,
  accountant: 1,
  viewer: 0,
};

export type Permission =
  | "place_orders"
  | "accept_and_dispute"
  | "sign_documents"
  | "view_finance"
  | "manage_organization"
  | "run_production";

/** Строки таблицы «Что может каждая роль» — тексты из макета. */
export const PERMISSION_TITLES: Record<Permission, string> = {
  place_orders: "Оформлять заказы",
  accept_and_dispute: "Принимать партии, открывать споры",
  sign_documents: "Подписывать документы",
  view_finance: "Видеть эскроу и счета",
  manage_organization: "Менять реквизиты и роли",
  run_production: "Вести производство: макеты, прогресс",
};

/** Колонки таблицы в макете: владелец, закупщик, бухгалтер. */
export const PERMISSION_TABLE_ROLES: readonly OrgRole[] = ["owner", "manager", "accountant"];

/** Строки таблицы в макете — без `run_production`: это заводская строка из раздела 10. */
export const PERMISSION_TABLE_ROWS: readonly Permission[] = [
  "place_orders",
  "accept_and_dispute",
  "sign_documents",
  "view_finance",
  "manage_organization",
];

/** «Роль не ниже требуемой» — `Role::at_least`. */
export function atLeast(role: OrgRole, required: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/** `Role::can` — построчная копия match-а из role.rs. */
export function can(role: OrgRole, permission: Permission): boolean {
  switch (role) {
    case "owner":
      return true;
    case "viewer":
      return permission === "view_finance";
    case "manager":
      return (
        permission === "place_orders" ||
        permission === "accept_and_dispute" ||
        permission === "view_finance" ||
        permission === "run_production"
      );
    case "accountant":
      return permission === "sign_documents" || permission === "view_finance";
    case "technologist":
      return permission === "run_production";
  }
}
