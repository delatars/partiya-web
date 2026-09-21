import type { Me, OrgKind, Organization } from "@partiya/api-contracts";

/* Чистые правила доступа: какой раздел чего требует, куда возвращать после входа, что
   считать своей ссылкой. Всё без React и без роутера — маршруты только применяют результат
   в beforeLoad, а тесты проверяют правила напрямую. */

/** Кабинет заказчика, кабинет завода или бэк-офис — три несовместимых набора разделов. */
export type SessionArea = "customer" | "factory" | "operator";

/** Чего требует раздел кабинета от активной организации. */
export type OrgRequirement = OrgKind | "any";

/** Разделы завода из карты маршрутов 7.3 (меню сайдбара `FACTORY_NAV`). */
const FACTORY_PREFIXES = ["/seller", "/capacity", "/finance", "/feedback", "/audit"];

/** Разделы заказчика (`CUSTOMER_NAV`). «Компания» и «Уведомления» есть у обоих.

    `/order` и `/sample` — это оформление: оно вне кабинета, но требует того же,
    что и кабинет заказчика. `/order` не перехватывает `/account/orders` — сравнение
    идёт по целому сегменту пути. */
const CUSTOMER_PREFIXES = [
  "/account",
  "/samples",
  "/favorites",
  "/documents",
  "/escrow",
  "/order",
  "/sample",
];

function hasPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname === prefix,
  );
}

/** Какой вид организации нужен, чтобы этот путь кабинета имел смысл. */
export function requiredOrgKind(pathname: string): OrgRequirement {
  if (hasPrefix(pathname, FACTORY_PREFIXES)) return "factory";
  if (hasPrefix(pathname, CUSTOMER_PREFIXES)) return "customer";
  return "any";
}

/** Активная организация из `/me`; `null` — человек вошёл, но компании ещё нет. */
export function activeOrgOf(me: Me | null | undefined): Organization | null {
  if (!me) return null;
  return me.organizations.find((org) => org.id === me.activeOrgId) ?? null;
}

/** Признак оператора платформы.
 *
 * ⚠ В контракте бэка его нет: `/me` отдаёт только пользователя, организации и роль в них
 * (см. отчёт, вопрос Q-A1). Пока фронт читает необязательное расширение, которое ставят
 * моки; настоящий `/me` его не присылает, и бэк-офис остаётся закрытым для всех. */
export function isOperator(me: Me | null | undefined): boolean {
  if (!me) return false;
  const extended = me as Me & { platformOperator?: unknown };
  return extended.platformOperator === true;
}

/** Где человек «дома»: бэк-офис у оператора, сводка у завода, заказы у заказчика. */
export function areaOf(me: Me | null | undefined): SessionArea | null {
  if (!me) return null;
  if (isOperator(me)) return "operator";
  const active = activeOrgOf(me);
  if (!active) return null;
  return active.kind === "factory" ? "factory" : "customer";
}

/** Куда отправить после входа, если возвращаться некуда. */
export function homePathFor(me: Me | null | undefined): string {
  switch (areaOf(me)) {
    case "operator":
      return "/admin";
    case "factory":
      return "/seller";
    case "customer":
      return "/account/orders";
    default:
      // вошёл, но компании нет — единственный осмысленный следующий шаг
      return me ? "/register" : "/login";
  }
}

/** Есть ли у пользователя организация нужного вида (пусть и не активная). */
export function orgOfKind(me: Me | null | undefined, kind: OrgKind): Organization | null {
  return me?.organizations.find((org) => org.kind === kind) ?? null;
}

/** Пускать ли в раздел кабинета с такой активной организацией. */
export function canEnterCabinet(me: Me | null | undefined, pathname: string): boolean {
  const requirement = requiredOrgKind(pathname);
  const active = activeOrgOf(me);
  if (requirement === "any") return active !== null || isOperator(me);
  return active?.kind === requirement;
}

/** Пускать ли в оформление партии, к счёту и к заказу образца.
 *
 * Условие то же, что у кабинета заказчика: активная организация должна быть заказчиком.
 * Оператор платформы сюда не ходит — у него нет своей компании, от имени которой
 * заключается сделка. */
export function canEnterCheckout(me: Me | null | undefined): boolean {
  return activeOrgOf(me)?.kind === "customer";
}

/** Пускать ли по произвольному пути приложения: кабинеты — по виду организации,
    бэк-офис — по признаку оператора, всё остальное публично. */
export function canEnter(me: Me | null | undefined, pathname: string): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return isOperator(me);
  if (requiredOrgKind(pathname) === "any") return true;
  return canEnterCabinet(me, pathname);
}

/** Возврат после входа: принимаем только свой относительный путь.
 *
 * Отсекаются абсолютные URL («https://…», «//evil.example»), схемы («javascript:…»),
 * обратный слэш сразу после первого («/\evil.example» часть браузеров читает как
 * protocol-relative) и управляющие символы. Всё, что не прошло, просто исчезает:
 * непонятный адрес возврата — это всегда чужой адрес возврата. */
export function safeRedirect(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  if (value.length === 0 || value.length > 2000) return undefined;
  if (!value.startsWith("/")) return undefined;
  if (value.startsWith("//") || value.startsWith("/\\")) return undefined;
  // eslint-disable-next-line no-control-regex -- \r\n и \0 в Location ломают навигацию
  if (/[\u0000-\u001f\u007f]/.test(value)) return undefined;
  return value;
}

/** Куда вести после успешного входа: на запрошенную страницу либо домой. */
export function postLoginPath(me: Me | null | undefined, redirect: unknown): string {
  const target = safeRedirect(redirect);
  if (target === undefined) return homePathFor(me);
  // на страницы входа возвращать нельзя — получилась бы петля
  if (target === "/login" || target.startsWith("/login?") || target === "/register") {
    return homePathFor(me);
  }
  // вернуть заказчика в кабинет завода нельзя: guard тут же выкинет его обратно
  if (!canEnter(me, pathnameOf(target))) return homePathFor(me);
  return target;
}

/** Путь без query и хэша. `URL` с фиктивной базой — он же разбирает и «/a?b=1#c». */
function pathnameOf(target: string): string {
  try {
    return new URL(target, "http://localhost").pathname;
  } catch {
    return target;
  }
}
