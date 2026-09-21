import { beforeEach, describe, expect, it } from "vitest";

import { isApiError } from "@/shared/api";
import { DEMO_ORG_IDS } from "@/shared/lib/demo";

import { createMockAuthBackend, maskRecipient, MOCK_CODE } from "./mock-backend";

/* Мок проверяется как настоящий сервис: важны не «данные вернулись», а статусы и тексты,
   на которые опираются экраны. Часы свои — TTL и троттлинг иначе не проверить. */

const CUSTOMER = "+79160001234";
const FACTORY = "+79150002233";
const OPERATOR = "operator@partiya.ru";

let clock = Date.parse("2026-09-20T09:00:00Z");
const tick = (ms: number) => {
  clock += ms;
};

function backend() {
  return createMockAuthBackend({ now: () => clock, storage: null, latencyMs: 0 });
}

async function statusOf(work: Promise<unknown>): Promise<{ status: number; detail?: string }> {
  try {
    await work;
    throw new Error("ожидали отказ, а запрос прошёл");
  } catch (error) {
    if (!isApiError(error)) throw error;
    return { status: error.status, detail: error.problem?.detail };
  }
}

beforeEach(() => {
  clock = Date.parse("2026-09-20T09:00:00Z");
});

describe("полный сценарий входа", () => {
  it("код → верификация → /me → выход", async () => {
    const api = backend();

    expect(await statusOf(api.getMe())).toMatchObject({ status: 401 });

    const requested = await api.requestCode({ identifier: "8 (916) 000-12-34" });
    expect(requested).toMatchObject({
      channel: "sms",
      sentTo: "+7 916 ···-12-34",
      expiresIn: 300,
      resendAfter: 60,
      codeLength: 6,
    });

    const verified = await api.verifyCode({ identifier: CUSTOMER, code: MOCK_CODE });
    expect(verified.user.name).toBe("Анна Кораблёва");
    // макет login-otp: номер привязан к двум компаниям, активна первая
    expect(verified.organizations.map((org) => org.kind)).toEqual(["customer", "factory"]);
    expect(verified.activeOrgId).toBe(DEMO_ORG_IDS.kora);
    expect(verified.activeRole).toBe("owner");
    expect(verified.organizations[1]?.roleTitle).toBe("Закупщик");

    expect((await api.getMe()).user.id).toBe(verified.user.id);

    await api.logout();
    expect(await statusOf(api.getMe())).toMatchObject({ status: 401 });
  });

  it("почта и телефон — один и тот же человек по разным каналам", async () => {
    const api = backend();
    await api.requestCode({ identifier: "A.Korableva@Kora.RU" });
    const me = await api.verifyCode({ identifier: "a.korableva@kora.ru", code: MOCK_CODE });
    expect(me.user.phone).toBe(CUSTOMER);
  });

  it("код принимается с пробелами и дефисами", async () => {
    const api = backend();
    await api.requestCode({ identifier: CUSTOMER });
    await expect(
      api.verifyCode({ identifier: CUSTOMER, code: " 0 0 0-0 0 0 " }),
    ).resolves.toBeDefined();
  });

  it("незнакомый адресат заводит пользователя без организаций", async () => {
    const api = backend();
    await api.requestCode({ identifier: "+79990001122" });
    const me = await api.verifyCode({ identifier: "+79990001122", code: MOCK_CODE });
    expect(me.organizations).toHaveLength(0);
    expect(me.activeOrgId).toBeNull();
  });
});

describe("неверный код и лимит попыток", () => {
  it("неверный код — 400 с одним и тем же текстом", async () => {
    const api = backend();
    await api.requestCode({ identifier: CUSTOMER });
    expect(await statusOf(api.verifyCode({ identifier: CUSTOMER, code: "123456" }))).toEqual({
      status: 400,
      detail: "код неверный или устарел",
    });
  });

  it("код, который не запрашивали, неотличим от неверного", async () => {
    const api = backend();
    expect(await statusOf(api.verifyCode({ identifier: CUSTOMER, code: MOCK_CODE }))).toEqual({
      status: 400,
      detail: "код неверный или устарел",
    });
  });

  it("на пятой ошибке попытки кончаются и код мёртв", async () => {
    const api = backend();
    await api.requestCode({ identifier: CUSTOMER });
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      expect(
        await statusOf(api.verifyCode({ identifier: CUSTOMER, code: "111111" })),
      ).toMatchObject({ status: 400 });
    }
    expect(await statusOf(api.verifyCode({ identifier: CUSTOMER, code: "111111" }))).toEqual({
      status: 409,
      detail: "попытки исчерпаны, запросите новый код",
    });
    // правильный код после исчерпания уже не спасает
    expect(await statusOf(api.verifyCode({ identifier: CUSTOMER, code: MOCK_CODE }))).toMatchObject(
      { status: 409 },
    );
  });

  it("истёкший код не принимается", async () => {
    const api = backend();
    await api.requestCode({ identifier: CUSTOMER });
    tick(5 * 60_000);
    expect(await statusOf(api.verifyCode({ identifier: CUSTOMER, code: MOCK_CODE }))).toMatchObject(
      { status: 400 },
    );
  });

  it("использованный код повторно не работает", async () => {
    const api = backend();
    await api.requestCode({ identifier: CUSTOMER });
    await api.verifyCode({ identifier: CUSTOMER, code: MOCK_CODE });
    expect(await statusOf(api.verifyCode({ identifier: CUSTOMER, code: MOCK_CODE }))).toMatchObject(
      { status: 400 },
    );
  });

  it("кривой идентификатор — 400 в терминах введённого", async () => {
    const api = backend();
    expect(await statusOf(api.requestCode({ identifier: "звоните" }))).toMatchObject({
      status: 400,
      detail: "телефон должен быть российским: +7 и 10 цифр",
    });
    expect(await statusOf(api.requestCode({ identifier: "a@kora" }))).toMatchObject({
      status: 400,
      detail: "почта должна быть вида name@example.com",
    });
  });
});

describe("троттлинг повторной отправки", () => {
  it("минута между отправками, с обратным отсчётом в тексте", async () => {
    const api = backend();
    await api.requestCode({ identifier: CUSTOMER });

    tick(18_000);
    const refused = await statusOf(api.requestCode({ identifier: CUSTOMER }));
    expect(refused.status).toBe(409);
    expect(refused.detail).toBe("повторная отправка кода возможна через 42 с");

    tick(42_000);
    await expect(api.requestCode({ identifier: CUSTOMER })).resolves.toBeDefined();
  });

  it("троттлинг у каждого адресата свой", async () => {
    const api = backend();
    await api.requestCode({ identifier: CUSTOMER });
    await expect(api.requestCode({ identifier: FACTORY })).resolves.toBeDefined();
  });
});

describe("организации", () => {
  async function loggedIn(identifier = CUSTOMER) {
    const api = backend();
    await api.requestCode({ identifier });
    await api.verifyCode({ identifier, code: MOCK_CODE });
    return api;
  }

  it("переключение активной организации меняет роль", async () => {
    const api = await loggedIn();
    const switched = await api.switchActiveOrg(DEMO_ORG_IDS.volna);
    expect(switched.activeOrgId).toBe(DEMO_ORG_IDS.volna);
    expect(switched.activeRole).toBe("manager");
  });

  it("чужая организация — 403, а не 404", async () => {
    const api = await loggedIn(FACTORY);
    expect(await statusOf(api.switchActiveOrg(DEMO_ORG_IDS.kora))).toMatchObject({ status: 403 });
  });

  it("новая организация создаётся, делает создателя владельцем и становится активной", async () => {
    const api = backend();
    await api.requestCode({ identifier: "+79990001122" });
    await api.verifyCode({ identifier: "+79990001122", code: MOCK_CODE });

    const org = await api.createOrg({
      kind: "factory",
      name: "ООО «Северный шов»",
      inn: "7736207543",
      kpp: "773601001",
    });
    expect(org).toMatchObject({
      kind: "factory",
      role: "owner",
      roleTitle: "Владелец",
      // KYB нет: у новой организации статус всегда pending
      verificationStatus: "pending",
    });

    const me = await api.getMe();
    expect(me.activeOrgId).toBe(org.id);
    expect(me.organizations).toHaveLength(1);
  });

  it("ИНН и КПП проверяются так же, как на бэке", async () => {
    const api = backend();
    await api.requestCode({ identifier: "+79990001122" });
    await api.verifyCode({ identifier: "+79990001122", code: MOCK_CODE });

    const base = { kind: "customer" as const, name: "ООО «Кора»", inn: "7707083893" };
    // ИНН из макета не проходит контрольную сумму
    expect(await statusOf(api.createOrg({ ...base, inn: "7701234567" }))).toMatchObject({
      status: 400,
    });
    expect(
      await statusOf(api.createOrg({ ...base, inn: "770123456703", kpp: "770101001" })),
    ).toMatchObject({ status: 400 });
    // тот же ИНН и тот же вид — 409
    expect(await statusOf(api.createOrg(base))).toMatchObject({ status: 409 });
    // тот же ИНН, но другой вид — можно: одно юрлицо бывает и заказчиком, и заводом
    await expect(api.createOrg({ ...base, kind: "factory" })).resolves.toBeDefined();
  });

  it("анониму создавать организацию нельзя", async () => {
    expect(
      await statusOf(backend().createOrg({ kind: "customer", name: "X", inn: "7707083893" })),
    ).toMatchObject({ status: 401 });
  });
});

describe("сеансы", () => {
  it("свой сеанс помечен current, чужой отозвать нельзя", async () => {
    const api = backend();
    await api.requestCode({ identifier: CUSTOMER });
    await api.verifyCode({ identifier: CUSTOMER, code: MOCK_CODE });

    const { items } = await api.listAuthSessions();
    expect(items).toHaveLength(1);
    expect(items[0]?.current).toBe(true);

    expect(await statusOf(api.revokeAuthSession("чужой"))).toMatchObject({ status: 404 });
    await api.revokeAuthSession(items[0]?.id ?? "");
    expect(await statusOf(api.getMe())).toMatchObject({ status: 401 });
  });
});

describe("оператор платформы", () => {
  it("входит без организаций и помечен расширенным полем", async () => {
    const api = backend();
    await api.requestCode({ identifier: OPERATOR });
    const me = await api.verifyCode({ identifier: OPERATOR, code: MOCK_CODE });
    expect(me.organizations).toHaveLength(0);
    expect((me as { platformOperator?: boolean }).platformOperator).toBe(true);
  });
});

describe("маскирование адресата", () => {
  it("показывает достаточно, чтобы узнать, и мало, чтобы использовать", () => {
    expect(maskRecipient("+79160001234")).toBe("+7 916 ···-12-34");
    expect(maskRecipient("a.korableva@kora.ru")).toBe("a.···@kora.ru");
    expect(maskRecipient("ab@kora.ru")).toBe("ab···@kora.ru");
  });
});
