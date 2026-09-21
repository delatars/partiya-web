import type { Me } from "@partiya/api-contracts";
import { beforeEach, describe, expect, it } from "vitest";

import { isApiError } from "@/shared/api";
import { DEMO_ORG_IDS, DEMO_USER_IDS } from "@/shared/lib/demo";
import { resetSellerOffers } from "@/shared/mocks";

import { createMockOrdersBackend, type MockOrdersBackend } from "./mock-backend";

/* Кабинет завода и бэк-офис проверяются на ОДНОМ хранилище заказов — иначе главное
   свойство слайсов («подтвердил завод → у заказчика сменился статус») не проверить
   вовсе. Поэтому здесь один backend и подменяемый `me`: роль переключается так же,
   как в браузере — сменой демо-аккаунта. */

let clock = Date.parse("2026-09-21T09:00:00.000Z");
const tick = (ms: number) => {
  clock += ms;
};

const org = (id: string, kind: "customer" | "factory", name: string) => ({
  id,
  kind,
  name,
  inn: "7707083893",
  kpp: "770101001",
  verificationStatus: "verified" as const,
  role: "owner" as const,
  roleTitle: "Владелец",
  createdAt: "2026-03-02T10:00:00.000Z",
});

const ORGS = [
  org(DEMO_ORG_IDS.kora, "customer", "ООО «Кора»"),
  org(DEMO_ORG_IDS.volna, "factory", "ООО «Волна»"),
];

const CUSTOMER: Me = {
  user: {
    id: DEMO_USER_IDS.korableva,
    email: "a.korableva@kora.ru",
    phone: "+79160001234",
    name: "Анна Кораблёва",
    createdAt: "2026-03-02T10:00:00.000Z",
  },
  organizations: ORGS,
  activeOrgId: DEMO_ORG_IDS.kora,
  activeRole: "owner",
};

const FACTORY: Me = { ...CUSTOMER, activeOrgId: DEMO_ORG_IDS.volna };

const OPERATOR: Me & { platformOperator: boolean } = {
  user: {
    id: DEMO_USER_IDS.belova,
    email: "operator@partiya.ru",
    phone: null,
    name: "Н. Белова",
    createdAt: "2026-03-02T10:00:00.000Z",
  },
  organizations: [],
  activeOrgId: null,
  activeRole: null,
  platformOperator: true,
};

/** Чужой завод: своей организации у него нет в фикстурах, заказов «Волны» он не видит. */
const OTHER_FACTORY: Me = {
  ...CUSTOMER,
  organizations: [org("org-other-factory", "factory", "ООО «Меридиан»")],
  activeOrgId: "org-other-factory",
};

let api: MockOrdersBackend;
let me: Me;

function as(next: Me): void {
  me = next;
}

beforeEach(() => {
  clock = Date.parse("2026-09-21T09:00:00.000Z");
  resetSellerOffers();
  me = CUSTOMER;
  api = createMockOrdersBackend({
    now: () => clock,
    storage: null,
    latencyMs: 0,
    getMe: () => Promise.resolve(me),
  });
});

/** Сквозной заказ фикстур: «Кора» → «Волна», 183 400 ₽, ждёт оплаты. */
const ORDER = 4811;
const TOTAL = 18_340_000;
const PAYOUT = 16_872_800;

async function problemOf(work: () => Promise<unknown>): Promise<{ status: number; type?: string }> {
  try {
    await work();
  } catch (error) {
    if (isApiError(error)) return { status: error.status, type: error.problem?.type };
    throw error;
  }
  throw new Error("Ожидалась ошибка, но вызов прошёл");
}

/* ─────────────────────────────── права ─────────────────────────────── */

describe("права кабинета завода", () => {
  it("заказчик не попадает в срез завода — 403, а не пустой список", async () => {
    as(CUSTOMER);
    const problem = await problemOf(() => api.listSellerOrders());
    expect(problem.status).toBe(403);
    expect(problem.type).toBe("https://partiya.ru/problems/seller/not-a-factory");
  });

  it("заказчик не может подать заводскую команду", async () => {
    as(CUSTOMER);
    expect((await problemOf(() => api.confirmSellerOrder(ORDER, "k"))).status).toBe(403);
    expect(
      (await problemOf(() => api.reportSellerProgress(ORDER, { stage: "sewn", done: 1, total: 2 })))
        .status,
    ).toBe(403);
  });

  it("завод видит только свои заказы; чужой неотличим от несуществующего", async () => {
    as(FACTORY);
    const list = await api.listSellerOrders();
    expect(list.items.length).toBeGreaterThan(0);
    // все выданные заказы — «Волны»
    expect(list.items.every((item) => item.sellerStage !== null)).toBe(true);

    as(OTHER_FACTORY);
    const foreign = await api.listSellerOrders();
    expect(foreign.items).toHaveLength(0);
    const problem = await problemOf(() => api.getSellerOrder(4812));
    expect(problem.status).toBe(404);
  });

  it("завод не видит неоплаченный заказ: до денег заказа для него не существует", async () => {
    as(FACTORY);
    const list = await api.listSellerOrders();
    expect(list.items.some((item) => item.id === ORDER)).toBe(false);
    expect((await problemOf(() => api.getSellerOrder(ORDER))).status).toBe(404);
  });

  it("оператор видит все заказы и очереди, а не только свои", async () => {
    as(OPERATOR);
    const finance = await api.getAdminFinance();
    expect(finance.tranches.some((row) => row.orderId === ORDER)).toBe(true);
    const overview = await api.getAdminOverview();
    expect(overview.queues.length).toBeGreaterThan(0);
  });

  it("не оператор в бэк-офис не проходит", async () => {
    as(FACTORY);
    const problem = await problemOf(() => api.getAdminOverview());
    expect(problem.status).toBe(403);
    expect(problem.type).toBe("https://partiya.ru/problems/admin/not-an-operator");
  });
});

/* ─────────────────────────────── сквозной жизненный цикл ─────────────────────────────── */

describe("жизненный цикл заказа через три роли", () => {
  it("оператор подтвердил поступление → завод провёл этапы → заказчик принял → выплата", async () => {
    // 1. заказчик видит выставленный счёт
    as(CUSTOMER);
    const initial = await api.getOrder(ORDER);
    expect(initial.status).toBe("awaiting_payment");
    expect(initial.quote.total).toBe(TOTAL);

    // 2. оператор подтверждает поступление денег (ручной провайдер расчётов, Q-190)
    as(OPERATOR);
    const finance = await api.getAdminFinance();
    const tranche = finance.tranches.find((row) => row.orderId === ORDER);
    expect(tranche).toBeDefined();
    await api.confirmTrancheFunds(tranche?.trancheId ?? "", {}, "funds-1");

    as(CUSTOMER);
    expect((await api.getOrder(ORDER)).status).toBe("awaiting_confirmation");

    // 3. завод видит заказ во вкладке «Новые» и подтверждает
    as(FACTORY);
    const queue = await api.listSellerOrders({ stage: "new" });
    expect(queue.items.some((item) => item.id === ORDER)).toBe(true);
    const confirmed = await api.confirmSellerOrder(ORDER, "confirm-1");
    expect(confirmed.status).toBe("confirmed");

    as(CUSTOMER);
    expect((await api.getOrder(ORDER)).status).toBe("confirmed");

    // 4. завод отправляет макет технологу, заказчик согласовывает
    as(FACTORY);
    await api.advanceSellerStage(ORDER, { command: "start_artwork_review" });
    as(CUSTOMER);
    expect((await api.getOrder(ORDER)).status).toBe("artwork_review");
    await api.approveArtwork(ORDER);
    expect((await api.getOrder(ORDER)).status).toBe("materials");

    // 5. производство, прогресс и фотоотчёт
    as(FACTORY);
    await api.advanceSellerStage(ORDER, { command: "materials_purchased" });
    const progressed = await api.reportSellerProgress(ORDER, {
      stage: "sewn",
      done: 650,
      total: 1000,
    });
    expect(progressed.progress.find((row) => row.id === "sewn")?.done).toBe(650);

    const upload = await api.requestPhotoReportUpload(ORDER, {
      fileName: "sewing.jpg",
      contentType: "image/jpeg",
      size: 1024,
    });
    await api.publishPhotoReport(ORDER, {
      fileIds: [upload.fileId],
      caption: "Пошив, 1-я линия",
    });

    as(CUSTOMER);
    const tracked = await api.getOrder(ORDER);
    expect(tracked.tracking?.photoCount ?? 0).toBeGreaterThan(0);
    expect(tracked.tracking?.progress.some((row) => row.done === 650)).toBe(true);

    // 6. контроль качества и отгрузка; доставку отмечает система (Q-S1)
    as(FACTORY);
    await api.advanceSellerStage(ORDER, { command: "start_quality_control" });
    tick(60_000);
    const shipped = await api.advanceSellerStage(ORDER, { command: "ship" });
    expect(shipped.status).toBe("acceptance");

    // 7. заказчик принимает партию
    as(CUSTOMER);
    const accepted = await api.acceptOrder(ORDER, {}, "accept-1");
    expect(accepted.status).toBe("completed");

    // 8. у завода появилась выплата 168 728 ₽ при заказе 183 400 ₽
    as(FACTORY);
    const payouts = await api.listSellerPayouts();
    const payout = payouts.items.find((row) => row.orderId === ORDER);
    expect(payout?.amount).toBe(TOTAL);
    expect(payout?.payoutAmount).toBe(PAYOUT);
    expect(payout?.feeAmount).toBe(TOTAL - PAYOUT);

    const summary = await api.getSellerFinanceSummary();
    expect(summary.paidTotal).toBeGreaterThanOrEqual(PAYOUT);

    // 9. УПД подписан заказчиком — без подписи выплата у оператора заблокирована
    as(CUSTOMER);
    as(OPERATOR);
    const blocked = await api.getAdminFinance();
    expect(blocked.payouts.find((row) => row.orderId === ORDER)?.blocker).toBe(
      "УПД не подписан заказчиком",
    );
    as(CUSTOMER);
    const upd = (await api.getOrder(ORDER)).documents.find((doc) => doc.title.startsWith("УПД"));
    await api.signDocument(upd?.id ?? "");

    // 10. оператор проводит выплату — сделка закрывается
    as(OPERATOR);
    const before = await api.getAdminFinance();
    const ready = before.payouts.find((row) => row.orderId === ORDER);
    expect(ready?.ready).toBe(true);
    expect(ready?.amount).toBe(PAYOUT);
    await api.confirmDealPayout(ready?.dealId ?? "", {}, "payout-1");
    const after = await api.getAdminFinance();
    expect(after.payouts.find((row) => row.orderId === ORDER)?.status).toBe("released");
  });

  it("подтверждение и отклонение идемпотентны и проверяют статус", async () => {
    as(OPERATOR);
    const finance = await api.getAdminFinance();
    const tranche = finance.tranches.find((row) => row.orderId === ORDER);
    await api.confirmTrancheFunds(tranche?.trancheId ?? "", {}, "funds-1");
    // повтор с тем же ключом не проводит деньги второй раз
    await api.confirmTrancheFunds(tranche?.trancheId ?? "", {}, "funds-1");

    as(FACTORY);
    await api.confirmSellerOrder(ORDER, "confirm-1");
    const repeated = await api.confirmSellerOrder(ORDER, "confirm-1");
    expect(repeated.status).toBe("confirmed");
    // другим ключом из другого статуса — 409
    const problem = await problemOf(() => api.confirmSellerOrder(ORDER, "confirm-2"));
    expect(problem.status).toBe(409);
  });

  it("отказ завода возвращает деньги заказчику", async () => {
    as(FACTORY);
    const declined = await api.declineSellerOrder(4799, { reason: "нет мощности" }, "decl-1");
    expect(declined.status).toBe("refunded");

    as(OPERATOR);
    const finance = await api.getAdminFinance();
    expect(finance.payouts.some((row) => row.orderId === 4799)).toBe(false);
  });

  it("частичная оплата счёта не принимается (Q-192)", async () => {
    as(OPERATOR);
    const finance = await api.getAdminFinance();
    const tranche = finance.tranches.find((row) => row.orderId === ORDER);
    const problem = await problemOf(() =>
      api.confirmTrancheFunds(tranche?.trancheId ?? "", { amount: 100 }, "funds-partial"),
    );
    expect(problem.status).toBe(422);
    expect(problem.type).toBe("https://partiya.ru/problems/payments/amount_mismatch");
  });

  it("прогресс больше объёма партии — 422 с разбором по полям", async () => {
    as(OPERATOR);
    const finance = await api.getAdminFinance();
    await api.confirmTrancheFunds(
      finance.tranches.find((row) => row.orderId === ORDER)?.trancheId ?? "",
      {},
      "funds-1",
    );
    as(FACTORY);
    await api.confirmSellerOrder(ORDER, "confirm-1");
    const problem = await problemOf(() =>
      api.reportSellerProgress(ORDER, { stage: "sewn", done: 5000, total: 1000 }),
    );
    expect(problem.status).toBe(422);
  });
});

/* ─────────────────────────────── чат сделки ─────────────────────────────── */

describe("чат заказа принадлежит сделке, а не одной стороне", () => {
  it("завод читает и пишет в чат своего заказа, заказчик видит это своим", async () => {
    as(FACTORY);
    await api.sendOrderMessage(4812, { text: "Печать начнём 26.09" }, "msg-f1");
    const factoryView = await api.getOrderMessages(4812);
    expect(factoryView.items.at(-1)?.own).toBe(true);

    as(CUSTOMER);
    const customerView = await api.getOrderMessages(4812);
    expect(customerView.items.at(-1)?.text).toBe("Печать начнём 26.09");
    expect(customerView.items.at(-1)?.own).toBe(false);
  });

  it("посторонний завод в чужой чат не попадает", async () => {
    as(OTHER_FACTORY);
    const problem = await problemOf(() => api.getOrderMessages(4812));
    expect(problem.status).toBe(404);
  });
});

/* ─────────────────────────────── SKU и модерация ─────────────────────────────── */

describe("предложения завода и модерация оператора", () => {
  it("ступени проверяются так же, как в движке котировок — 422 по полю", async () => {
    as(FACTORY);
    const editor = await api.getSellerOfferEditor(null);
    const id = editor.draft.id;
    expect(id).not.toBeNull();

    const problem = await problemOf(() =>
      api.saveSellerOffer(id, {
        title: "Футболки оверсайз 240 г/м²",
        moq: 300,
        tiers: [
          { fromQty: 300, unitPrice: 24_800 },
          // цена на большем объёме выше — движок такой оффер отвергает
          { fromQty: 1000, unitPrice: 26_000 },
        ],
      }),
    );
    expect(problem.status).toBe(422);
    expect(problem.type).toBe("https://partiya.ru/problems/seller/invalid-offer");
  });

  it("исправленные ступени сохраняются, предложение уходит на модерацию и публикуется", async () => {
    as(FACTORY);
    const editor = await api.getSellerOfferEditor(null);
    const id = editor.draft.id ?? 0;
    await api.saveSellerOffer(id, {
      title: "Футболки оверсайз 240 г/м²",
      moq: 300,
      tiers: [
        { fromQty: 300, unitPrice: 24_800 },
        { fromQty: 1000, unitPrice: 22_400 },
      ],
    });
    const submitted = await api.submitSellerOffer(id);
    expect(submitted.offer.status).toBe("moderation");

    as(OPERATOR);
    const queue = await api.listAdminOffers({ tab: "queue" });
    expect(queue.items.some((row) => row.offerId === id)).toBe(true);
    // решение без обоснования не проходит
    expect(
      (await problemOf(() => api.decideAdminOffer(id, { decision: "reject", comment: "  " })))
        .status,
    ).toBe(422);

    await api.decideAdminOffer(id, { decision: "approve", comment: "ок" });

    as(FACTORY);
    const offers = await api.listSellerOffers();
    expect(offers.items.find((row) => row.id === id)?.status).toBe("published");
    expect(offers.items.find((row) => row.id === id)?.listed).toBe(true);
  });
});

/* ─────────────────────────────── спор ─────────────────────────────── */

describe("решение спора оператором", () => {
  it("частичный возврат распределяет эскроу без потери копейки", async () => {
    // заказ 4790 доведён фикстурами до контроля качества; спор открывается из приёмки
    as(CUSTOMER);
    const order = await api.getOrder(4812);
    expect(order.status).toBe("in_production");
    const dispute = await api.openDispute(
      4812,
      {
        reason: "size_mismatch",
        affectedQty: 120,
        description: "Размер L соответствует M по ширине: 52 см вместо 56.",
        remedy: "partial_refund",
      },
      "dispute-1",
    );
    expect(dispute.status).toBe("opened");

    as(OPERATOR);
    const card = await api.getAdminDispute(4812);
    const partial = card.options.find((option) => option.resolution === "partial_refund");
    expect(partial).toBeDefined();
    expect(
      (partial?.customerAmount ?? 0) + (partial?.factoryAmount ?? 0) + (partial?.fee ?? 0),
    ).toBe(card.escrowAmount);

    const resolved = await api.resolveAdminDispute(
      4812,
      {
        resolution: "partial_refund",
        inFavorOf: "customer",
        amount: partial?.customerAmount ?? 0,
        comment: "Несоответствие спецификации подтверждено замерами.",
      },
      "resolve-1",
    );
    expect(resolved.decision?.resolution).toBe("partial_refund");

    as(CUSTOMER);
    const after = await api.getOrder(4812);
    expect(after.dispute?.status).toBe("resolved");
    expect(after.status).toBe("completed");
  });

  it("решение без обоснования не проходит", async () => {
    as(CUSTOMER);
    await api.openDispute(
      4812,
      { reason: "defects", description: "Брак на партии, 30 изделий", remedy: "rework" },
      "dispute-1",
    );
    as(OPERATOR);
    const problem = await problemOf(() =>
      api.resolveAdminDispute(
        4812,
        { resolution: "rework", inFavorOf: "customer", amount: null, comment: "" },
        "resolve-x",
      ),
    );
    expect(problem.status).toBe(422);
  });
});

/* ─────────────────────────────── мощность ─────────────────────────────── */

describe("план мощности", () => {
  it("резерв подтверждённого заказа уменьшает свободную мощность", async () => {
    as(FACTORY);
    const before = await api.getCapacityPlan();
    expect(before.cells.length).toBeGreaterThan(0);
    expect(before.summary.totalUnits).toBeGreaterThan(0);
    // резервы приходят из настоящих заказов, а не из фикстур плана
    expect(before.reservations.length).toBeGreaterThan(0);
  });

  it("план нельзя опустить ниже уже занятого", async () => {
    as(FACTORY);
    const plan = await api.getCapacityPlan();
    const busy = plan.cells.find((cell) => cell.hardUnits + cell.softUnits > 0);
    expect(busy).toBeDefined();
    const problem = await problemOf(() =>
      api.updateCapacityPlan({
        cells: [
          {
            lineId: busy?.lineId ?? "line-1",
            weekStart: busy?.weekStart ?? "",
            unitsTotal: 1,
            externalUnits: 0,
          },
        ],
      }),
    );
    expect(problem.status).toBe(422);
    expect(problem.type).toBe("https://partiya.ru/problems/capacity/below-reserved");
  });

  it("сохранение плана пересчитывает «свободно» и недозагруз", async () => {
    as(FACTORY);
    const plan = await api.getCapacityPlan();
    const week = plan.weeks.find((item) => !item.past)?.weekStart ?? "";
    const updated = await api.updateCapacityPlan({
      cells: [{ lineId: "line-2", weekStart: week, unitsTotal: 4000, externalUnits: 0 }],
    });
    const cell = updated.cells.find((item) => item.lineId === "line-2" && item.weekStart === week);
    expect(cell?.unitsTotal).toBe(4000);
    expect(cell?.freeUnits).toBe(4000);
    expect(cell?.freePct).toBe(100);
  });
});
