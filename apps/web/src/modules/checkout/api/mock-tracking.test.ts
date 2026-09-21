import type { Me, OrderStatus } from "@partiya/api-contracts";
import { beforeEach, describe, expect, it } from "vitest";

import { isApiError } from "@/shared/api";
import { DEMO_ORG_IDS, DEMO_USER_IDS } from "@/shared/lib/demo";

import { createMockOrdersBackend, type MockOrdersBackend } from "./mock-backend";

/* Мок трекинга проверяется как настоящий сервис: важны переходы автомата, коды
   problem+json и права. Экран трекинга стоит ровно на этом.

   Часы свои: окно приёмки и «сегодня» в ленте иначе не проверить. */

let clock = Date.parse("2026-09-21T09:00:00.000Z");

const customer: Me = {
  user: {
    id: DEMO_USER_IDS.korableva,
    email: "a.korableva@kora.ru",
    phone: "+79160001234",
    name: "Анна Кораблёва",
    createdAt: "2026-03-02T10:00:00.000Z",
  },
  organizations: [
    {
      id: DEMO_ORG_IDS.kora,
      kind: "customer",
      name: "ООО «Кора»",
      inn: "7707083893",
      kpp: "770101001",
      verificationStatus: "verified",
      role: "owner",
      roleTitle: "Владелец",
      createdAt: "2026-03-02T10:00:00.000Z",
    },
  ],
  activeOrgId: DEMO_ORG_IDS.kora,
  activeRole: "owner",
};

const STRANGER_ORG_ID = "018f5f1a-0002-7000-8000-00000000009";

/** Другая организация-заказчик: её заказы для «Коры» не существуют. */
const stranger: Me = {
  ...customer,
  organizations: customer.organizations.map((org) => ({
    ...org,
    id: STRANGER_ORG_ID,
    name: "ООО «Чужая»",
  })),
  activeOrgId: STRANGER_ORG_ID,
};

function backend(me: Me = customer): MockOrdersBackend {
  return createMockOrdersBackend({
    now: () => clock,
    storage: null,
    latencyMs: 0,
    getMe: () => Promise.resolve(me),
  });
}

async function problemOf(promise: Promise<unknown>) {
  try {
    await promise;
    throw new Error("Ожидали ошибку, а запрос прошёл");
  } catch (error) {
    if (!isApiError(error)) throw error;
    return { status: error.status, type: error.problem?.type };
  }
}

/** Довести заказ автоматом до нужного статуса демо-командой. */
async function advanceTo(api: MockOrdersBackend, id: number, target: OrderStatus): Promise<void> {
  for (let step = 0; step < 12; step += 1) {
    const order = await api.getOrder(id);
    if (order.status === target) return;
    await api.demoAdvance(id);
  }
  throw new Error(`Не довели заказ до статуса ${target}`);
}

beforeEach(() => {
  clock = Date.parse("2026-09-21T09:00:00.000Z");
});

describe("история демо-компании", () => {
  it("заказ 4812 открывается целиком: журнал, прогресс, эскроу", async () => {
    const api = backend();
    const order = await api.getOrder(4812);

    expect(order.status).toBe("in_production");
    expect(order.quote.total).toBe(183_400_00);
    expect(order.tracking?.progressPct).toBe(65);
    expect(order.tracking?.stages.map((stage) => stage.state)).toEqual([
      "done",
      "done",
      "active",
      "todo",
      "todo",
    ]);
    expect(order.tracking?.progress.map((row) => row.id)).toEqual(["cut", "sewn", "print"]);
    expect(order.escrow?.amount).toBe(183_400_00);
  });

  it("журнал отдаётся по курсору и без дыр", async () => {
    const api = backend();
    const page = await api.getOrderEvents(4812);
    const seqs = page.items.map((event) => event.seq);

    expect(seqs.length).toBeGreaterThan(5);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(page.lastSeq).toBe(seqs.at(-1));

    const tail = await api.getOrderEvents(4812, { after: seqs[0] });
    expect(tail.items[0]?.seq).toBe((seqs[0] ?? 0) + 1);
  });

  it("чужой заказ неотличим от несуществующего", async () => {
    const api = backend(stranger);
    expect(await problemOf(api.getOrder(4812))).toMatchObject({ status: 404 });
    expect(await problemOf(api.getOrderEvents(4812))).toMatchObject({ status: 404 });
    expect(await problemOf(api.getOrderMessages(4812))).toMatchObject({ status: 404 });
  });
});

describe("чат заказа", () => {
  it("сообщение попадает и в чат, и в журнал — источник один", async () => {
    const api = backend();
    const before = await api.getOrderEvents(4812);
    const message = await api.sendOrderMessage(4812, { text: "Когда печать?" }, "m-1");

    expect(message.own).toBe(true);
    const after = await api.getOrderEvents(4812);
    expect(after.lastSeq).toBe(before.lastSeq + 1);
    expect(after.items.at(-1)?.type).toBe("message");

    const chat = await api.getOrderMessages(4812);
    expect(chat.items.at(-1)?.text).toBe("Когда печать?");
  });

  it("пустое сообщение без вложений — 422", async () => {
    const api = backend();
    expect(await problemOf(api.sendOrderMessage(4812, { text: "   " }, "m-2"))).toEqual({
      status: 422,
      type: "https://partiya.ru/problems/messages/empty",
    });
  });

  it("прочтение двигается курсором и обнуляет счётчик", async () => {
    const api = backend();
    const chat = await api.getOrderMessages(4812);
    expect(chat.unread).toBeGreaterThan(0);

    const read = await api.markOrderMessagesRead(4812, { upToSeq: chat.items.at(-1)?.seq ?? 0 });
    expect(read.unread).toBe(0);
  });
});

describe("жизненный цикл до completed", () => {
  it("демо-пульт проводит заказ по автомату, приёмка закрывает его", async () => {
    const api = backend();
    await advanceTo(api, 4812, "acceptance");

    const inAcceptance = await api.getOrder(4812);
    expect(inAcceptance.acceptance).not.toBeNull();
    expect(inAcceptance.acceptance?.checks.length).toBeGreaterThan(0);
    expect(inAcceptance.acceptance?.disputeAllowed).toBe(true);

    const accepted = await api.acceptOrder(4812, { marks: { qty: "ok" } }, "acc-1");
    expect(accepted.status).toBe("completed");
    expect(accepted.bucket).toBe("done");
    expect(accepted.escrow?.status).toBe("released");
    expect(accepted.documents.some((document) => document.title.includes("Акт приёмки"))).toBe(
      true,
    );
  });

  it("приёмка идемпотентна: повтор с тем же ключом не двигает автомат второй раз", async () => {
    const api = backend();
    await advanceTo(api, 4812, "acceptance");
    const first = await api.acceptOrder(4812, {}, "acc-1");
    const again = await api.acceptOrder(4812, {}, "acc-1");
    expect(again.status).toBe(first.status);
  });

  it("принять партию до доставки нельзя", async () => {
    const api = backend();
    expect(await problemOf(api.acceptOrder(4812, {}, "acc-2"))).toEqual({
      status: 409,
      type: "https://partiya.ru/problems/orders/not-in-acceptance",
    });
  });
});

describe("спор", () => {
  it("открывается из приёмки, блокирует эскроу и заводит ветку переписки", async () => {
    const api = backend();
    await advanceTo(api, 4812, "acceptance");

    const dispute = await api.openDispute(
      4812,
      {
        reason: "size_mismatch",
        affectedQty: 120,
        description: "Размер L по ширине 52 см вместо 56 см по спецификации.",
        remedy: "partial_refund",
      },
      "d-1",
    );

    expect(dispute.status).toBe("opened");
    expect(dispute.escrowBlocked).toBe(true);
    // сумму частичного возврата считает сервер: 120 × 168 ₽
    expect(dispute.remedyAmount).toBe(120 * 168_00);

    const order = await api.getOrder(4812);
    expect(order.status).toBe("dispute");
    expect(order.escrow?.status).toBe("blocked");

    const thread = await api.getOrderMessages(4812, { channel: "dispute" });
    expect(thread.items.length).toBeGreaterThan(0);
  });

  it("из производства спор открыть можно, из контроля качества — нет", async () => {
    const api = backend();
    const fromProduction = await api.openDispute(
      4812,
      {
        reason: "defects",
        description: "Брак на первых изделиях, фото приложу.",
        remedy: "rework",
      },
      "d-2",
    );
    expect(fromProduction.status).toBe("opened");

    const other = backend();
    await advanceTo(other, 4790, "shipped");
    expect(
      await problemOf(
        other.openDispute(
          4790,
          { reason: "defects", description: "Партия пришла с браком печати.", remedy: "rework" },
          "d-3",
        ),
      ),
    ).toEqual({ status: 409, type: "https://partiya.ru/problems/disputes/not-allowed" });
  });

  it("короткое описание — 422 с разбором по полям", async () => {
    const api = backend();
    expect(
      await problemOf(
        api.openDispute(4812, { reason: "other", description: "плохо", remedy: "rework" }, "d-4"),
      ),
    ).toEqual({ status: 422, type: "https://partiya.ru/problems/disputes/invalid" });
  });

  it("отзыв претензии снимает блокировку и возвращает заказ в прежний статус", async () => {
    const api = backend();
    await advanceTo(api, 4812, "acceptance");
    await api.openDispute(
      4812,
      { reason: "shortfall", description: "Пришло меньше на 40 штук.", remedy: "partial_refund" },
      "d-5",
    );

    const withdrawn = await api.withdrawDispute(4812);
    expect(withdrawn.status).toBe("withdrawn");
    expect((await api.getOrder(4812)).status).toBe("acceptance");
  });

  it("принять партию с открытым спором нельзя", async () => {
    const api = backend();
    await advanceTo(api, 4812, "acceptance");
    await api.openDispute(
      4812,
      {
        reason: "defects",
        description: "Брак на 30 изделиях, фото в переписке.",
        remedy: "rework",
      },
      "d-6",
    );

    expect(await problemOf(api.acceptOrder(4812, {}, "acc-3"))).toEqual({
      status: 409,
      type: "https://partiya.ru/problems/orders/dispute-open",
    });
  });
});

describe("повтор партии", () => {
  it("заводит черновик со скидкой за повтор и ссылкой на прошлый заказ", async () => {
    const api = backend();
    const result = await api.repeatOrder(4601, "r-1");

    expect(result.discountPercent).toBe(9);
    expect(result.order.status).toBe("draft");
    expect(result.order.repeat).toBe(true);
    expect(result.order.repeatOfOrderId).toBe(4601);
    expect(result.order.id).toBeGreaterThan(4812);

    const discountLine = result.order.quote.lines.find((line) => line.kind === "repeat_discount");
    expect(discountLine?.amount).toBeLessThan(0);
    expect(discountLine?.title).toContain("9 %");
  });

  it("повторить можно только завершённый заказ", async () => {
    const api = backend();
    expect(await problemOf(api.repeatOrder(4812, "r-2"))).toEqual({
      status: 409,
      type: "https://partiya.ru/problems/orders/repeat-not-allowed",
    });
  });

  it("повтор идемпотентен: тот же ключ — тот же черновик", async () => {
    const api = backend();
    const first = await api.repeatOrder(4601, "r-3");
    const again = await api.repeatOrder(4601, "r-3");
    expect(again.order.id).toBe(first.order.id);
  });
});

describe("документы, счётчики и эскроу", () => {
  it("документы отдаются по всем заказам и подписываются по ЭДО", async () => {
    const api = backend();
    await advanceTo(api, 4790, "shipped");

    const list = await api.listDocuments();
    const upd = list.items.find((item) => item.number === "4790-У");
    expect(upd?.state).toBe("awaiting_customer");
    expect(list.awaitingSignature).toBeGreaterThan(0);

    const signed = await api.signDocument(upd?.id ?? "");
    expect(signed.document.state).toBe("signed");
  });

  it("счётчики шапки считаются по данным, а не константами", async () => {
    const api = backend();
    const before = await api.getUserCounters();
    expect(before.ordersAwaitingAction).toBeGreaterThan(0);

    await advanceTo(api, 4812, "acceptance");
    const after = await api.getUserCounters();
    expect(after.ordersInAcceptance).toBe(1);
  });

  it("раздел «Эскроу» сходится с заказами", async () => {
    const api = backend();
    const overview = await api.getEscrowOverview();

    expect(overview.heldOrders).toBe(overview.deals.length);
    expect(overview.heldTotal).toBe(overview.deals.reduce((sum, deal) => sum + deal.amount, 0));
    expect(overview.operations.length).toBeGreaterThan(0);
  });
});

describe("канал заказа", () => {
  it("подписка получает события, записанные после неё", async () => {
    const api = backend();
    const seen: number[] = [];
    const page = await api.getOrderEvents(4812);
    const unsubscribe = api.streamOrderEvents(4812, {
      lastSeq: page.lastSeq,
      onEvent: (event) => seen.push(event.seq),
    });

    await api.sendOrderMessage(4812, { text: "Привет" }, "m-stream");
    expect(seen).toEqual([page.lastSeq + 1]);

    unsubscribe();
    await api.sendOrderMessage(4812, { text: "И ещё" }, "m-stream-2");
    expect(seen).toHaveLength(1);
  });

  it("события старше курсора подписке не приходят", async () => {
    const api = backend();
    const seen: number[] = [];
    const unsubscribe = api.streamOrderEvents(4812, {
      lastSeq: 1_000_000,
      onEvent: (event) => seen.push(event.seq),
    });
    await api.sendOrderMessage(4812, { text: "Старое" }, "m-old");
    expect(seen).toEqual([]);
    unsubscribe();
  });
});
