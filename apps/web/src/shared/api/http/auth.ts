import type {
  AuthSessionList,
  CodeRequested,
  CreateOrgBody,
  Me,
  Organization,
  RequestCodeBody,
  VerifyCodeBody,
} from "@partiya/api-contracts";

import type { AuthApi } from "../domains/auth";
import type { HttpClient } from "../http-client";

/* Реальный бэк: модуль `iam`, маршруты под /api/v1. Кука сессии ходит сама —
   в HttpClient стоит credentials: "include", тела ошибок разбираются как problem+json. */
export function createAuthHttpApi(client: HttpClient): AuthApi {
  return {
    requestCode(body: RequestCodeBody, signal?: AbortSignal): Promise<CodeRequested> {
      return client.post<CodeRequested>("/auth/code", { body, signal });
    },
    verifyCode(body: VerifyCodeBody, signal?: AbortSignal): Promise<Me> {
      return client.post<Me>("/auth/verify", { body, signal });
    },
    logout(): Promise<void> {
      return client.post<void>("/auth/logout");
    },
    getMe(signal?: AbortSignal): Promise<Me> {
      return client.get<Me>("/me", { signal });
    },
    switchActiveOrg(orgId: string): Promise<Me> {
      return client.post<Me>("/me/active-org", { body: { orgId } });
    },
    listAuthSessions(signal?: AbortSignal): Promise<AuthSessionList> {
      return client.get<AuthSessionList>("/me/sessions", { signal });
    },
    revokeAuthSession(sessionId: string): Promise<void> {
      return client.request<void>("DELETE", `/me/sessions/${encodeURIComponent(sessionId)}`);
    },
    createOrg(body: CreateOrgBody): Promise<Organization> {
      return client.post<Organization>("/orgs", { body });
    },
  };
}
