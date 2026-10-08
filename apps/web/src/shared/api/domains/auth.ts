import type {
  AuthSessionList,
  CodeRequested,
  CreateOrgBody,
  Me,
  Organization,
  OrgRequisites,
  RequestCodeBody,
  UpdateOrgRequisitesBody,
  VerifyCodeBody,
} from "@partiya/api-contracts";

/** Домен «Вход, организации и сессия» — модуль `iam` бэка.
 *
 * Сессия живёт в HttpOnly-куке: фронт её не читает и не хранит. Единственный способ
 * узнать, вошли ли мы, — спросить `getMe()`; 401 здесь нормальный ответ «аноним»,
 * и превращает его в `null` слой запросов (queries/auth.ts), а не транспорт. */
export interface AuthApi {
  /** `POST /auth/code` → 202. Троттлинг повторной отправки — 409. */
  requestCode(body: RequestCodeBody, signal?: AbortSignal): Promise<CodeRequested>;
  /** `POST /auth/verify` → 200 + `Set-Cookie`. Неверный код — 400, кончились попытки — 409. */
  verifyCode(body: VerifyCodeBody, signal?: AbortSignal): Promise<Me>;
  /** `POST /auth/logout` → 204. */
  logout(): Promise<void>;
  /** `GET /me` → 200 либо 401 у анонима. */
  getMe(signal?: AbortSignal): Promise<Me>;
  /** `POST /me/active-org` → 200 с новым `/me`. Чужая организация — 403. */
  switchActiveOrg(orgId: string): Promise<Me>;
  /** `GET /me/sessions` → 200. */
  listAuthSessions(signal?: AbortSignal): Promise<AuthSessionList>;
  /** `DELETE /me/sessions/{id}` → 204; чужая или несуществующая — 404. */
  revokeAuthSession(sessionId: string): Promise<void>;
  /** `POST /orgs` → 201. Тот же ИНН и вид — 409. */
  createOrg(body: CreateOrgBody): Promise<Organization>;
  /** `GET /orgs/{id}/requisites` → 200 (DECISIONS.md, п. 24). Только владельцу и
      бухгалтеру; остальным ролям и чужим — одинаковый 403. */
  getOrgRequisites(orgId: string, signal?: AbortSignal): Promise<OrgRequisites>;
  /** `PUT /orgs/{id}/requisites` → 200. Реквизиты целиком: не присланное поле стирается.
      Ошибки — 422 `orgs/requisites-invalid` с `errors` по полям. */
  updateOrgRequisites(orgId: string, body: UpdateOrgRequisitesBody): Promise<OrgRequisites>;
}
