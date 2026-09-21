import type {
  CapacityItemCoefficient,
  CapacityLine,
  FactoryOnboardingDraft,
  Kopecks,
  OrderEvent,
  OrderStatus,
  SellerAudit,
  SellerProfile,
  SellerQuestion,
  SellerReview,
  SellerSampleRequest,
  UnderloadDiscountRule,
} from "@partiya/api-contracts";

import { addWorkingDays, formatDayMonth } from "@/shared/lib/dates";
import { DEMO_BUYER_NAMES, DEMO_BUYER_ORG_IDS, DEMO_ORG_IDS } from "@/shared/lib/demo";
import { customerStageOf, orderBucketOf } from "@/shared/lib/order-status";
import { encodeQuoteId } from "@/shared/lib/quote-id";
import { FACTORIES, requireMockOffer } from "@/shared/mocks";

import { defaultParams, type MockOrder, statusEventText } from "./mock-seed";

/* Фикстуры кабинета завода «Волна».
 *
 * Очередь заказов макета (`factory`: 4812, 4799, 4771, 4756) — это НЕ отдельная таблица,
 * а те же заказы одного хранилища: три из четырёх принадлежат организациям, у которых
 * нет своего аккаунта («ИП Сафонов», «ЭкоДом», «ИП Лебедева»). Так у кабинета завода и
 * кабинета заказчика остаётся один источник правды: подтвердил завод — у заказчика
 * сменился статус, а не «почти такой же» заказ в соседнем массиве.
 *
 * Сюда же добавлен заказ 4811 «Коры» в статусе `awaiting_payment`: он — вход сквозного
 * сценария «оператор подтвердил поступление → завод подтвердил → … → выплата», который
 * иначе пришлось бы каждый раз оформлять руками. Его сумма — 183 400 ₽ из макета. */

const rub = (value: number): Kopecks => value * 100;

/** Завод, которому принадлежат заводские фикстуры. */
export const SELLER_ORG_ID = DEMO_ORG_IDS.volna;

/* ─────────────────────────────── заказы очереди завода ─────────────────────────────── */

interface FactorySeed {
  id: number;
  offerId: number;
  title: string;
  qty: number;
  buyerOrgId: string;
  status: OrderStatus;
  daysAgo: number;
  total: Kopecks;
  unitPrice: Kopecks;
  shipDate: string | null;
}

const FACTORY_SEEDS: FactorySeed[] = [
  {
    // вход сквозного сценария: счёт выставлен, деньги ещё не поступили
    id: 4811,
    offerId: 2231,
    title: "Футболки 180 г/м² под СТМ",
    qty: 1000,
    buyerOrgId: DEMO_ORG_IDS.kora,
    status: "awaiting_payment",
    daysAgo: 0,
    total: rub(183_400),
    unitPrice: rub(168),
    shipDate: null,
  },
  {
    id: 4799,
    offerId: 2231,
    title: "Футболки 3 000 шт",
    qty: 3000,
    buyerOrgId: DEMO_BUYER_ORG_IDS.safonov,
    status: "awaiting_confirmation",
    daysAgo: 1,
    total: rub(405_000),
    unitPrice: rub(135),
    shipDate: null,
  },
  {
    id: 4771,
    offerId: 2144,
    title: "Шоперы 1 500 шт",
    qty: 1500,
    buyerOrgId: DEMO_BUYER_ORG_IDS.ecodom,
    status: "acceptance",
    daysAgo: 21,
    total: rub(144_000),
    unitPrice: rub(96),
    shipDate: "2026-09-18",
  },
  {
    id: 4756,
    offerId: 2231,
    title: "Футболки 500 шт",
    qty: 500,
    buyerOrgId: DEMO_BUYER_ORG_IDS.lebedeva,
    status: "completed",
    daysAgo: 34,
    total: rub(94_500),
    unitPrice: rub(189),
    shipDate: "2026-09-08",
  },
];

/** Номера заводских фикстур — по ним мок отличает их от заказов, созданных вручную. */
export const SEEDED_FACTORY_ORDER_IDS = FACTORY_SEEDS.map((seed) => seed.id);

const PATH: OrderStatus[] = [
  "awaiting_payment",
  "awaiting_confirmation",
  "confirmed",
  "artwork_review",
  "materials",
  "in_production",
  "quality_control",
  "shipped",
  "acceptance",
  "completed",
];

const SYSTEM = { kind: "system" as const, name: "Система", orgId: null };

function at(nowMs: number, daysAgo: number, time: string): string {
  const date = new Date(nowMs);
  date.setDate(date.getDate() - daysAgo);
  const [hours, minutes] = time.split(":");
  date.setHours(Number(hours ?? 0), Number(minutes ?? 0), 0, 0);
  return date.toISOString();
}

/** Комиссия платформы — та же ставка, что в проекциях заказа. */
const FEE_PERCENT = 8;

export interface SeededFactory {
  orders: MockOrder[];
  events: Record<string, OrderEvent[]>;
}

/** Заказы очереди завода с журналами. */
export function seedFactoryOrders(nowMs: number): SeededFactory {
  const orders: MockOrder[] = [];
  const events: Record<string, OrderEvent[]> = {};

  for (const seed of FACTORY_SEEDS) {
    const offer = requireMockOffer(seed.offerId);
    const submittedAt = at(nowMs, seed.daysAgo, "11:20");
    const submittedMs = Date.parse(submittedAt);
    const reached = PATH.slice(0, PATH.indexOf(seed.status) + 1);
    const span = Math.max(1, seed.daysAgo - 1);
    const step = span / Math.max(1, reached.length - 1 || 1);

    const journal: OrderEvent[] = [];
    let seq = 0;
    let previous: OrderStatus | null = "draft";
    const factory = {
      kind: "factory" as const,
      name: `Технолог «${offer.factory.name}»`,
      orgId: SELLER_ORG_ID,
    };

    reached.forEach((status, index) => {
      const daysAgo = Math.max(0, Math.round(seed.daysAgo - step * index));
      const occurredAt = at(nowMs, daysAgo, index === 0 ? "11:20" : "14:30");
      const text = statusEventText(status);
      seq += 1;
      journal.push({
        type: "status_changed",
        seq,
        orderId: seed.id,
        occurredAt,
        actor: status === "confirmed" || status === "shipped" ? factory : SYSTEM,
        title: text.title,
        detail: text.detail ?? null,
        from: previous,
        to: status,
        stage: customerStageOf(status),
      });
      previous = status;

      if (status === "awaiting_confirmation") {
        seq += 1;
        journal.push({
          type: "money",
          seq,
          orderId: seed.id,
          occurredAt,
          actor: SYSTEM,
          title: "Оплата зарезервирована в эскроу",
          detail: null,
          operation: "hold",
          amount: seed.total,
        });
      }
      if (status === "completed") {
        const fee = Math.floor((seed.total * FEE_PERCENT) / 100);
        seq += 1;
        journal.push({
          type: "money",
          seq,
          orderId: seed.id,
          occurredAt,
          actor: SYSTEM,
          title: "Выплата фабрике после приёмки",
          detail: `комиссия платформы ${String(Math.round(fee / 100))} ₽`,
          operation: "release",
          amount: seed.total - fee,
        });
      }
    });

    const paidAt = journal.find(
      (event) => event.type === "status_changed" && event.to === "awaiting_confirmation",
    )?.occurredAt;
    const deliveredAt = journal.find(
      (event) => event.type === "status_changed" && event.to === "acceptance",
    )?.occurredAt;
    const acceptedAt = journal.find(
      (event) => event.type === "status_changed" && event.to === "completed",
    )?.occurredAt;

    const params = defaultParams(seed.qty, []);
    const no = String(seed.id);

    orders.push({
      orgId: seed.buyerOrgId,
      id: seed.id,
      status: seed.status,
      customerStage: customerStageOf(seed.status),
      bucket: orderBucketOf(seed.status),
      createdAt: submittedAt,
      updatedAt: journal.at(-1)?.occurredAt ?? submittedAt,
      offer: {
        id: offer.id,
        title: seed.title,
        factoryId: offer.factory.id,
        factoryName: offer.factory.name,
        factoryCity: offer.factory.city,
        tone: offer.tone ?? null,
      },
      quoteId: encodeQuoteId(
        { offerId: seed.offerId, qty: seed.qty, optionIds: [], deliveryId: "wb" },
        submittedMs,
      ),
      quote: {
        lines:
          seed.id === 4811
            ? [
                { kind: "base", title: "Партия 1 000 шт", amount: rub(168_000) },
                { kind: "option", title: "Доп. цвет принта", amount: rub(6_000) },
                { kind: "delivery", title: "Доставка до склада WB", amount: rub(9_400) },
              ]
            : [
                {
                  kind: "base",
                  title: `Партия ${String(seed.qty)} шт`,
                  amount: seed.total,
                },
              ],
        unitPrice: seed.unitPrice,
        subtotal: seed.id === 4811 ? rub(174_000) : seed.total,
        discountTotal: 0,
        delivery: seed.id === 4811 ? rub(9_400) : 0,
        total: seed.total,
        leadDays: 18,
        shipDate: seed.shipDate ?? undefined,
        validUntil: new Date(submittedMs + 30 * 24 * 60 * 60_000).toISOString(),
      },
      quoteValidUntil: new Date(submittedMs + 30 * 24 * 60 * 60_000).toISOString(),
      repeat: false,
      promo: null,
      params: seed.id === 4811 ? { ...params, optionIds: ["extra-print-color"] } : params,
      artwork: [
        {
          id: `art-${no}`,
          fileName: "logo_front.pdf",
          size: 1_258_291,
          contentType: "application/pdf",
          status: "approved",
          url: `#/artwork/${no}`,
          uploadedAt: submittedAt,
          error: null,
        },
      ],
      delivery: {
        optionId: "wb",
        title: "Доставка до склада WB",
        price: rub(9_400),
        kind: "marketplace_warehouse",
        address: "Коледино, Московская обл., склад WB",
        recipientName: null,
        recipientPhone: null,
        comment: null,
      },
      payer: {
        orgId: seed.buyerOrgId,
        name: DEMO_BUYER_NAMES[seed.buyerOrgId] ?? "Заказчик",
        inn: "7707083893",
        kpp: "770101001",
        legalAddress: null,
        accountantEmail: null,
      },
      paymentMethod: "escrow_full",
      paymentOptions: [],
      documents: [
        {
          id: `doc-offer-${no}`,
          kind: "offer_contract",
          title: `Договор-оферта № ${no}`,
          url: `#/documents/${no}/offer.pdf`,
          signature: "edo_signed",
          createdAt: submittedAt,
        },
        {
          id: `doc-spec-${no}`,
          kind: "specification",
          title: `Спецификация ${no}-С`,
          url: `#/documents/${no}/spec.pdf`,
          signature: "edo_signed",
          createdAt: submittedAt,
        },
        {
          id: `doc-invoice-${no}`,
          kind: "invoice",
          title: `Счёт ${no}-СЧ`,
          url: `#/documents/${no}/invoice.pdf`,
          signature: "none",
          createdAt: submittedAt,
        },
      ],
      payment:
        seed.status === "awaiting_payment"
          ? {
              invoiceNumber: `${no}-СЧ`,
              payeeName: "ООО «Партия» · номинальный счёт",
              payeeInn: "7700000000",
              payeeKpp: "770001001",
              bankName: "банк-партнёр платформы",
              bik: "044525999",
              account: `407028100000${no.padStart(8, "0")}`,
              correspondentAccount: "30101810400000000999",
              purpose: `Оплата по заказу № ${no}, спецификация ${no}-С. Без НДС`,
              amount: seed.total,
              amountDue: seed.total,
              dueAt: new Date(nowMs + 48 * 60 * 60_000).toISOString(),
            }
          : null,
      submittedAt,
      paidAt: paidAt ?? null,
      confirmDeadlineAt: seed.status === "awaiting_confirmation" ? confirmDeadline(nowMs) : null,
      shipDate: seed.shipDate,
      deliveredAt: deliveredAt ?? null,
      acceptedAt: acceptedAt ?? null,
      repeatDiscountPercent: null,
      repeatOfOrderId: null,
    });

    events[no] = journal;
  }

  return { orders, events };
}

/** «до 18:00 следующего рабочего дня» — дедлайн подтверждения заводом. */
export function confirmDeadline(nowMs: number): string {
  const day = addWorkingDays(new Date(nowMs), 1);
  day.setHours(18, 0, 0, 0);
  return day.toISOString();
}

/* ─────────────────────────────── мощность ─────────────────────────────── */

/** Две линии из макета `seller-capacity`. */
export const CAPACITY_LINES: CapacityLine[] = [
  { id: "line-1", title: "Линия 1 · футболки, поло", defaultUnitsPerWeek: 8000 },
  { id: "line-2", title: "Линия 2 · худи, свитшоты", defaultUnitsPerWeek: 2000 },
];

/** Коэффициенты изделий из макета: худи шьётся дольше футболки. */
export const ITEM_COEFFICIENTS: CapacityItemCoefficient[] = [
  { key: "tshirt", title: "Футболка", unitsPerItem: 1 },
  { key: "polo", title: "Поло", unitsPerItem: 1.4 },
  { key: "longsleeve", title: "Лонгслив", unitsPerItem: 1.2 },
  { key: "hoodie", title: "Худи / свитшот", unitsPerItem: 2.4 },
  { key: "shopper", title: "Шопер", unitsPerItem: 0.6 },
];

export const UNDERLOAD_RULE: UnderloadDiscountRule = {
  enabled: true,
  thresholdPct: 30,
  percent: 15,
  activeWeeks: [],
  note: null,
};

/** Внеплатформенная загрузка первых недель — «12 % свои клиенты» из макета. */
export const EXTERNAL_BY_WEEK_INDEX: Record<string, number[]> = {
  "line-1": [800, 800, 800, 800, 800, 800, 800, 800],
  "line-2": [400, 400, 400, 400, 0, 0, 0, 0],
};

/** На сколько недель вперёд у завода уже есть план. Остальные — «нет плана». */
export const PLANNED_WEEKS = 6;

/* ─────────────────────────────── образцы, отзывы, аудит ─────────────────────────────── */

export function seedSellerSamples(nowMs: number): SellerSampleRequest[] {
  const iso = (daysAgo: number) => new Date(nowMs - daysAgo * 86_400_000).toISOString();
  return [
    {
      id: "С-218",
      status: "in_work",
      title: "Футболка 180 г/м² × 2 · M, L · белый · тестовая печать",
      customer: "ООО «Кора», Москва",
      paid: rub(1_500),
      creditNote: "зачтётся в партию",
      dueNote: `Изготовить до ${formatDayMonth(addWorkingDays(new Date(nowMs), 2))}`,
      trackingNumber: null,
      orderId: null,
      tone: "a",
      createdAt: iso(3),
    },
    {
      id: "С-221",
      status: "new",
      title: "Поло пике × 1 · L · графит · вышивка по макету",
      customer: "ИП Лебедева, Иваново",
      paid: rub(1_800),
      creditNote: "зачтётся в партию",
      dueNote: null,
      trackingNumber: null,
      orderId: null,
      tone: "a",
      createdAt: iso(1),
    },
    {
      id: "С-197",
      status: "delivered",
      title: "Футболка 180 г/м² × 1",
      customer: "«ЭкоДом», Тверь",
      paid: rub(1_500),
      creditNote: "зачтено в заказ",
      dueNote: null,
      trackingNumber: "CDEK1024774",
      orderId: 4771,
      tone: "a",
      createdAt: iso(28),
    },
  ];
}

export function seedSellerQuestions(nowMs: number): SellerQuestion[] {
  const iso = (hoursAgo: number) => new Date(nowMs - hoursAgo * 3_600_000).toISOString();
  return [
    {
      id: 901,
      text: "Можно свой Pantone на 500 шт?",
      offerId: 2231,
      offerTitle: "Футболки 180 г/м² под СТМ",
      askedAt: iso(2),
      answer: null,
    },
    {
      id: 902,
      text: "Делаете ли вшивную бирку с составом на двух языках?",
      offerId: 2144,
      offerTitle: "Поло пике 210 г/м², вышивка",
      askedAt: iso(26),
      answer: null,
    },
    {
      id: 903,
      text: "Усадка после стирки?",
      offerId: 2231,
      offerTitle: "Футболки 180 г/м² под СТМ",
      askedAt: iso(9 * 24),
      answer: {
        text: "До 3 % по длине, ткань предварительно декатирована.",
        answeredAt: iso(9 * 24 - 1),
      },
    },
  ];
}

export function seedSellerReviews(nowMs: number): SellerReview[] {
  const iso = (daysAgo: number) => new Date(nowMs - daysAgo * 86_400_000).toISOString();
  return [
    {
      id: 801,
      author: "ИП Лебедева",
      rating: 4,
      text: "На 500 шт был перекос по размерной сетке, фабрика допечатала за свой счёт.",
      when: "июль 2026",
      orderId: 4756,
      reply: null,
    },
    {
      id: 802,
      author: "ООО «Кора», Москва",
      rating: 5,
      text: "Вторая партия подряд — плотность держат, принт без сдвига. Отгрузили на 2 дня раньше плана.",
      when: "август 2026",
      orderId: 4601,
      reply: { text: "Спасибо! Рады работать дальше.", repliedAt: iso(20) },
    },
  ];
}

export function seedSellerAudit(): SellerAudit {
  return {
    status: "passed",
    validUntil: "2027-06-12",
    reportUrl: "#/documents/audit/volna.pdf",
    visitAt: null,
    auditorName: "Петров А.",
    warning: {
      title: "Сертификат ТР ТС истекает 30 октября",
      text: "Загрузите новый — иначе предложения детской одежды будут скрыты.",
    },
    checks: [
      {
        key: "legal",
        title: "Юрлицо и реквизиты",
        basis: "Выписка ЕГРЮЛ, карточка предприятия",
        state: "ok",
        date: "12.06.2026",
        files: 2,
      },
      {
        key: "premises",
        title: "Право на помещение",
        basis: "Договор аренды цеха до 2029 г.",
        state: "ok",
        date: "12.06.2026",
        files: 1,
      },
      {
        key: "visit",
        title: "Выезд аудитора в цех",
        basis: "Фото- и видеофиксация, 140 рабочих мест",
        state: "ok",
        date: "10.06.2026",
        files: 14,
      },
      {
        key: "equipment",
        title: "Оборудование",
        basis: "Перечень: 86 швейных машин, 2 карусели шелкографии, DTF",
        state: "ok",
        date: "10.06.2026",
        files: 3,
      },
      {
        key: "samples",
        title: "Контрольные образцы",
        basis: "3 изделия, лабораторная проверка плотности и усадки",
        state: "ok",
        date: "12.06.2026",
        files: 3,
      },
      {
        key: "certificate",
        title: "Сертификат соответствия ТР ТС 017/2011",
        basis: "Истекает через 40 дней",
        state: "work",
        date: "до 30.10.2026",
        files: 1,
      },
    ],
  };
}

export function seedSellerProfile(orgId: string, orgName: string): SellerProfile {
  const factory = FACTORIES.volna;
  return {
    orgId,
    name: orgName,
    city: factory.city,
    specialization: factory.specialization,
    about: factory.about,
    since: factory.since,
    workers: factory.workers,
    capacityPerMonth: factory.capacityPerMonth,
    equipment: [
      "86 швейных машин",
      "2 карусели шелкографии (до 6 цветов)",
      "DTF-принтер",
      "вышивальный комплекс на 12 голов",
    ],
    gallery: [
      { label: "цех", tone: "a" },
      { label: "раскрой", tone: "b" },
      { label: "печать", tone: "c" },
      { label: "склад", tone: "d" },
    ],
    rating: factory.rating,
    reviews: factory.reviews,
    completedOrders: factory.completedOrders,
    onTimePct: factory.onTimePct,
    auditedAt: "2026-06-12",
    payoutAccount: "40702810900000008820",
  };
}

export function seedOnboarding(): FactoryOnboardingDraft {
  return {
    step: 1,
    specialization: null,
    city: null,
    workers: null,
    equipment: [],
    capacityPerMonth: null,
    itemCoefficients: {},
    firstOfferId: null,
    auditRequested: false,
    completed: false,
    updatedAt: null,
  };
}
