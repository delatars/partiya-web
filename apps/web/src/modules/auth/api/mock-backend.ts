import type {
  AuthSessionList,
  CodeRequested,
  CreateOrgBody,
  Me,
  Organization,
  OrgKind,
  OrgRole,
  RequestCodeBody,
  VerifyCodeBody,
} from "@partiya/api-contracts";

import { ApiError } from "@/shared/api";
import { DEMO_ORG_IDS, DEMO_USER_IDS } from "@/shared/lib/demo";
import { ROLE_TITLES } from "@/shared/lib/roles";

import { isValidInn, looksLikeEmail, normalizeEmail, normalizePhone } from "../lib/schemas";

/* Мок модуля `iam`: тот же контракт, те же статусы, те же тексты ошибок.
   Ценность мока ровно в этом — если экран ведёт себя правильно здесь, он поведёт себя
   правильно и с бэком. Поэтому троттлинг, лимит попыток и TTL кода настоящие, а не
   «всегда успех»; выдуман только сам код, он всегда MOCK_CODE.

   Состояние — в памяти плюс sessionStorage: перезагрузка страницы в dev не должна
   выкидывать из кабинета, а вкладка-инкогнито и запрет хранилища не должны ломать вход,
   поэтому каждое обращение к хранилищу обёрнуто. */

/** В моках код входа всегда один. UI говорит об этом вслух — только при useMocks. */
export const MOCK_CODE = "000000";

const POLICY = {
  length: MOCK_CODE.length,
  ttlMs: 5 * 60_000,
  maxAttempts: 5,
  resendAfterMs: 60_000,
} as const;

const STORAGE_KEY = "partiya.mock.auth.v1";
const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

interface MockUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  createdAt: string;
  /** ⚠ Признака оператора в контракте бэка нет — он живёт только в моках (Q-A1). */
  operator?: boolean;
}

interface MockOrg {
  id: string;
  kind: OrgKind;
  name: string;
  inn: string;
  kpp: string | null;
  verificationStatus: Organization["verificationStatus"];
  createdAt: string;
}

interface MockMembership {
  userId: string;
  orgId: string;
  role: OrgRole;
}

interface MockCode {
  issuedAtMs: number;
  expiresAtMs: number;
  attempts: number;
  consumed: boolean;
}

interface MockSessionRow {
  id: string;
  userId: string;
  activeOrgId: string | null;
  createdAtMs: number;
  lastSeenAtMs: number;
  expiresAtMs: number;
  ip: string | null;
  userAgent: string | null;
}

interface MockState {
  users: MockUser[];
  orgs: MockOrg[];
  members: MockMembership[];
  codes: Record<string, MockCode>;
  sessions: MockSessionRow[];
  /** Эмуляция HttpOnly-куки: какой сеанс «прислал» бы браузер. */
  currentSessionId: string | null;
  seq: number;
}

export interface MockAuthOptions {
  /** Часы. В тестах — свои, чтобы проверять TTL и троттлинг без ожидания. */
  now?: () => number;
  /** Хранилище между перезагрузками; `null` — не сохранять (тесты). */
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  /** Задержка ответа. На экране она нужна (видны блокировки кнопок), в тестах — нет. */
  latencyMs?: number;
}

// ─────────────────────────────── ошибки как у бэка ───────────────────────────────

function problem(status: number, type: string, title: string, detail?: string): ApiError {
  return new ApiError({
    status,
    message: detail ?? title,
    problem: { type, title, status, detail },
  });
}

const badRequest = (detail: string) =>
  problem(400, "/problems/bad-request", "Некорректный запрос", detail);
const conflict = (detail: string) => problem(409, "/problems/conflict", "Конфликт", detail);
const unauthorized = () => problem(401, "/problems/unauthorized", "Требуется вход");
const forbidden = () => problem(403, "/problems/forbidden", "Недостаточно прав");
const notFound = (detail: string) => problem(404, "/problems/not-found", "Не найдено", detail);

/** Единый текст «код не подошёл»: по нему нельзя понять, был ли код вообще выписан. */
const wrongCode = () => badRequest("код неверный или устарел");

// ─────────────────────────────── разбор идентификатора ───────────────────────────────

interface ParsedIdentifier {
  value: string;
  channel: "sms" | "email";
}

function parseIdentifier(raw: string): ParsedIdentifier {
  const trimmed = raw.trim();
  if (trimmed.length === 0) throw badRequest("укажите телефон или рабочую почту");
  if (looksLikeEmail(trimmed)) {
    const email = normalizeEmail(trimmed);
    if (!/^[^\s@]+@[a-z\d][a-z\d.-]*\.[a-z\d-]+$/i.test(email) || email.includes("..")) {
      throw badRequest("почта должна быть вида name@example.com");
    }
    return { value: email, channel: "email" };
  }
  const phone = normalizePhone(trimmed);
  if (phone === undefined) throw badRequest("телефон должен быть российским: +7 и 10 цифр");
  return { value: phone, channel: "sms" };
}

/** «+79160001234» → «+7 916 ···-12-34»; «a.korableva@…» → «a.···@kora.ru». */
export function maskRecipient(value: string): string {
  if (value.includes("@")) {
    const [local = "", domain = ""] = value.split("@");
    const head = local.slice(0, 2);
    return `${head}···@${domain}`;
  }
  const digits = value.replace(/\D/gu, "");
  if (digits.length !== 11) return "···";
  return `+7 ${digits.slice(1, 4)} ···-${digits.slice(7, 9)}-${digits.slice(9)}`;
}

// ─────────────────────────────── стартовые данные ───────────────────────────────

const SEEDED_AT = "2026-03-02T10:00:00.000Z";

function seedState(): MockState {
  const users: MockUser[] = [
    {
      id: DEMO_USER_IDS.korableva,
      email: "a.korableva@kora.ru",
      phone: "+79160001234",
      name: "Анна Кораблёва",
      createdAt: SEEDED_AT,
    },
    {
      id: DEMO_USER_IDS.volkov,
      email: "s.volkov@volna.ru",
      phone: "+79150002233",
      name: "Сергей Волков",
      createdAt: SEEDED_AT,
    },
    {
      id: DEMO_USER_IDS.belova,
      email: "operator@partiya.ru",
      phone: null,
      name: "Н. Белова",
      createdAt: SEEDED_AT,
      operator: true,
    },
  ];

  const orgs: MockOrg[] = [
    {
      id: DEMO_ORG_IDS.kora,
      kind: "customer",
      name: "ООО «Кора»",
      // ИНН из макета (7701234567) контрольную сумму не проходит — здесь настоящий
      inn: "7707083893",
      kpp: "770101001",
      verificationStatus: "verified",
      createdAt: SEEDED_AT,
    },
    {
      id: DEMO_ORG_IDS.volna,
      kind: "factory",
      name: "ООО «Волна»",
      inn: "3702012348",
      kpp: "370201001",
      verificationStatus: "verified",
      createdAt: SEEDED_AT,
    },
  ];

  const members: MockMembership[] = [
    // макет login-otp: «Ваш номер привязан к двум компаниям»
    { userId: DEMO_USER_IDS.korableva, orgId: DEMO_ORG_IDS.kora, role: "owner" },
    { userId: DEMO_USER_IDS.korableva, orgId: DEMO_ORG_IDS.volna, role: "manager" },
    { userId: DEMO_USER_IDS.volkov, orgId: DEMO_ORG_IDS.volna, role: "owner" },
  ];

  return { users, orgs, members, codes: {}, sessions: [], currentSessionId: null, seq: 0 };
}

/** Демо-аккаунты для кнопок быстрого входа. Показываются только при useMocks. */
export const DEMO_LOGINS: readonly { identifier: string; title: string; meta: string }[] = [
  {
    identifier: "+79160001234",
    title: "Заказчик",
    meta: "ООО «Кора», владелец · плюс завод «Волна»",
  },
  { identifier: "+79150002233", title: "Завод", meta: "ООО «Волна», владелец" },
  { identifier: "operator@partiya.ru", title: "Оператор", meta: "бэк-офис платформы" },
];

// ─────────────────────────────── сам мок ───────────────────────────────

export interface MockAuthBackend {
  requestCode(body: RequestCodeBody): Promise<CodeRequested>;
  verifyCode(body: VerifyCodeBody): Promise<Me>;
  logout(): Promise<void>;
  getMe(): Promise<Me>;
  switchActiveOrg(orgId: string): Promise<Me>;
  listAuthSessions(): Promise<AuthSessionList>;
  revokeAuthSession(sessionId: string): Promise<void>;
  createOrg(body: CreateOrgBody): Promise<Organization>;
  /** Только для тестов и дев-инструментов: начать с чистого листа. */
  reset(): void;
}

export function createMockAuthBackend(options: MockAuthOptions = {}): MockAuthBackend {
  const now = options.now ?? (() => Date.now());
  const storage = options.storage === undefined ? safeSessionStorage() : options.storage;
  const latencyMs = options.latencyMs ?? LATENCY_MS;

  let state = load() ?? seedState();

  function load(): MockState | null {
    if (!storage) return null;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      return JSON.parse(raw) as MockState;
    } catch {
      // приватная вкладка, запрет хранилища, чужой формат — просто начинаем заново
      return null;
    }
  }

  function save(): void {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* хранилище недоступно — мок продолжает работать в памяти */
    }
  }

  function nextId(prefix: string): string {
    state.seq += 1;
    // формат бэка — UUID-строка; для мока достаточно устойчивого уникального значения
    return `${prefix}-${String(state.seq).padStart(4, "0")}-${String(now()).slice(-6)}`;
  }

  function currentSession(): MockSessionRow | null {
    const id = state.currentSessionId;
    if (id === null) return null;
    const session = state.sessions.find((row) => row.id === id);
    if (!session) return null;
    if (session.expiresAtMs <= now()) {
      state.currentSessionId = null;
      save();
      return null;
    }
    return session;
  }

  function requireSession(): MockSessionRow {
    const session = currentSession();
    if (!session) throw unauthorized();
    session.lastSeenAtMs = now();
    return session;
  }

  function membershipsOf(userId: string): { org: MockOrg; role: OrgRole }[] {
    return state.members
      .filter((member) => member.userId === userId)
      .flatMap((member) => {
        const org = state.orgs.find((row) => row.id === member.orgId);
        return org ? [{ org, role: member.role }] : [];
      });
  }

  function toOrganization(org: MockOrg, role: OrgRole): Organization {
    return {
      id: org.id,
      kind: org.kind,
      name: org.name,
      inn: org.inn,
      kpp: org.kpp,
      verificationStatus: org.verificationStatus,
      role,
      roleTitle: ROLE_TITLES[role],
      createdAt: org.createdAt,
    };
  }

  function viewOf(session: MockSessionRow): Me {
    const user = state.users.find((row) => row.id === session.userId);
    if (!user) throw unauthorized();
    const memberships = membershipsOf(user.id);
    const organizations = memberships.map(({ org, role }) => toOrganization(org, role));
    const activeOrgId =
      session.activeOrgId !== null && organizations.some((org) => org.id === session.activeOrgId)
        ? session.activeOrgId
        : null;
    const activeRole = organizations.find((org) => org.id === activeOrgId)?.role ?? null;

    const me: Me & { platformOperator?: boolean } = {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        createdAt: user.createdAt,
      },
      organizations,
      activeOrgId,
      activeRole,
    };
    // ⚠ поля нет в контракте: признак оператора платформы фронт берёт отсюда (Q-A1)
    if (user.operator === true) me.platformOperator = true;
    return me;
  }

  return {
    requestCode({ identifier }: RequestCodeBody): Promise<CodeRequested> {
      return respond(latencyMs, () => {
        const parsed = parseIdentifier(identifier);
        const existing = state.codes[parsed.value];
        const elapsed = existing ? now() - existing.issuedAtMs : Number.POSITIVE_INFINITY;
        if (existing && elapsed < POLICY.resendAfterMs) {
          const wait = Math.ceil((POLICY.resendAfterMs - elapsed) / 1000);
          throw conflict(`повторная отправка кода возможна через ${String(wait)} с`);
        }

        state.codes[parsed.value] = {
          issuedAtMs: now(),
          expiresAtMs: now() + POLICY.ttlMs,
          attempts: 0,
          consumed: false,
        };
        save();

        return {
          channel: parsed.channel,
          sentTo: maskRecipient(parsed.value),
          expiresIn: POLICY.ttlMs / 1000,
          resendAfter: POLICY.resendAfterMs / 1000,
          codeLength: POLICY.length,
        };
      });
    },

    verifyCode({ identifier, code }: VerifyCodeBody): Promise<Me> {
      return respond(latencyMs, () => {
        const parsed = parseIdentifier(identifier);
        const digits = [...code].filter((char) => char >= "0" && char <= "9").join("");
        if (digits.length === 0) throw badRequest("введите код из сообщения");

        const record = state.codes[parsed.value];
        if (!record || record.consumed) throw wrongCode();
        if (now() >= record.expiresAtMs) throw wrongCode();
        if (record.attempts >= POLICY.maxAttempts) {
          throw conflict("попытки исчерпаны, запросите новый код");
        }

        // попытка засчитывается до сверки — иначе лимит не работал бы
        record.attempts += 1;
        if (digits !== MOCK_CODE) {
          save();
          throw record.attempts >= POLICY.maxAttempts
            ? conflict("попытки исчерпаны, запросите новый код")
            : wrongCode();
        }
        record.consumed = true;

        // первый успешный вход заводит пользователя: отдельной регистрации человека нет
        let user = state.users.find((row) =>
          parsed.channel === "email" ? row.email === parsed.value : row.phone === parsed.value,
        );
        if (!user) {
          user = {
            id: nextId("user"),
            email: parsed.channel === "email" ? parsed.value : null,
            phone: parsed.channel === "sms" ? parsed.value : null,
            name: null,
            createdAt: new Date(now()).toISOString(),
          };
          state.users.push(user);
        }

        const memberships = membershipsOf(user.id);
        const session: MockSessionRow = {
          id: nextId("session"),
          userId: user.id,
          // активной делаем первую организацию — как `verify_code_and_start_session`
          activeOrgId: memberships[0]?.org.id ?? null,
          createdAtMs: now(),
          lastSeenAtMs: now(),
          expiresAtMs: now() + SESSION_TTL_MS,
          ip: "203.0.113.7",
          userAgent: typeof navigator === "undefined" ? null : navigator.userAgent,
        };
        state.sessions.push(session);
        state.currentSessionId = session.id;
        save();
        return viewOf(session);
      });
    },

    logout(): Promise<void> {
      return respond(latencyMs, () => {
        const session = requireSession();
        state.sessions = state.sessions.filter((row) => row.id !== session.id);
        state.currentSessionId = null;
        save();
      });
    },

    getMe(): Promise<Me> {
      return respond(latencyMs, () => viewOf(requireSession()));
    },

    switchActiveOrg(orgId: string): Promise<Me> {
      return respond(latencyMs, () => {
        const session = requireSession();
        const member = state.members.some(
          (row) => row.userId === session.userId && row.orgId === orgId,
        );
        // 403, а не 404: «не участник» и «нет такой» снаружи выглядят одинаково
        if (!member) throw forbidden();
        session.activeOrgId = orgId;
        save();
        return viewOf(session);
      });
    },

    listAuthSessions(): Promise<AuthSessionList> {
      return respond(latencyMs, () => {
        const session = requireSession();
        const items = state.sessions
          .filter((row) => row.userId === session.userId && row.expiresAtMs > now())
          .map((row) => ({
            id: row.id,
            createdAt: new Date(row.createdAtMs).toISOString(),
            lastSeenAt: new Date(row.lastSeenAtMs).toISOString(),
            expiresAt: new Date(row.expiresAtMs).toISOString(),
            ip: row.ip,
            userAgent: row.userAgent,
            current: row.id === session.id,
          }));
        return { items };
      });
    },

    revokeAuthSession(sessionId: string): Promise<void> {
      return respond(latencyMs, () => {
        const session = requireSession();
        const target = state.sessions.find(
          (row) => row.id === sessionId && row.userId === session.userId,
        );
        // чужая сессия неотличима от несуществующей
        if (!target) throw notFound("сессия");
        state.sessions = state.sessions.filter((row) => row.id !== sessionId);
        if (state.currentSessionId === sessionId) state.currentSessionId = null;
        save();
      });
    },

    createOrg(body: CreateOrgBody): Promise<Organization> {
      return respond(latencyMs, () => {
        const session = requireSession();
        if (body.kind !== "customer" && body.kind !== "factory") {
          throw badRequest(
            `kind должен быть «customer» или «factory», получено «${String(body.kind)}»`,
          );
        }
        const name = body.name.trim();
        if (name.length === 0) throw badRequest("укажите название организации");
        if (name.length > 300) throw badRequest("название длиннее 300 символов");

        const inn = body.inn.trim();
        if (!/^\d+$/.test(inn)) throw badRequest("ИНН: ИНН состоит только из цифр");
        if (inn.length !== 10 && inn.length !== 12) {
          throw badRequest(
            `ИНН: ИНН состоит из 10 цифр (юрлицо) или 12 (ИП), получено ${String(inn.length)}`,
          );
        }
        if (!isValidInn(inn)) {
          throw badRequest("ИНН: контрольная сумма ИНН не сходится — проверьте, нет ли опечатки");
        }

        const kpp = body.kpp?.trim() ?? "";
        if (kpp.length > 0 && inn.length === 12) {
          throw badRequest("КПП: у индивидуального предпринимателя нет КПП");
        }
        if (kpp.length > 0 && !/^\d{9}$/.test(kpp)) throw badRequest("КПП: КПП состоит из 9 цифр");

        if (state.orgs.some((org) => org.inn === inn && org.kind === body.kind)) {
          throw conflict(`организация с ИНН ${inn} и видом «${body.kind}» уже зарегистрирована`);
        }

        const org: MockOrg = {
          id: nextId("org"),
          kind: body.kind,
          name,
          inn,
          kpp: kpp.length > 0 ? kpp : null,
          // KYB нет: у новой организации статус всегда pending
          verificationStatus: "pending",
          createdAt: new Date(now()).toISOString(),
        };
        state.orgs.push(org);
        // создатель становится владельцем: раздавать роли в свежей компании больше некому
        state.members.push({ userId: session.userId, orgId: org.id, role: "owner" });
        // свежую компанию сразу делаем активной
        session.activeOrgId = org.id;
        save();
        return toOrganization(org, "owner");
      });
    },

    reset(): void {
      state = seedState();
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {
        /* нечего чистить */
      }
    },
  };
}

/** Небольшая задержка: на моках должны быть видны блокировки кнопок и скелетоны. */
const LATENCY_MS = 180;

function respond<T>(latencyMs: number, work: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(work());
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    }, latencyMs);
  });
}

function safeSessionStorage(): MockAuthOptions["storage"] {
  try {
    if (typeof sessionStorage === "undefined") return null;
    // доступ к самому объекту в приватной вкладке уже может бросить
    sessionStorage.getItem(STORAGE_KEY);
    return sessionStorage;
  } catch {
    return null;
  }
}
