import { createDelegatingApiService } from "@/shared/api";
import type { ApiService } from "@/shared/api";

import { createMockAuthBackend } from "./mock-backend";

/* Мок-декоратор домена «Вход». Остальные домены уходят внутрь как есть. */

const backend = createMockAuthBackend();

export const installAuthMocks = (inner: ApiService): ApiService =>
  createDelegatingApiService(inner, {
    requestCode: (body) => backend.requestCode(body),
    verifyCode: (body) => backend.verifyCode(body),
    logout: () => backend.logout(),
    getMe: () => backend.getMe(),
    switchActiveOrg: (orgId) => backend.switchActiveOrg(orgId),
    listAuthSessions: () => backend.listAuthSessions(),
    revokeAuthSession: (sessionId) => backend.revokeAuthSession(sessionId),
    createOrg: (body) => backend.createOrg(body),
  });
