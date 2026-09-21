/* Домен «Вход, организации и роли».

   Написано руками строго по DTO бэка — partiya-api/crates/iam/src/http/dto.rs.
   Каждое поле здесь имеет там пару; ничего «на будущее» не добавляем: лишнее поле в этом
   файле выглядит как обещание бэка, которого он не давал.

   Время — строка RFC 3339 в UTC («2026-09-20T18:00:00Z»), как сериализует `mod rfc3339`.
   Идентификаторы — UUID строкой (`kernel::UserId`/`OrgId` объявлены `#[serde(transparent)]`).
   Option<T> в Rust без `skip_serializing_if` приезжает как `null`, поэтому здесь `| null`,
   а не `?`. */

/** Канал доставки кода: определяется видом идентификатора, отдельным полем не передаётся. */
export type AuthChannel = "sms" | "email";

/** `POST /auth/code` — одно поле «телефон или рабочая почта», как на экране `login`. */
export interface RequestCodeBody {
  identifier: string;
}

/** `202` на `POST /auth/code`. Ответ не зависит от того, есть ли такой пользователь. */
export interface CodeRequested {
  channel: AuthChannel;
  /** Замаскированный адресат: «+7 916 ···-12-34», «a.···@kora.ru». */
  sentTo: string;
  /** Сколько секунд живёт код. */
  expiresIn: number;
  /** Через сколько секунд доступна повторная отправка — таймер «0:42» на экране `login-otp`. */
  resendAfter: number;
  /** Сколько клеток рисовать в поле ввода. */
  codeLength: number;
}

/** `POST /auth/verify`. Бэк сам вычищает из кода всё, кроме цифр. */
export interface VerifyCodeBody {
  identifier: string;
  code: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  createdAt: string;
}

/** Роль организации на площадке. Одно юрлицо может быть и тем, и другим — это две организации. */
export type OrgKind = "customer" | "factory";

/** Статус проверки по ЕГРЮЛ; меняет бэк-офис, не пользователь. Новая организация — `pending`. */
export type OrgVerificationStatus = "pending" | "verified" | "rejected";

/** Роль пользователя внутри организации — `iam::Role`. */
export type OrgRole = "owner" | "manager" | "technologist" | "accountant" | "viewer";

export interface Organization {
  id: string;
  kind: OrgKind;
  name: string;
  inn: string;
  kpp: string | null;
  verificationStatus: OrgVerificationStatus;
  /** Роль текущего пользователя в этой организации. */
  role: OrgRole;
  /** Человеческое название роли — его считает бэк (`Role::title`), фронт не переводит. */
  roleTitle: string;
  createdAt: string;
}

/** Тело `GET /me` и `POST /auth/verify` — одно и то же, чтобы разбирать одним кодом. */
export interface Me {
  user: AuthUser;
  organizations: Organization[];
  /** `null`, пока пользователь не состоит ни в одной организации. */
  activeOrgId: string | null;
  /** Роль в активной организации; `null` вместе с `activeOrgId`. */
  activeRole: OrgRole | null;
}

/** `POST /me/active-org`. */
export interface SwitchOrgBody {
  orgId: string;
}

/** Элемент `GET /me/sessions` — экран «Безопасность». */
export interface AuthSession {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
  /** Сеанс, из которого пришёл этот запрос. */
  current: boolean;
}

export interface AuthSessionList {
  items: AuthSession[];
}

/** `POST /orgs` — регистрация организации (экран `register`). КПП есть только у юрлиц. */
export interface CreateOrgBody {
  kind: OrgKind;
  name: string;
  inn: string;
  kpp?: string | null;
}
