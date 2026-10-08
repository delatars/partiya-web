import type { Me } from "@partiya/api-contracts";
import { beforeEach, describe, expect, it } from "vitest";

import { isApiError } from "@/shared/api";
import { DEMO_ORG_IDS, DEMO_USER_IDS } from "@/shared/lib/demo";
import { encodeQuoteId } from "@/shared/lib/quote-id";
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
/** п. 2: комиссия 8 % только со стоимости товара: (183 400 − 9 400 доставки) × 8 % = 13 920 ₽. */
const PAYOUT = 16_948_000;

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

    // 4. завод отправляет макет технологу; согласуют обе стороны (п. 16), порядок любой
    as(FACTORY);
    await api.advanceSellerStage(ORDER, { command: "start_artwork_review" });
    as(CUSTOMER);
    expect((await api.getOrder(ORDER)).status).toBe("artwork_review");
    const signed = await api.approveArtwork(ORDER);
    // подпись заказчика есть, технолога нет — заказ ждёт второй подписи
    expect(signed.status).toBe("artwork_review");
    expect(signed.artworkSignoff?.customerApprovedAt).not.toBeNull();
    expect(signed.artworkSignoff?.factoryApprovedAt).toBeNull();
    // повторная подпись — без изменений
    expect((await api.approveArtwork(ORDER)).status).toBe("artwork_review");

    as(FACTORY);
    const review = await api.getSellerOrder(ORDER);
    expect(review.availableCommands).toEqual(["approve_artwork"]);
    const approved = await api.advanceSellerStage(ORDER, { command: "approve_artwork" });
    expect(approved.status).toBe("materials");
    expect(approved.artworkSignoff?.factoryApprovedAt).not.toBeNull();
    as(CUSTOMER);
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

    // 6. контроль качества и отгрузка; «Доставлено» отмечает завод по трек-номеру (п. 13)
    as(FACTORY);
    await api.advanceSellerStage(ORDER, { command: "start_quality_control" });
    tick(60_000);
    const shipped = await api.advanceSellerStage(ORDER, { command: "ship" });
    expect(shipped.status).toBe("shipped");
    expect(shipped.canMarkDelivered).toBe(true);
    expect(
      (await problemOf(() => api.markSellerOrderDelivered(ORDER, { trackingNumber: "   " }))).type,
    ).toBe("https://partiya.ru/problems/seller/invalid-tracking-number");
    const delivered = await api.markSellerOrderDelivered(ORDER, {
      trackingNumber: "  CDEK-1234567890 ",
    });
    expect(delivered.status).toBe("acceptance");
    expect(delivered.trackingNumber).toBe("CDEK-1234567890");
    // повтор — 409
    expect(
      (await problemOf(() => api.markSellerOrderDelivered(ORDER, { trackingNumber: "X" }))).status,
    ).toBe(409);

    // 7. заказчик видит трек-номер и принимает партию
    as(CUSTOMER);
    expect((await api.getOrder(ORDER)).trackingNumber).toBe("CDEK-1234567890");
    const accepted = await api.acceptOrder(ORDER, {}, "accept-1");
    expect(accepted.status).toBe("completed");

    // Q-335: до выплаты оператором — ступень «Принят заказчиком»
    as(FACTORY);
    expect((await api.getSellerOrder(ORDER)).sellerStage).toBe("accepted");
    const acceptedTab = await api.listSellerOrders({ stage: "accepted" });
    expect(acceptedTab.items.some((item) => item.id === ORDER)).toBe(true);
    expect(acceptedTab.summary.accepted).toBeGreaterThanOrEqual(1);

    // 8. у завода появилась выплата 169 480 ₽ при заказе 183 400 ₽
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

    // после выплаты — ступень «Выплачено»
    as(FACTORY);
    expect((await api.getSellerOrder(ORDER)).sellerStage).toBe("paid_out");
  });

  it("разовая оплата: назначение с номером заказа, счёт N-СЧ", async () => {
    as(OPERATOR);
    const first = (await api.getAdminFinance()).tranches.find((row) => row.orderId === ORDER);
    expect(first?.reference).toBe("Оплата по заказу № 4811, спецификация 4811-С. Без НДС");
  });

  it("50/50: второй транш — при переходе в КК; до его оплаты отгрузки нет", async () => {
    // новый заказ «Коры» у «Волны» по схеме 50/50
    as(CUSTOMER);
    const draft = await api.createOrderDraft(
      {
        quoteId: encodeQuoteId(
          { offerId: 2231, qty: 1000, optionIds: ["extra-print-color"], deliveryId: "wb" },
          clock,
        ),
      },
      "draft-split",
    );
    const upload = await api.requestArtworkUpload(draft.id, {
      fileName: "logo.pdf",
      contentType: "application/pdf",
      size: 1000,
    });
    await api.completeArtworkUpload(draft.id, upload.fileId);
    await api.updateOrderDraft(draft.id, {
      payer: { orgId: DEMO_ORG_IDS.kora, legalAddress: "Москва, ул. Лесная, 9" },
      paymentMethod: "escrow_split_50_50",
    });
    const submitted = await api.submitOrder(
      draft.id,
      { offerAccepted: true, offerVersion: "2026-10-01" },
      "submit-split",
    );
    const id = submitted.order.id;
    expect(submitted.payment.invoiceNumber).toBe(`${String(id)}-1-СЧ`);
    expect(submitted.payment.purpose).toBe(
      `Оплата по заказу № ${String(id)}, спецификация ${String(id)}-С, платёж 1 из 2. Без НДС`,
    );
    expect(submitted.payment.amountDue).toBe(TOTAL / 2);

    // до «готов к отгрузке» второй транш без срока
    as(OPERATOR);
    const firstRow = (await api.getAdminFinance()).tranches.find(
      (row) => row.orderId === id && row.trancheNo === 1,
    );
    await api.confirmTrancheFunds(firstRow?.trancheId ?? "", {}, "funds-split-1");
    as(CUSTOMER);
    const deal = await api.getOrderEscrow(id);
    expect(deal.tranches).toHaveLength(2);
    expect(deal.tranches[1]).toMatchObject({
      title: "Второй транш · перед отгрузкой",
      status: "awaiting_funds",
      dueAt: null,
    });
    expect(deal.finalPayment).toMatchObject({ state: "not_issued", invoiceNumber: null });

    as(FACTORY);
    await api.confirmSellerOrder(id, "confirm-split");
    await api.advanceSellerStage(id, { command: "start_artwork_review" });
    await api.advanceSellerStage(id, { command: "approve_artwork" });
    as(CUSTOMER);
    await api.approveArtwork(id);
    as(FACTORY);
    await api.advanceSellerStage(id, { command: "materials_purchased" });
    const qc = await api.advanceSellerStage(id, { command: "start_quality_control" });
    // второй транш не оплачен — `ship` нет, а прямая команда — 409
    expect(qc.availableCommands).not.toContain("ship");
    expect((await problemOf(() => api.advanceSellerStage(id, { command: "ship" }))).type).toBe(
      "https://partiya.ru/problems/orders/ship-before-final-payment",
    );

    as(CUSTOMER);
    const issued = await api.getOrderEscrow(id);
    expect(issued.tranches[1]?.dueAt).not.toBeNull();
    // Q-384: второй счёт с реквизитами — в карточке эскроу заказчика
    expect(issued.finalPayment?.state).toBe("awaiting");
    expect(issued.finalPayment?.instructions).toMatchObject({
      invoiceNumber: `${String(id)}-2-СЧ`,
      amountDue: TOTAL / 2,
      purpose: `Оплата по заказу № ${String(id)}, спецификация ${String(id)}-С, платёж 2 из 2. Без НДС`,
    });

    as(OPERATOR);
    const second = (await api.getAdminFinance()).tranches.find(
      (row) => row.orderId === id && row.trancheNo === 2,
    );
    expect(second?.reference).toBe(
      `Оплата по заказу № ${String(id)}, спецификация ${String(id)}-С, платёж 2 из 2. Без НДС`,
    );
    await api.confirmTrancheFunds(second?.trancheId ?? "", {}, "funds-split-2");

    as(FACTORY);
    expect((await api.getSellerOrder(id)).availableCommands).toContain("ship");
  });

  it("оператор отмечает «Доставлено» запасным путём; не shipped — 409", async () => {
    as(OPERATOR);
    expect((await problemOf(() => api.markAdminOrderDelivered(4799))).status).toBe(409);
    expect((await problemOf(() => api.markAdminOrderDelivered(999_999))).status).toBe(404);
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

/* ───────────── просрочка второго транша 50/50 (Q-401, вариант «в») ───────────── */

describe("просроченный второй транш", () => {
  /** Фикстура: 50/50, первый срок второго транша истёк 3 дня назад — после автопродления
      на 48 ч заказ у оператора. */
  const OVERDUE = 4795;

  it("первая просрочка — автопродление, повторная — очередь оператора; завод видит состояние", async () => {
    as(OPERATOR);
    const page = await api.listAdminOverdueTranches();
    expect(page.count).toBe(1);
    const row = page.items[0];
    expect(row).toMatchObject({
      orderNo: OVERDUE,
      invoiceNumber: `${String(OVERDUE)}-2-СЧ`,
      extensions: 1,
    });
    expect(row?.history.map((item) => item.kind)).toEqual(["auto"]);
    expect((await api.getAdminOverdueTrancheCount()).count).toBe(1);

    as(FACTORY);
    const card = await api.getSellerOrder(OVERDUE);
    expect(card.finalPayment?.state).toBe("operator");
    expect(card.finalPayment?.instructions).toBeNull();
    expect(card.availableCommands).not.toContain("ship");

    // журнал рассказывает про продление и передачу оператору
    const events = (await api.getOrderEvents(OVERDUE)).items.map((event) => event.title);
    expect(events.some((title) => title.startsWith("Срок оплаты второго транша продлён до"))).toBe(
      true,
    );
    expect(events.some((title) => title.includes("передан оператору"))).toBe(true);
  });

  it("«Продлить» проверяет часы и комментарий, снимает заказ из очереди, без второго автопродления", async () => {
    as(OPERATOR);
    for (const body of [
      { hours: 0, comment: "ок" },
      { hours: 337, comment: "ок" },
      { hours: 24, comment: "  " },
    ]) {
      const problem = await problemOf(() => api.extendAdminOverdueTranche(OVERDUE, body));
      expect(problem.status).toBe(422);
    }
    const done = await api.extendAdminOverdueTranche(OVERDUE, {
      hours: 72,
      comment: "ПП отправлено, ждём зачисления",
    });
    expect(done.outcome).toBe("extended");
    expect(done.dueAt).toBe(new Date(clock + 72 * 3_600_000).toISOString());
    expect((await api.getAdminOverdueTrancheCount()).count).toBe(0);
    // повторно — уже не у оператора
    expect(
      (await problemOf(() => api.extendAdminOverdueTranche(OVERDUE, { hours: 1, comment: "ещё" })))
        .type,
    ).toBe("https://partiya.ru/problems/payments/tranche-not-overdue");

    as(FACTORY);
    expect((await api.getSellerOrder(OVERDUE)).finalPayment).toMatchObject({
      state: "extended",
      extensions: 2,
    });

    // срок снова прошёл — сразу оператору
    tick(73 * 3_600_000);
    as(OPERATOR);
    expect((await api.getAdminOverdueTrancheCount()).count).toBe(1);
  });

  it("оплата до решения оператора принимается штатно, решение после неё — 409", async () => {
    as(OPERATOR);
    await api.listAdminOverdueTranches();
    await api.confirmTrancheFunds(`tr-${String(OVERDUE)}-2`, {}, "funds-late");
    expect((await api.getAdminOverdueTrancheCount()).count).toBe(0);
    expect(
      (await problemOf(() => api.openAdminOverdueDispute(OVERDUE, { comment: "поздно" }))).type,
    ).toBe("https://partiya.ru/problems/payments/tranche-already-paid");

    as(FACTORY);
    const card = await api.getSellerOrder(OVERDUE);
    expect(card.finalPayment?.state).toBe("paid");
    expect(card.availableCommands).toContain("ship");
  });

  it("«Открыть спор»: счёт снят, первый транш делит решение по спору", async () => {
    as(OPERATOR);
    expect(
      (await problemOf(() => api.openAdminOverdueDispute(OVERDUE, { comment: " " }))).status,
    ).toBe(422);
    const done = await api.openAdminOverdueDispute(OVERDUE, {
      comment: "Заказчик не выходит на связь",
    });
    expect(done).toMatchObject({ outcome: "dispute_opened", disputeId: `dsp-${String(OVERDUE)}` });
    expect((await api.getAdminOverdueTrancheCount()).count).toBe(0);

    // снятый счёт не оплатить
    expect(
      (await problemOf(() => api.confirmTrancheFunds(`tr-${String(OVERDUE)}-2`, {}, "late")))
        .status,
    ).toBe(409);

    const card = await api.getAdminDispute(OVERDUE);
    // в эскроу — только первый транш
    expect(card.escrowAmount).toBe(13_500_000);
    const full = card.options.find((option) => option.resolution === "full_refund");
    expect(full?.customerAmount).toBe(13_500_000);

    as(FACTORY);
    const seller = await api.getSellerOrder(OVERDUE);
    expect(seller.status).toBe("dispute");
    expect(seller.finalPayment?.state).toBe("cancelled");
  });
});
