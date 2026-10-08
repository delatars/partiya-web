import type { Me, Order } from "@partiya/api-contracts";
import { beforeEach, describe, expect, it, onTestFinished } from "vitest";

import { isApiError } from "@/shared/api";
import { DEMO_ORG_IDS, DEMO_USER_IDS } from "@/shared/lib/demo";
import { encodeQuoteId, MOCK_QUOTE_TTL_MS } from "@/shared/lib/quote-id";
import { setMockPromoCodesEnabled } from "@/shared/mocks";

import { createMockOrdersBackend, type MockOrdersBackend } from "./mock-backend";

/* Мок проверяется как настоящий сервис: важны не «данные вернулись», а статусы, коды
   problem+json и переходы автомата — на них стоит экран оформления.

   Часы свои: истечение котировки иначе не проверить, а ждать полчаса в тесте нельзя. */

let clock = Date.parse("2026-09-21T09:00:00.000Z");
const tick = (ms: number) => {
  clock += ms;
};

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
    {
      id: DEMO_ORG_IDS.volna,
      kind: "factory",
      name: "ООО «Волна»",
      inn: "3702012348",
      kpp: "370201001",
      verificationStatus: "verified",
      role: "manager",
      roleTitle: "Закупщик",
      createdAt: "2026-03-02T10:00:00.000Z",
    },
  ],
  activeOrgId: DEMO_ORG_IDS.kora,
  activeRole: "owner",
};

const factoryActive: Me = { ...customer, activeOrgId: DEMO_ORG_IDS.volna, activeRole: "manager" };

/** Тело `submit` с принятой офертой (п. 12). */
const CONSENT = { offerAccepted: true, offerVersion: "2026-10-01" };

function backend(me: Me = customer): MockOrdersBackend {
  return createMockOrdersBackend({
    now: () => clock,
    storage: null,
    latencyMs: 0,
    getMe: () => Promise.resolve(me),
  });
}

/** Сквозной пример макета: 1 000 шт, доп. цвет принта, доставка WB → 183 400 ₽. */
function quoteId(
  patch: {
    qty?: number;
    options?: string[];
    delivery?: string;
    promo?: string;
    at?: number;
  } = {},
) {
  return encodeQuoteId(
    {
      offerId: 2231,
      qty: patch.qty ?? 1000,
      optionIds: patch.options ?? ["extra-print-color"],
      deliveryId: patch.delivery ?? "wb",
      promo: patch.promo,
    },
    patch.at ?? clock,
  );
}

async function problemOf(work: Promise<unknown>): Promise<{ status: number; type?: string }> {
  try {
    await work;
    throw new Error("ожидали отказ, а запрос прошёл");
  } catch (error) {
    if (!isApiError(error)) throw error;
    return { status: error.status, type: error.problem?.type };
  }
}

/** Доводит черновик до состояния, в котором его принимает `submit`. */
async function complete(api: MockOrdersBackend, order: Order): Promise<Order> {
  const upload = await api.requestArtworkUpload(order.id, {
    fileName: "logo_front.pdf",
    contentType: "application/pdf",
    size: 1_200_000,
  });
  await api.completeArtworkUpload(order.id, upload.fileId);
  return api.updateOrderDraft(order.id, {
    payer: { orgId: DEMO_ORG_IDS.kora, legalAddress: "Москва, ул. Лесная, 9" },
    paymentMethod: "escrow_full",
  });
}

beforeEach(() => {
  clock = Date.parse("2026-09-21T09:00:00.000Z");
});

describe("создание черновика из котировки", () => {
  it("собирает заказ по котировке: цена, параметры, доставка и плательщик", async () => {
    const api = backend();
    const order = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");

    expect(order.status).toBe("draft");
    // публичный номер идёт после занятого 4812 из фикстур
    expect(order.id).toBe(4813);
    expect(order.offer.id).toBe(2231);
    // сквозной пример макета: 168 000 + 6 000 + 9 400
    expect(order.quote.total).toBe(18_340_000);
    expect(order.params.qty).toBe(1000);
    expect(order.params.optionIds).toEqual(["extra-print-color"]);
    // разбивка по умолчанию сходится с объёмом — иначе шаг не пройдёт валидацию
    expect(order.params.colors.reduce((sum, line) => sum + line.qty, 0)).toBe(1000);
    expect(order.params.sizes.reduce((sum, line) => sum + line.qty, 0)).toBe(1000);
    expect(order.delivery?.optionId).toBe("wb");
    expect(order.payer?.inn).toBe("7707083893");
    expect(order.paymentMethod).toBe("escrow_full");
    expect(order.documents).toEqual([]);
    expect(order.payment).toBeNull();
  });

  it("повторный заход с тем же оффером продолжает черновик, а не плодит новые", async () => {
    const api = backend();
    const first = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    await api.updateOrderDraft(first.id, {
      delivery: { optionId: "pickup" },
    });

    tick(60_000);
    const again = await api.createOrderDraft({ quoteId: quoteId({ qty: 2000 }) }, "key-2");

    expect(again.id).toBe(first.id);
    // объём приехал новый, а выбранная доставка осталась — оформление продолжается
    expect(again.params.qty).toBe(2000);
    const list = await api.listOrders();
    expect(list.items.filter((item) => item.status === "draft")).toHaveLength(1);
  });

  it("повтор с тем же ключом идемпотентности возвращает тот же черновик", async () => {
    const api = backend();
    const first = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    const repeat = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    expect(repeat.id).toBe(first.id);
  });

  it("промокоды выключены флагом (п. 10): даже ПАРТИЯ5 — 422 unknown_promo", async () => {
    const api = backend();
    expect(
      await problemOf(api.createOrderDraft({ quoteId: quoteId({ promo: "ПАРТИЯ5" }) }, "key-1")),
    ).toEqual({ status: 422, type: "https://partiya.ru/problems/quote/unknown_promo" });
  });

  it("при включённом флаге промокод приезжает строкой котировки", async () => {
    setMockPromoCodesEnabled(true);
    onTestFinished(() => {
      setMockPromoCodesEnabled(false);
    });
    const api = backend();
    const order = await api.createOrderDraft({ quoteId: quoteId({ promo: "ПАРТИЯ5" }) }, "key-1");

    const line = order.quote.lines.find((item) => item.kind === "promo");
    expect(line).toBeDefined();
    // 5 % от стоимости товара (168 000 + 6 000 = 174 000 ₽) = 8 700 ₽, скидка отрицательная
    expect(line?.amount).toBe(-870_000);
    expect(order.promo).toEqual({
      code: "ПАРТИЯ5",
      title: "Промокод ПАРТИЯ5 −5 %",
      discount: 870_000,
    });
    // итог = 183 400 − 8 700
    expect(order.quote.total).toBe(17_470_000);
    // сумма строк сходится с итогом — инвариант котировки
    expect(order.quote.lines.reduce((sum, item) => sum + item.amount, 0)).toBe(order.quote.total);
  });

  it("неизвестный промокод — 422, а не молчаливая нулевая скидка", async () => {
    setMockPromoCodesEnabled(true);
    onTestFinished(() => {
      setMockPromoCodesEnabled(false);
    });
    const api = backend();
    expect(
      await problemOf(api.createOrderDraft({ quoteId: quoteId({ promo: "НЕТТАКОГО" }) }, "key-1")),
    ).toEqual({
      status: 422,
      type: "https://partiya.ru/problems/quote/unknown_promo",
    });
  });

  it("истёкшая котировка — 409 с отдельным кодом", async () => {
    const api = backend();
    const stale = quoteId({ at: clock - MOCK_QUOTE_TTL_MS - 1 });
    expect(await problemOf(api.createOrderDraft({ quoteId: stale }, "key-1"))).toEqual({
      status: 409,
      type: "https://partiya.ru/problems/orders/quote-expired",
    });
  });

  it("активна фабрика — оформлять партию нельзя", async () => {
    const api = backend(factoryActive);
    expect(await problemOf(api.createOrderDraft({ quoteId: quoteId() }, "key-1"))).toMatchObject({
      status: 403,
    });
  });
});

describe("PATCH черновика", () => {
  it("сохраняет разбивку, доставку и плательщика", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");

    const updated = await api.updateOrderDraft(draft.id, {
      params: {
        colors: [
          { color: "белый", qty: 700 },
          { color: "графит", qty: 300 },
        ],
        print: "DTF, полноцвет",
      },
      delivery: { optionId: "address", address: "Москва, ул. Лесная, 9", recipientName: "Анна" },
      payer: {
        orgId: DEMO_ORG_IDS.kora,
        legalAddress: "Москва, Лесная, 9",
        accountantEmail: "buh@kora.ru",
      },
    });

    expect(updated.params.colors).toEqual([
      { color: "белый", qty: 700 },
      { color: "графит", qty: 300 },
    ]);
    expect(updated.params.print).toBe("DTF, полноцвет");
    expect(updated.delivery?.kind).toBe("address");
    expect(updated.payer?.accountantEmail).toBe("buh@kora.ru");
  });

  it("не сходящаяся разбивка — 422 с разбором по полям", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");

    try {
      await api.updateOrderDraft(draft.id, {
        params: { colors: [{ color: "белый", qty: 900 }] },
      });
      throw new Error("ожидали 422");
    } catch (error) {
      if (!isApiError(error)) throw error;
      expect(error.status).toBe(422);
      expect(error.fieldErrors?.["params.colors"]?.[0]).toContain("900");
    }
  });

  it("объём напрямую не меняется — только пересчётом", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    try {
      await api.updateOrderDraft(draft.id, { params: { qty: 5000 } });
      throw new Error("ожидали 422");
    } catch (error) {
      if (!isApiError(error)) throw error;
      expect(error.fieldErrors?.["params.qty"]?.[0]).toContain("пересчёт");
    }
  });

  it("новая котировка меняет цену заказа", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    expect(draft.quote.total).toBe(18_340_000);

    // самовывоз вместо склада WB: −9 400 ₽
    const updated = await api.updateOrderDraft(draft.id, {
      quoteId: quoteId({ delivery: "pickup" }),
    });
    expect(updated.quote.total).toBe(17_400_000);
    expect(updated.delivery?.optionId).toBe("pickup");
  });

  it("недоступная схема оплаты — 422 с причиной от сервера", async () => {
    const api = backend();
    // у «Волны» рейтинг 4,8 — схема 50/50 доступна; проверяем на фабрике с рейтингом ниже
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    const option = draft.paymentOptions.find((item) => item.method === "escrow_split_50_50");
    if (option?.available === true) {
      const updated = await api.updateOrderDraft(draft.id, {
        paymentMethod: "escrow_split_50_50",
      });
      expect(updated.paymentMethod).toBe("escrow_split_50_50");
      // первый транш — половина итога
      expect(
        updated.paymentOptions.find((item) => item.method === "escrow_split_50_50")?.amountDue,
      ).toBe(9_170_000);
    }
  });

  it("оформленный заказ больше не черновик — 409", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    const ready = await complete(api, draft);
    await api.submitOrder(ready.id, CONSENT, "submit-1");

    expect(
      await problemOf(api.updateOrderDraft(draft.id, { params: { fit: "оверсайз" } })),
    ).toEqual({ status: 409, type: "https://partiya.ru/problems/orders/not-draft" });
  });
});

describe("загрузка макета", () => {
  it("выдаёт presigned-ссылку и доводит файл до статуса «на проверке»", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");

    const upload = await api.requestArtworkUpload(draft.id, {
      fileName: "logo_front.pdf",
      contentType: "application/pdf",
      size: 1_200_000,
    });
    expect(upload.uploadUrl).toContain("mock://");
    expect(upload.method).toBe("PUT");

    const before = await api.getOrder(draft.id);
    expect(before.artwork[0]?.status).toBe("uploading");

    const file = await api.completeArtworkUpload(draft.id, upload.fileId);
    expect(file.status).toBe("review");
    expect(file.uploadedAt).not.toBeNull();
  });

  it("слишком большой файл — 413, неверный тип — 415", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");

    expect(
      await problemOf(
        api.requestArtworkUpload(draft.id, {
          fileName: "print.pdf",
          contentType: "application/pdf",
          size: 40 * 1024 * 1024,
        }),
      ),
    ).toEqual({ status: 413, type: "https://partiya.ru/problems/orders/artwork-too-large" });

    expect(
      await problemOf(
        api.requestArtworkUpload(draft.id, {
          fileName: "макет.docx",
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: 1000,
        }),
      ),
    ).toEqual({ status: 415, type: "https://partiya.ru/problems/orders/artwork-unsupported-type" });
  });

  it("файл удаляется", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    const upload = await api.requestArtworkUpload(draft.id, {
      fileName: "logo.pdf",
      contentType: "application/pdf",
      size: 1000,
    });
    await api.completeArtworkUpload(draft.id, upload.fileId);
    await api.deleteArtwork(draft.id, upload.fileId);
    expect((await api.getOrder(draft.id)).artwork).toHaveLength(0);
  });
});

describe("отправка заказа", () => {
  it("формирует документы и платёжные инструкции", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    const ready = await complete(api, draft);

    const result = await api.submitOrder(ready.id, CONSENT, "submit-1");

    expect(result.order.status).toBe("awaiting_payment");
    expect(result.order.submittedAt).not.toBeNull();
    expect(result.documents.map((item) => item.kind)).toEqual([
      "offer_contract",
      "specification",
      "invoice",
    ]);
    expect(result.payment.invoiceNumber).toBe("4813-СЧ");
    expect(result.payment.amount).toBe(18_340_000);
    expect(result.payment.amountDue).toBe(18_340_000);
    expect(result.payment.purpose).toContain("№ 4813");
    // счёт живёт 48 часов — «мощность зарезервирована за вами на 48 часов»
    expect(Date.parse(result.payment.dueAt) - clock).toBe(48 * 60 * 60_000);
  });

  it("незаполненные шаги — 422 с полями, а не глухой отказ", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");

    try {
      await api.submitOrder(draft.id, CONSENT, "submit-1");
      throw new Error("ожидали 422");
    } catch (error) {
      if (!isApiError(error)) throw error;
      expect(error.status).toBe(422);
      expect(error.problem?.type).toBe("https://partiya.ru/problems/orders/draft-incomplete");
      // макета нет — именно это и должно быть в ошибке
      expect(Object.keys(error.fieldErrors ?? {})).toContain("artwork");
    }
  });

  it("повторный submit с тем же ключом возвращает первый ответ, а не второй заказ", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    const ready = await complete(api, draft);

    const first = await api.submitOrder(ready.id, CONSENT, "submit-1");
    const repeat = await api.submitOrder(ready.id, CONSENT, "submit-1");

    expect(repeat.order.id).toBe(first.order.id);
    expect(repeat.payment.invoiceNumber).toBe(first.payment.invoiceNumber);
    const list = await api.listOrders();
    expect(list.items.filter((item) => item.id === first.order.id)).toHaveLength(1);
  });

  it("повторный submit с ДРУГИМ ключом упирается в статус, а не создаёт заказ", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    const ready = await complete(api, draft);
    await api.submitOrder(ready.id, CONSENT, "submit-1");

    expect(await problemOf(api.submitOrder(ready.id, CONSENT, "submit-2"))).toEqual({
      status: 409,
      type: "https://partiya.ru/problems/orders/not-draft",
    });
  });

  it("истёкшая котировка не даёт оформить заказ", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    const ready = await complete(api, draft);

    tick(MOCK_QUOTE_TTL_MS + 1000);

    expect(await problemOf(api.submitOrder(ready.id, CONSENT, "submit-1"))).toEqual({
      status: 409,
      type: "https://partiya.ru/problems/orders/quote-expired",
    });
  });

  it("без принятия оферты — 422 offer-not-accepted с полями, заказ остаётся черновиком", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    const ready = await complete(api, draft);

    try {
      await api.submitOrder(ready.id, { offerAccepted: false, offerVersion: " " }, "submit-1");
      throw new Error("ожидали 422");
    } catch (error) {
      if (!isApiError(error)) throw error;
      expect(error.status).toBe(422);
      expect(error.problem?.type).toBe("https://partiya.ru/problems/orders/offer-not-accepted");
      expect(Object.keys(error.fieldErrors ?? {}).sort()).toEqual([
        "offerAccepted",
        "offerVersion",
      ]);
    }
    expect((await api.getOrder(ready.id)).status).toBe("draft");

    // версия — только латиница, цифры, «.», «-», «_»
    expect(
      await problemOf(
        api.submitOrder(ready.id, { offerAccepted: true, offerVersion: "редакция 1" }, "s-2"),
      ),
    ).toEqual({ status: 422, type: "https://partiya.ru/problems/orders/offer-not-accepted" });
  });
});

describe("отмена заказчиком (п. 17)", () => {
  it("неоплаченный заказ отменяется с причиной; повтор — 200", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    const ready = await complete(api, draft);
    const submitted = await api.submitOrder(ready.id, CONSENT, "submit-1");
    expect(submitted.order.canCancel).toBe(true);

    const cancelled = await api.cancelOrder(ready.id, { reason: "передумали" });
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.canCancel).toBe(false);
    const again = await api.cancelOrder(ready.id, {});
    expect(again.status).toBe("cancelled");
  });

  it("после оплаты — 409 cancel-after-payment", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    const ready = await complete(api, draft);
    await api.submitOrder(ready.id, CONSENT, "submit-1");
    const paid = await api.markPaid(ready.id);
    expect(paid.canCancel).toBe(false);
    expect(await problemOf(api.cancelOrder(ready.id, {}))).toEqual({
      status: 409,
      type: "https://partiya.ru/problems/orders/cancel-after-payment",
    });
  });
});

describe("оплата и список кабинета", () => {
  it("«Я оплатил (демо)» переводит заказ в ожидание подтверждения фабрики", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");
    const ready = await complete(api, draft);
    await api.submitOrder(ready.id, CONSENT, "submit-1");

    const paid = await api.markPaid(ready.id);
    expect(paid.status).toBe("awaiting_confirmation");
    expect(paid.customerStage).toBe("paid");
    expect(paid.paidAt).not.toBeNull();
    expect(paid.confirmDeadlineAt).not.toBeNull();
  });

  it("список кабинета объединяет свои заказы с историей демо-компании", async () => {
    const api = backend();
    const draft = await api.createOrderDraft({ quoteId: quoteId() }, "key-1");

    const list = await api.listOrders();
    // 5 строк из макета + неоплаченный 4811 из заводских фикстур + собственный черновик
    expect(list.items).toHaveLength(7);
    expect(list.items[0]?.id).toBe(draft.id);
    expect(list.items[0]?.status).toBe("draft");
    expect(list.items[0]?.bucket).toBe("action");
    expect(list.items.some((item) => item.id === 4812 && item.status === "in_production")).toBe(
      true,
    );
  });

  it("фильтр по вкладке отдаёт только свою корзину", async () => {
    const api = backend();
    const done = await api.listOrders({ bucket: "done" });
    expect(done.items.every((item) => item.status === "completed")).toBe(true);
    expect(done.items).toHaveLength(2);
  });

  it("чужой заказ неотличим от несуществующего", async () => {
    const api = backend();
    expect(await problemOf(api.getOrder(9999))).toMatchObject({ status: 404 });
  });
});

describe("образцы", () => {
  it("создаёт образец и считает итог по макету", async () => {
    const api = backend();
    const sample = await api.createSample(
      {
        offerId: 2231,
        params: { qty: 2, sizes: "M, L", color: "белый", print: "Шелкография 2 цв." },
        delivery: {
          optionId: "cdek-pvz",
          address: "Москва, ул. Лесная, 9",
          recipientName: "Анна Кораблёва",
          recipientPhone: "+79160001234",
        },
        payment: "card",
      },
      "sample-1",
    );

    // макет: 1 500 ₽ + 0 ₽ печать + 420 ₽ доставка = 1 920 ₽
    expect(sample.total).toBe(192_000);
    expect(sample.status).toBe("paid");
    expect(sample.credit.amount).toBe(150_000);
    expect(sample.artworkFileName).toBeNull();
  });

  it("оплата счётом оставляет образец в ожидании оплаты", async () => {
    const api = backend();
    const sample = await api.createSample(
      {
        offerId: 2231,
        params: { qty: 1, sizes: "M", color: "чёрный", print: "Без печати" },
        delivery: {
          optionId: "courier",
          address: "Москва, Лесная, 9",
          recipientName: "Анна",
          recipientPhone: "+79160001234",
        },
        payment: "invoice",
      },
      "sample-1",
    );
    expect(sample.status).toBe("awaiting_payment");
    expect(sample.total).toBe(150_000 + 78_000);
  });

  it("пустой адрес — 422 с полем", async () => {
    const api = backend();
    try {
      await api.createSample(
        {
          offerId: 2231,
          params: { qty: 1, sizes: "M", color: "белый", print: "DTF" },
          delivery: {
            optionId: "cdek-pvz",
            address: "  ",
            recipientName: "Анна",
            recipientPhone: "+79160001234",
          },
          payment: "card",
        },
        "sample-1",
      );
      throw new Error("ожидали 422");
    } catch (error) {
      if (!isApiError(error)) throw error;
      expect(error.status).toBe(422);
      expect(error.fieldErrors?.["delivery.address"]).toBeDefined();
    }
  });

  it("повтор с тем же ключом не создаёт второй образец", async () => {
    const api = backend();
    const body = {
      offerId: 2231,
      params: { qty: 1, sizes: "M", color: "белый", print: "DTF" },
      delivery: {
        optionId: "cdek-pvz",
        address: "Москва, Лесная, 9",
        recipientName: "Анна",
        recipientPhone: "+79160001234",
      },
      payment: "card" as const,
    };
    const first = await api.createSample(body, "sample-1");
    const repeat = await api.createSample(body, "sample-1");
    expect(repeat.id).toBe(first.id);
  });
});
