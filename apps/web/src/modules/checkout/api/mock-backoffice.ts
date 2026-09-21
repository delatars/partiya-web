import type {
  AdminDisputeCard,
  AdminDisputeList,
  AdminDisputeListQuery,
  AdminDisputeResolutionOption,
  AdminFactoryCard,
  AdminFactoryDecisionBody,
  AdminFactoryList,
  AdminFactoryListQuery,
  AdminFactoryRow,
  AdminFinanceOverview,
  AdminOfferCard,
  AdminOfferDecisionBody,
  AdminOfferList,
  AdminOfferListQuery,
  AdminOverview,
  AdminPayoutRow,
  AdminRanking,
  AdminTaxonomy,
  AdminTrancheRow,
  AdminTranchesPage,
  AdminTranchesQuery,
  ConfirmFundsRequest,
  Dispute,
  Me,
  PayoutConfirmedRequest,
  PromoCode,
  RankingPreview,
  RankingPreviewBody,
  RankingWeight,
  ResolveDisputeBody,
  ScheduleAuditVisitBody,
  UpdateRankingBody,
  UpdateTaxonomyCategoryBody,
} from "@partiya/api-contracts";

import { ApiError } from "@/shared/api";
import { formatIsoDate } from "@/shared/lib/dates";
import { DEMO_ORG_IDS, factoryOrgIdOf } from "@/shared/lib/demo";
import { distributeEscrow, isBalanced } from "@/shared/lib/dispute-escrow";
import { formatRub } from "@/shared/lib/format";
import { customerStageOf, orderStatusTitle } from "@/shared/lib/order-status";
import {
  findSellerOfferRecord,
  moderateSellerOfferRecord,
  moderationQueueRecords,
  offerChanges,
} from "@/shared/mocks";

import type { MockState } from "./mock-backend";
import { platformFeeOf } from "./mock-projections";
import { messagesOf, type MockOrder, type NewOrderEvent } from "./mock-seed";
import { confirmDeadline } from "./mock-seller-seed";

/* Мок бэк-офиса оператора — ARCHITECTURE.md, раздел 9.
 *
 * Тот же принцип, что у кабинета завода: оператор работает с ТЕМИ ЖЕ заказами, спорами
 * и предложениями, что заказчик и завод. «Подтвердить поступление» переводит настоящий
 * заказ из `awaiting_payment` в `awaiting_confirmation` и пишет событие в его журнал —
 * заказчик видит смену статуса, завод видит заказ в очереди «Новые».
 *
 * Своего у оператора здесь только справочники (таксономия, веса ранжирования, очередь
 * заводов) — их бэк тоже хранит отдельно. */

const P = "https://partiya.ru/problems/admin";

function problem(
  status: number,
  type: string,
  title: string,
  detail?: string,
  errors?: Record<string, string[]>,
): ApiError {
  return new ApiError({
    status,
    message: detail ?? title,
    problem: { type, title, status, detail, errors },
  });
}

const notOperator = () =>
  problem(
    403,
    `${P}/not-an-operator`,
    "Нет доступа",
    "Бэк-офис доступен только оператору платформы.",
  );

const notFound = (detail: string) => problem(404, `${P}/not-found`, "Не найдено", detail);

const commentRequired = (field = "comment") =>
  problem(422, `${P}/comment-required`, "Нужно обоснование", undefined, {
    [field]: ["Обоснование обязательно: его увидят обе стороны и аудит-лог"],
  });

/* ─────────────────────────────── справочники оператора ─────────────────────────────── */

export interface BackofficeStore {
  factories: AdminFactoryRow[];
  factoryCards: Record<string, AdminFactoryCard>;
  weights: RankingWeight[];
  promos: PromoCode[];
  rankingAppliedAt: string | null;
  taxonomy: AdminTaxonomy;
  /** Комментарии ручных операций — аудит-лог раздела 9. */
  auditLog: { at: string; actor: string; action: string; comment: string }[];
}

const DEFAULT_WEIGHTS: RankingWeight[] = [
  { key: "orders90", title: "Заказы за 90 дней", weight: 30 },
  { key: "conversion", title: "Конверсия просмотр → заказ", weight: 20 },
  { key: "rating", title: "Рейтинг (байесовский)", weight: 20 },
  { key: "capacity", title: "Свободная мощность", weight: 15 },
  { key: "audit", title: "Аудит платформы", weight: 10 },
  { key: "response", title: "Скорость ответа", weight: 5 },
];

const PENALTIES = [
  { key: "declined", title: "Отклонённый / неподтверждённый заказ", effect: "−8 на 30 дней" },
  { key: "late", title: "Просрочка отгрузки", effect: "−5 на 30 дней" },
  { key: "dispute_lost", title: "Проигранный спор", effect: "−12 на 90 дней" },
  { key: "no_capacity", title: "План мощности не обновлён", effect: "скрыть из выдачи" },
];

const BADGES = [
  {
    key: "hit",
    title: "Хит",
    tone: "hot" as const,
    rule: "верхние 10 % по скору в категории · пересчёт раз в сутки",
  },
  {
    key: "underload",
    title: "−15 % мощность",
    tone: "disc" as const,
    rule: "завод включил скидку на недозагруз, неделя < 30 %",
  },
  { key: "audit", title: "аудит", tone: "ok" as const, rule: "действующий аудит платформы" },
];

function seedPromos(): PromoCode[] {
  return [
    {
      code: "FIRST5",
      percent: 5,
      condition: "первый заказ, до 15 000 ₽, за счёт платформы",
      used: 214,
      validUntil: null,
      enabled: true,
    },
    {
      code: "IVANOVO",
      percent: 3,
      condition: "фабрики Иваново, до 31.10",
      used: 37,
      validUntil: "2026-10-31",
      enabled: true,
    },
  ];
}

function seedTaxonomy(): AdminTaxonomy {
  const attributes = [
    {
      key: "material",
      label: "Материал",
      kind: "select" as const,
      options: ["Кулирная гладь, хлопок 100 %", "Кулирка с лайкрой", "Пике"],
      required: true,
      usedIn: ["фасет", "форма SKU", "характеристики"],
    },
    {
      key: "density",
      label: "Плотность, г/м²",
      kind: "number" as const,
      required: true,
      unit: "г/м²",
      usedIn: ["фасет-диапазон", "характеристики"],
    },
    {
      key: "fit",
      label: "Крой",
      kind: "multiselect" as const,
      options: ["классический", "оверсайз", "женский приталенный", "детский"],
      required: true,
      usedIn: ["форма SKU", "конструктор заказа"],
    },
    {
      key: "sizes",
      label: "Размеры",
      kind: "multiselect" as const,
      options: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
      required: true,
      usedIn: ["конструктор заказа (сетка)"],
    },
    {
      key: "print",
      label: "Нанесение",
      kind: "multiselect" as const,
      options: ["шелкография до 6 цв.", "DTF", "вышивка", "сублимация"],
      required: false,
      usedIn: ["фасет", "конструктор заказа", "влияет на цену"],
    },
    {
      key: "colors",
      label: "Цвета ткани",
      kind: "text" as const,
      required: true,
      usedIn: ["конструктор заказа"],
    },
  ];

  return {
    tree: [
      {
        slug: "tekstil",
        path: ["tekstil"],
        title: "Текстиль",
        offersCount: 214,
        children: [
          {
            slug: "futbolki",
            path: ["tekstil", "futbolki"],
            title: "Футболки",
            offersCount: 98,
            children: [],
          },
          {
            slug: "hudi",
            path: ["tekstil", "hudi"],
            title: "Худи и свитшоты",
            offersCount: 61,
            children: [],
          },
          { slug: "polo", path: ["tekstil", "polo"], title: "Поло", offersCount: 22, children: [] },
          {
            slug: "sumki",
            path: ["tekstil", "sumki"],
            title: "Сумки и шоперы",
            offersCount: 33,
            children: [],
          },
        ],
      },
      {
        slug: "kosmetika",
        path: ["kosmetika"],
        title: "Косметика и БАДы",
        offersCount: 86,
        children: [],
      },
      { slug: "svechi", path: ["svechi"], title: "Свечи и декор", offersCount: 132, children: [] },
      { slug: "upakovka", path: ["upakovka"], title: "Упаковка", offersCount: 167, children: [] },
    ],
    selected: {
      path: ["tekstil", "futbolki"],
      title: "Текстиль › Футболки",
      defaultCapacityUnitsPerItem: 1,
      unit: "шт",
      attributes,
    },
  };
}

function seedFactories(): { rows: AdminFactoryRow[]; cards: Record<string, AdminFactoryCard> } {
  const rows: AdminFactoryRow[] = [
    {
      orgId: "org-severny-shov",
      name: "ООО «Северный шов»",
      city: "Вологда",
      inn: "3525000000",
      stage: "application",
      nextStep: "ждёт проверки документов",
      appliedAt: "2026-09-20",
      auditValidUntil: null,
      urgent: false,
    },
    {
      orgId: "org-trikotazh-m",
      name: "ООО «Трикотаж-М»",
      city: "Чебоксары",
      inn: "2130000000",
      stage: "documents_ok",
      nextStep: "назначить выезд аудитора",
      appliedAt: "2026-09-18",
      auditValidUntil: null,
      urgent: true,
    },
    {
      orgId: "org-gusev",
      name: "ИП Гусев",
      city: "Иваново",
      inn: "370200000000",
      stage: "visit_scheduled",
      nextStep: "аудитор: Петров",
      appliedAt: "2026-09-15",
      auditValidUntil: null,
      urgent: false,
    },
    {
      orgId: DEMO_ORG_IDS.volna,
      name: "ООО «Волна»",
      city: "Иваново",
      inn: "3702012348",
      stage: "passed",
      nextStep: null,
      appliedAt: null,
      auditValidUntil: "2027-06-12",
      urgent: false,
    },
    {
      orgId: "org-meridian",
      name: "ООО «Меридиан»",
      city: "Тверь",
      inn: "6900000000",
      stage: "no_audit",
      nextStep: "2 отклонённых заказа подряд",
      appliedAt: null,
      auditValidUntil: null,
      urgent: false,
    },
  ];

  const checklist = (done: number) =>
    [
      "ЕГРЮЛ: действующее, без массового адреса",
      "Нет исполнительных производств",
      "Договор аренды цеха",
      "Выезд аудитора — назначить",
      "Оборудование и штат",
      "Контрольные образцы",
    ].map((title, index) => ({
      key: `check-${String(index)}`,
      title,
      state:
        index < done ? ("done" as const) : index === done ? ("now" as const) : ("todo" as const),
    }));

  const cards: Record<string, AdminFactoryCard> = {};
  for (const row of rows) {
    cards[row.orgId] = {
      orgId: row.orgId,
      name: row.name,
      city: row.city,
      inn: row.inn,
      stage: row.stage,
      appliedAt: row.appliedAt,
      checks: checklist(row.stage === "application" ? 1 : row.stage === "documents_ok" ? 3 : 6),
      auditors: ["Петров А.", "Ильина М."],
      auditorName: row.stage === "visit_scheduled" ? "Петров А." : null,
      visitAt: row.stage === "visit_scheduled" ? "2026-09-23" : null,
      declinedInRow: row.orgId === "org-meridian" ? 2 : 0,
    };
  }
  return { rows, cards };
}

export function seedBackoffice(): BackofficeStore {
  const { rows, cards } = seedFactories();
  return {
    factories: rows,
    factoryCards: cards,
    weights: DEFAULT_WEIGHTS.map((item) => ({ ...item })),
    promos: seedPromos(),
    rankingAppliedAt: null,
    taxonomy: seedTaxonomy(),
    auditLog: [],
  };
}

/* ─────────────────────────────── контекст ─────────────────────────────── */

export interface BackofficeContext {
  now: () => number;
  getState: () => MockState;
  save: () => void;
  respond: <T>(work: () => T | Promise<T>) => Promise<T>;
  getMe: () => Promise<Me>;
  emit: (orderId: number, event: NewOrderEvent) => void;
  touch: (order: MockOrder) => void;
  ensureFactorySeed: () => void;
}

export interface MockBackofficeSlice {
  getAdminOverview(): Promise<AdminOverview>;
  listAdminFactories(query?: AdminFactoryListQuery): Promise<AdminFactoryList>;
  decideAdminFactory(orgId: string, body: AdminFactoryDecisionBody): Promise<AdminFactoryList>;
  scheduleAuditVisit(orgId: string, body: ScheduleAuditVisitBody): Promise<AdminFactoryList>;
  listAdminOffers(query?: AdminOfferListQuery): Promise<AdminOfferList>;
  decideAdminOffer(offerId: number, body: AdminOfferDecisionBody): Promise<AdminOfferList>;
  listAdminDisputes(query?: AdminDisputeListQuery): Promise<AdminDisputeList>;
  getAdminDispute(orderId: number): Promise<AdminDisputeCard>;
  resolveAdminDispute(
    orderId: number,
    body: ResolveDisputeBody,
    idempotencyKey: string,
  ): Promise<AdminDisputeCard>;
  getAdminFinance(): Promise<AdminFinanceOverview>;
  listAdminTranches(query?: AdminTranchesQuery): Promise<AdminTranchesPage>;
  confirmTrancheFunds(
    trancheId: string,
    body: ConfirmFundsRequest,
    idempotencyKey: string,
  ): Promise<AdminFinanceOverview>;
  confirmDealPayout(
    dealId: string,
    body: PayoutConfirmedRequest,
    idempotencyKey: string,
  ): Promise<AdminFinanceOverview>;
  getAdminTaxonomy(path?: string): Promise<AdminTaxonomy>;
  updateTaxonomyCategory(path: string, body: UpdateTaxonomyCategoryBody): Promise<AdminTaxonomy>;
  getAdminRanking(): Promise<AdminRanking>;
  updateAdminRanking(body: UpdateRankingBody): Promise<AdminRanking>;
  previewAdminRanking(body: RankingPreviewBody): Promise<RankingPreview>;
}

const SYSTEM = { kind: "system" as const, name: "Система", orgId: null };
const OPERATOR = { kind: "operator" as const, name: "Оператор платформы", orgId: null };

/** Номер счёта по заказу: у одного заказа один транш (схема `escrow_full`). */
function trancheIdOf(orderId: number): string {
  return `tr-${String(orderId)}-1`;
}

function dealIdOf(orderId: number): string {
  return `deal-${String(orderId)}`;
}

function orderIdOfTranche(trancheId: string): number | null {
  const match = /^tr-(\d+)-\d+$/.exec(trancheId);
  return match?.[1] === undefined ? null : Number(match[1]);
}

function orderIdOfDeal(dealId: string): number | null {
  const match = /^deal-(\d+)$/.exec(dealId);
  return match?.[1] === undefined ? null : Number(match[1]);
}

export function createBackofficeSlice(ctx: BackofficeContext): MockBackofficeSlice {
  const { now, getState, save, respond } = ctx;

  async function requireOperator(): Promise<void> {
    const me = (await ctx.getMe()) as Me & { platformOperator?: boolean };
    // ⚠ Q-110: признака оператора в контракте `/me` нет — фронт читает расширение моков
    if (me.platformOperator !== true) throw notOperator();
    ctx.ensureFactorySeed();
    ensureStore();
  }

  function ensureStore(): BackofficeStore {
    const state = getState();
    state.backoffice ??= seedBackoffice();
    return state.backoffice;
  }

  function storeOf(): BackofficeStore {
    return ensureStore();
  }

  function allOrders(): MockOrder[] {
    return getState().orders.filter((order) => order.status !== "draft");
  }

  function disputesOf(): { order: MockOrder; dispute: Dispute }[] {
    const state = getState();
    return Object.values(state.disputes)
      .map((dispute) => {
        const order = state.orders.find((row) => row.id === dispute.orderId);
        return order ? { order, dispute } : null;
      })
      .filter((item): item is { order: MockOrder; dispute: Dispute } => item !== null);
  }

  /* ───────── очередь счетов и выплат ───────── */

  function trancheRowOf(order: MockOrder): AdminTrancheRow {
    const dueAt = order.payment?.dueAt ?? new Date(now() + 48 * 3_600_000).toISOString();
    return {
      trancheId: trancheIdOf(order.id),
      trancheNo: 1,
      dealId: dealIdOf(order.id),
      dealNo: 4900 + (order.id - 4700),
      payerOrgId: order.orgId,
      payeeOrgId: factoryOrgIdOf(order.offer.factoryId) ?? "",
      amount: order.payment?.amountDue ?? order.quote.total,
      reference:
        order.payment?.purpose ??
        `Оплата по заказу № ${String(order.id)}, спецификация ${String(order.id)}-С. Без НДС`,
      dueAt,
      status: "awaiting_funds",
      overdue: Date.parse(dueAt) < now(),
      orderId: order.id,
      payerName: order.payer?.name ?? "Заказчик",
      subjectTitle: order.offer.title,
    };
  }

  function payoutRowOf(order: MockOrder): AdminPayoutRow {
    const fee = platformFeeOf(order.quote.total);
    const updSigned = order.documents
      .filter((doc) => doc.title.startsWith("УПД"))
      .every((doc) => doc.signature === "edo_signed");
    const paid =
      order.acceptedAt !== null && order.acceptedAt !== undefined && order.payoutAt != null;
    return {
      dealId: dealIdOf(order.id),
      dealNo: 4900 + (order.id - 4700),
      orderId: order.id,
      factoryName: order.offer.factoryName,
      subtitle: `№ ${String(order.id)} · ${order.offer.title}`,
      amount: order.quote.total - fee,
      status: paid ? "released" : "funded",
      ready: !paid && updSigned,
      blocker: paid ? "выплата проведена" : updSigned ? null : "УПД не подписан заказчиком",
    };
  }

  function financeOverview(): AdminFinanceOverview {
    const orders = allOrders();
    const awaiting = orders.filter((order) => order.status === "awaiting_payment");
    const held = orders.filter(
      (order) =>
        order.paidAt !== null && order.status !== "completed" && order.status !== "refunded",
    );
    const completed = orders.filter((order) => order.status === "completed");
    const escrowHeld = held.reduce((sum, order) => sum + order.quote.total, 0);
    const payouts = completed.map(payoutRowOf);
    const pending = payouts.filter((row) => row.status !== "released");
    const feeTotal = completed.reduce((sum, order) => sum + platformFeeOf(order.quote.total), 0);
    const paidOut = completed
      .filter((order) => order.payoutAt != null)
      .reduce((sum, order) => sum + order.quote.total - platformFeeOf(order.quote.total), 0);
    const nominalExpected = escrowHeld + pending.reduce((sum, row) => sum + row.amount, 0);

    return {
      reconciliation: {
        byKind: [
          { kind: "escrow_hold", title: "В эскроу", balance: escrowHeld },
          {
            kind: "factory_payable",
            title: "Начислено заводам",
            balance: pending.reduce((sum, row) => sum + row.amount, 0),
          },
          { kind: "platform_fee", title: "Комиссия платформы", balance: feeTotal },
          { kind: "payout_settled", title: "Выплачено", balance: paidOut },
        ],
        accounts: [],
        journalTotal: 0,
        unbalancedEntries: 0,
        escrowHeld,
        nominalExpected,
        consistent: true,
      },
      // ⚠ Q-10: выписки банка-партнёра нет — сравнивать не с чем, поле честно пустое
      nominalActual: null,
      discrepancy: 0,
      lastCheckedAt: new Date(now()).toISOString(),
      tranches: awaiting.map(trancheRowOf),
      payouts,
      payoutTodayTotal: pending
        .filter((row) => row.ready)
        .reduce((sum, row) => sum + row.amount, 0),
      payoutTodayFactories: new Set(
        pending.filter((row) => row.ready).map((row) => row.factoryName),
      ).size,
    };
  }

  /* ───────── карточка спора ───────── */

  function resolutionOptions(order: MockOrder, dispute: Dispute): AdminDisputeResolutionOption[] {
    const total = order.quote.total;
    const affected = dispute.affectedQty ?? order.params.qty;
    const partial = Math.min(total, order.quote.unitPrice * affected);
    const build = (
      resolution: AdminDisputeResolutionOption["resolution"],
      title: string,
      description: string,
      amount: number,
    ): AdminDisputeResolutionOption => {
      const split = distributeEscrow(total, resolution, amount);
      return {
        resolution,
        title,
        description,
        customerAmount: split.customerAmount,
        factoryAmount: split.factoryAmount,
        fee: split.fee,
        available: true,
      };
    };
    return [
      build("rework", "Допечатка за счёт фабрики", "Эскроу заблокирован до приёмки допечатки.", 0),
      build(
        "partial_refund",
        `Частичный возврат · ${formatRub(partial)}`,
        `Возврат за ${String(affected)} из ${String(order.params.qty)} шт. Остальное выплачивается фабрике.`,
        partial,
      ),
      build("full_refund", "Полный возврат", "Партия возвращается фабрике за её счёт.", total),
      build("rejected", "Отклонить претензию", "Нарушения не найдено, деньги уходят фабрике.", 0),
    ];
  }

  function disputeCard(order: MockOrder, dispute: Dispute): AdminDisputeCard {
    const events = getState().events[String(order.id)] ?? [];
    const factoryEvidence = dispute.evidence.filter((item) => item.uploadedBy.kind === "factory");
    const customerEvidence = dispute.evidence.filter((item) => item.uploadedBy.kind !== "factory");
    return {
      disputeId: dispute.id,
      orderId: order.id,
      status: dispute.status,
      orderTitle: `${order.offer.title}, ${String(order.params.qty)} шт`,
      customerName: order.payer?.name ?? "Заказчик",
      factoryName: `ООО «${order.offer.factoryName}»`,
      reasonTitle: dispute.reasonTitle,
      affectedQty: dispute.affectedQty,
      totalQty: dispute.totalQty,
      openedAt: dispute.openedAt,
      decisionDueAt: dispute.decisionDueAt,
      escrowAmount: dispute.escrowAmount,
      parties: [
        {
          side: "customer",
          title: "Заказчик",
          text: dispute.description,
          evidence: customerEvidence,
          badge: null,
        },
        {
          side: "factory",
          title: "Фабрика",
          text:
            messagesOf(events, "dispute").find((message) => !message.own)?.text ??
            "Ответ фабрики ещё не поступил.",
          evidence: factoryEvidence,
          badge: dispute.status === "factory_replied" ? "Претензия признана" : null,
        },
      ],
      evidence: [
        {
          key: "spec",
          title: `Спецификация ${String(order.id)}-С`,
          fact: order.params.sizes.map((line) => `${line.size} ${String(line.qty)}`).join(" · "),
          verdict: "документ сделки",
          href: `#/documents/${String(order.id)}/spec.pdf`,
        },
        {
          key: "qc",
          title: "Отчёт контроля качества",
          fact: "выборка 5 % по ГОСТ",
          verdict: "замеры приложены фабрикой",
          href: null,
        },
        {
          key: "journal",
          title: "Журнал заказа",
          fact: `${String(events.length)} событий`,
          verdict: "—",
          href: `/account/orders/${String(order.id)}`,
        },
        {
          key: "chat",
          title: "Чат",
          fact: `${String(messagesOf(events, "dispute").length)} сообщений в ветке спора`,
          verdict: "переписка сторон",
          href: null,
        },
      ],
      messages: messagesOf(events, "dispute"),
      events,
      options: resolutionOptions(order, dispute),
      decision: dispute.decision,
    };
  }

  /* ───────── сам слайс ───────── */

  return {
    getAdminOverview(): Promise<AdminOverview> {
      return respond(async () => {
        await requireOperator();
        const store = storeOf();
        const orders = allOrders();
        const finance = financeOverview();
        const moderation = moderationQueueRecords();
        const openDisputes = disputesOf().filter(
          ({ dispute }) => dispute.status !== "resolved" && dispute.status !== "withdrawn",
        );
        const factoryQueue = store.factories.filter(
          (row) =>
            row.stage === "application" ||
            row.stage === "documents_ok" ||
            row.stage === "visit_scheduled",
        );
        const inWork = orders.filter(
          (order) => order.paidAt !== null && order.status !== "completed",
        );
        const gmv = orders
          .filter((order) => order.paidAt !== null)
          .reduce((sum, order) => sum + order.quote.total, 0);
        const fee = orders
          .filter((order) => order.status === "completed")
          .reduce((sum, order) => sum + platformFeeOf(order.quote.total), 0);

        const stageCounts: { key: string; title: string; status: string[] }[] = [
          { key: "awaiting_payment", title: "Ожидают оплаты", status: ["awaiting_payment"] },
          {
            key: "awaiting_confirmation",
            title: "Ждут подтверждения завода",
            status: ["awaiting_confirmation"],
          },
          {
            key: "prep",
            title: "Макет / сырьё",
            status: ["confirmed", "artwork_review", "materials"],
          },
          { key: "production", title: "Производство", status: ["in_production"] },
          { key: "qc", title: "Контроль качества", status: ["quality_control"] },
          { key: "acceptance", title: "Приёмка", status: ["shipped", "acceptance"] },
          { key: "dispute", title: "Спор", status: ["dispute"] },
        ];
        const stageRows = stageCounts.map((row) => ({
          key: row.key,
          title: row.title,
          count: orders.filter((order) => row.status.includes(order.status)).length,
        }));
        const maxStage = Math.max(1, ...stageRows.map((row) => row.count));

        const today = new Date(now());
        const monthNames = [
          "января",
          "февраля",
          "марта",
          "апреля",
          "мая",
          "июня",
          "июля",
          "августа",
          "сентября",
          "октября",
          "ноября",
          "декабря",
        ];

        return {
          todayNote: `Сегодня, ${String(today.getDate())} ${monthNames[today.getMonth()] ?? ""} · очереди и то, что горит`,
          gmvMonth: gmv,
          gmvDeltaPct: 22,
          escrowTotal: finance.reconciliation.escrowHeld,
          escrowOrders: inWork.length,
          feeMonth: fee,
          ordersInWork: inWork.length,
          ordersOverdue: orders.filter(
            (order) =>
              order.shipDate !== null &&
              Date.parse(`${order.shipDate}T00:00:00`) < now() &&
              order.status !== "completed" &&
              order.status !== "acceptance",
          ).length,
          queues: [
            {
              key: "offers",
              title: "Модерация предложений",
              count: moderation.length,
              note: moderation.length === 0 ? "очередь пуста" : "SLA 1 рабочий день",
              href: "/admin/moderation",
            },
            {
              key: "factories",
              title: "Заявки заводов",
              count: factoryQueue.length,
              note: "1 ждёт выезда аудитора",
              href: "/admin/moderation",
            },
            {
              key: "disputes",
              title: "Споры",
              count: openDisputes.length,
              note: openDisputes.length === 0 ? "решений не ждут" : "решение сегодня",
              href: "/admin/disputes",
            },
            {
              key: "payments",
              title: "Ожидают поступления",
              count: finance.tranches.length,
              note: finance.tranches.length === 0 ? "все счета оплачены" : "сопоставить с выпиской",
              href: "/admin/finance",
            },
            {
              key: "payouts",
              title: "Очередь выплат",
              count: finance.payouts.filter((row) => row.ready).length,
              note: formatRub(finance.payoutTodayTotal),
              href: "/admin/finance",
            },
          ],
          alerts: [
            ...(finance.tranches.length > 0
              ? [
                  {
                    id: "unmatched",
                    kind: "warn" as const,
                    title: `${String(finance.tranches.length)} счёт(а) ждут поступления`,
                    text: "Сверьте с выпиской банка-партнёра и подтвердите поступление.",
                    actionLabel: "К финансам",
                    actionHref: "/admin/finance",
                  },
                ]
              : []),
            {
              id: "meridian",
              kind: "warn" as const,
              title: "Завод «Меридиан» не подтвердил 2 заказа подряд",
              text: "Автоматическое понижение в выдаче включено. Связаться с менеджером завода.",
              actionLabel: null,
              actionHref: null,
            },
          ],
          stages: stageRows.map((row) => ({
            ...row,
            pct: Math.round((row.count / maxStage) * 100),
          })),
        };
      });
    },

    listAdminFactories(query: AdminFactoryListQuery = {}): Promise<AdminFactoryList> {
      return respond(async () => {
        await requireOperator();
        const store = storeOf();
        const tab = query.tab ?? "queue";
        const byTab = (row: AdminFactoryRow) => {
          switch (tab) {
            case "active":
              return row.stage === "passed" || row.stage === "no_audit";
            case "suspended":
              return row.stage === "suspended" || row.stage === "rejected";
            case "audit_expiring":
              return row.auditValidUntil !== null;
            default:
              return (
                row.stage === "application" ||
                row.stage === "documents_ok" ||
                row.stage === "visit_scheduled"
              );
          }
        };
        const items = store.factories.filter(byTab);
        // Выбранная строка приходит из URL экрана; без выбора раскрываем первую горящую.
        const selectedRow =
          items.find((row) => row.orgId === query.selected) ??
          items.find((row) => row.urgent) ??
          items[0];
        return {
          items,
          total: items.length,
          counts: {
            queue: store.factories.filter(
              (row) =>
                row.stage === "application" ||
                row.stage === "documents_ok" ||
                row.stage === "visit_scheduled",
            ).length,
            active: store.factories.filter(
              (row) => row.stage === "passed" || row.stage === "no_audit",
            ).length,
            suspended: store.factories.filter(
              (row) => row.stage === "suspended" || row.stage === "rejected",
            ).length,
            auditExpiring: store.factories.filter((row) => row.auditValidUntil !== null).length,
          },
          selected: selectedRow ? (store.factoryCards[selectedRow.orgId] ?? null) : null,
        };
      });
    },

    decideAdminFactory(orgId: string, body: AdminFactoryDecisionBody): Promise<AdminFactoryList> {
      return respond(async () => {
        await requireOperator();
        const store = storeOf();
        const row = store.factories.find((item) => item.orgId === orgId);
        if (!row) throw notFound("Завод");
        const comment = body.comment.trim();
        if (body.decision !== "approve" && comment.length === 0) throw commentRequired();

        switch (body.decision) {
          case "approve":
            row.stage = "passed";
            row.nextStep = null;
            row.urgent = false;
            row.auditValidUntil = new Date(now() + 365 * 86_400_000).toISOString().slice(0, 10);
            break;
          case "reject":
            row.stage = "rejected";
            row.nextStep = comment;
            row.urgent = false;
            break;
          case "suspend":
            row.stage = "suspended";
            row.nextStep = comment;
            break;
          case "resume":
            row.stage = "no_audit";
            row.nextStep = null;
            break;
        }
        const card = store.factoryCards[orgId];
        if (card) card.stage = row.stage;
        store.auditLog.push({
          at: new Date(now()).toISOString(),
          actor: "Оператор",
          action: `factory:${body.decision}:${orgId}`,
          comment,
        });
        save();
        return this.listAdminFactories({ tab: "queue" });
      });
    },

    scheduleAuditVisit(orgId: string, body: ScheduleAuditVisitBody): Promise<AdminFactoryList> {
      return respond(async () => {
        await requireOperator();
        const store = storeOf();
        const row = store.factories.find((item) => item.orgId === orgId);
        const card = store.factoryCards[orgId];
        if (!row || !card) throw notFound("Завод");
        if (body.auditorName.trim().length === 0 || body.visitAt.trim().length === 0) {
          throw problem(422, `${P}/invalid`, "Заполните аудитора и дату", undefined, {
            auditorName: body.auditorName.trim().length === 0 ? ["Выберите аудитора"] : [],
            visitAt: body.visitAt.trim().length === 0 ? ["Укажите дату выезда"] : [],
          });
        }
        row.stage = "visit_scheduled";
        row.nextStep = `аудитор: ${body.auditorName}`;
        row.urgent = false;
        card.stage = "visit_scheduled";
        card.auditorName = body.auditorName;
        card.visitAt = body.visitAt;
        card.checks = card.checks.map((check, index) => ({
          ...check,
          state: index <= 3 ? "done" : index === 4 ? "now" : "todo",
        }));
        save();
        return this.listAdminFactories({ tab: "queue" });
      });
    },

    listAdminOffers(query: AdminOfferListQuery = {}): Promise<AdminOfferList> {
      return respond(async () => {
        await requireOperator();
        const tab = query.tab ?? "queue";
        const records = tab === "queue" ? moderationQueueRecords() : [];
        const items = records.map((record) => {
          const changes = offerChanges(record);
          const waitingMs = now() - Date.parse(record.updatedAt);
          const hours = Math.max(1, Math.round(waitingMs / 3_600_000));
          // «286 ч» читается хуже, чем «12 дн.»: у очереди SLA в рабочих днях
          const waiting =
            hours >= 48 ? `${String(Math.round(hours / 24))} дн.` : `${String(hours)} ч`;
          return {
            offerId: record.id,
            title: record.draft.title,
            factoryName: "Волна",
            factoryOrgId: record.orgId,
            kind: record.published === null ? ("new" as const) : ("update" as const),
            kindNote:
              record.published === null
                ? "Новое"
                : `Правка v${String(record.version - 1)} → v${String(record.version)}`,
            flags: changes.flatMap((change) => (change.flag ? [change.flag] : [])),
            waiting,
            queuedAt: record.updatedAt,
            urgent: hours >= 5,
          };
        });
        const first = records.find((record) => record.id === query.selected) ?? records[0];
        const selected: AdminOfferCard | null = first
          ? {
              offerId: first.id,
              title: first.draft.title,
              factoryName: "Волна",
              factoryCity: "Иваново",
              kind: first.published === null ? "new" : "update",
              fromVersion: first.published === null ? null : first.version - 1,
              toVersion: first.version,
              changes: offerChanges(first),
              images: first.draft.images.map((image) => ({
                id: image.id,
                label: image.label,
                tone: image.tone,
              })),
              suggestedComment: null,
            }
          : null;

        return {
          items,
          total: items.length,
          counts: { queue: moderationQueueRecords().length, complaints: 0, autoflags: 0 },
          slaNote: "1 рабочий день",
          selected,
        };
      });
    },

    decideAdminOffer(offerId: number, body: AdminOfferDecisionBody): Promise<AdminOfferList> {
      return respond(async () => {
        await requireOperator();
        const record = findSellerOfferRecord(offerId);
        if (!record || record.status !== "moderation") throw notFound("Предложение в очереди");
        const comment = body.comment.trim();
        if (body.decision === "reject" && comment.length === 0) throw commentRequired();
        moderateSellerOfferRecord(
          offerId,
          body.decision === "approve",
          comment,
          new Date(now()).toISOString(),
        );
        storeOf().auditLog.push({
          at: new Date(now()).toISOString(),
          actor: "Оператор",
          action: `offer:${body.decision}:${String(offerId)}`,
          comment,
        });
        save();
        return this.listAdminOffers({ tab: "queue" });
      });
    },

    listAdminDisputes(query: AdminDisputeListQuery = {}): Promise<AdminDisputeList> {
      return respond(async () => {
        await requireOperator();
        const tab = query.tab ?? "open";
        const all = disputesOf();
        const open = all.filter(
          ({ dispute }) => dispute.status !== "resolved" && dispute.status !== "withdrawn",
        );
        const shown =
          tab === "resolved" ? all.filter(({ dispute }) => dispute.status === "resolved") : open;
        const items = shown.map(({ order, dispute }) => ({
          disputeId: dispute.id,
          orderId: order.id,
          status: dispute.status,
          parties: `${order.payer?.name ?? "Заказчик"} ↔ ООО «${order.offer.factoryName}»`,
          reasonTitle: dispute.reasonTitle,
          openedAt: dispute.openedAt,
          decisionDueAt: dispute.decisionDueAt,
          escrowAmount: dispute.escrowAmount,
          urgent:
            dispute.decisionDueAt !== null &&
            Date.parse(dispute.decisionDueAt) - now() < 2 * 86_400_000,
        }));
        const first = shown[0];
        return {
          items,
          total: items.length,
          counts: {
            open: open.length,
            dueToday: items.filter((item) => item.urgent).length,
            resolved: all.filter(({ dispute }) => dispute.status === "resolved").length,
          },
          selected: first ? disputeCard(first.order, first.dispute) : null,
        };
      });
    },

    getAdminDispute(orderId: number): Promise<AdminDisputeCard> {
      return respond(async () => {
        await requireOperator();
        const state = getState();
        const dispute = state.disputes[String(orderId)];
        const order = state.orders.find((row) => row.id === orderId);
        if (!dispute || !order) throw notFound(`Спор по заказу № ${String(orderId)}`);
        return disputeCard(order, dispute);
      });
    },

    resolveAdminDispute(
      orderId: number,
      body: ResolveDisputeBody,
      idempotencyKey: string,
    ): Promise<AdminDisputeCard> {
      return respond(async () => {
        await requireOperator();
        const state = getState();
        const dispute = state.disputes[String(orderId)];
        const order = state.orders.find((row) => row.id === orderId);
        if (!dispute || !order) throw notFound(`Спор по заказу № ${String(orderId)}`);

        const stored = state.idempotency[idempotencyKey];
        if (stored?.kind === "resolve-dispute" && stored.orderId === orderId) {
          return disputeCard(order, dispute);
        }
        if (dispute.status === "resolved") {
          throw problem(409, `${P}/already-decided`, "Решение уже вынесено");
        }
        const comment = body.comment.trim();
        if (comment.length === 0) throw commentRequired();

        const total = dispute.escrowAmount;
        const split = distributeEscrow(total, body.resolution, body.amount);
        if (!isBalanced(total, split)) {
          throw problem(
            422,
            `${P}/amount-mismatch`,
            "Распределение не сходится",
            "Сумма возврата, выплаты и комиссии обязана равняться сумме эскроу.",
          );
        }

        const occurredAt = new Date(now()).toISOString();
        dispute.status = "resolved";
        dispute.escrowBlocked = body.resolution === "rework";
        dispute.decision = {
          inFavorOf: body.inFavorOf,
          resolution: body.resolution,
          amount: split.customerAmount > 0 ? split.customerAmount : null,
          comment,
          decidedAt: occurredAt,
          decidedBy: OPERATOR,
        };

        const from = order.status;
        if (body.resolution === "rework") {
          // допечатка: партия возвращается в производство, деньги остаются заблокированы
          order.status = "in_production";
        } else if (body.resolution === "full_refund") {
          order.status = "refunded";
        } else {
          order.status = "completed";
          order.acceptedAt = occurredAt;
        }
        ctx.touch(order);

        ctx.emit(order.id, {
          type: "status_changed",
          orderId: order.id,
          occurredAt,
          actor: OPERATOR,
          title: "Оператор вынес решение по спору",
          detail: comment,
          from,
          to: order.status,
          stage: customerStageOf(order.status),
        });
        if (split.customerAmount > 0) {
          ctx.emit(order.id, {
            type: "money",
            orderId: order.id,
            occurredAt,
            actor: SYSTEM,
            title: "Возврат заказчику по решению спора",
            detail: `распределение эскроу: заказчику ${formatRub(split.customerAmount)}`,
            operation: "refund",
            amount: split.customerAmount,
          });
        }
        if (split.factoryAmount > 0 && body.resolution !== "rework") {
          ctx.emit(order.id, {
            type: "money",
            orderId: order.id,
            occurredAt,
            actor: SYSTEM,
            title: "Выплата фабрике по решению спора",
            detail: `комиссия платформы ${formatRub(split.fee)}`,
            operation: "release",
            amount: split.factoryAmount,
          });
        }
        state.idempotency[idempotencyKey] = { kind: "resolve-dispute", orderId };
        storeOf().auditLog.push({
          at: occurredAt,
          actor: "Оператор",
          action: `dispute:${body.resolution}:${String(orderId)}`,
          comment,
        });
        save();
        return disputeCard(order, dispute);
      });
    },

    getAdminFinance(): Promise<AdminFinanceOverview> {
      return respond(async () => {
        await requireOperator();
        return financeOverview();
      });
    },

    listAdminTranches(query: AdminTranchesQuery = {}): Promise<AdminTranchesPage> {
      return respond(async () => {
        await requireOperator();
        const status = query.status ?? "awaiting_funds";
        const items =
          status === "awaiting_funds"
            ? allOrders()
                .filter((order) => order.status === "awaiting_payment")
                .map(trancheRowOf)
            : [];
        return { items, nextCursor: null };
      });
    },

    confirmTrancheFunds(
      trancheId: string,
      body: ConfirmFundsRequest,
      idempotencyKey: string,
    ): Promise<AdminFinanceOverview> {
      return respond(async () => {
        await requireOperator();
        const state = getState();
        const orderId = orderIdOfTranche(trancheId);
        const order = orderId === null ? undefined : state.orders.find((row) => row.id === orderId);
        if (!order) throw notFound("Счёт");

        const stored = state.idempotency[idempotencyKey];
        if (stored?.kind === "confirm-funds" && stored.orderId === order.id) {
          return financeOverview();
        }
        if (order.status !== "awaiting_payment") {
          throw problem(
            409,
            "https://partiya.ru/problems/payments/tranche-not-awaiting",
            "Счёт уже не ждёт оплаты",
            `Заказ № ${String(order.id)} — «${orderStatusTitle(order.status)}».`,
          );
        }
        const expected = order.payment?.amountDue ?? order.quote.total;
        if (body.amount != null && body.amount !== expected) {
          // Q-192: частичная оплата не поддерживается
          throw problem(
            422,
            "https://partiya.ru/problems/payments/amount_mismatch",
            "Сумма не совпала",
            `По счёту ожидается ${formatRub(expected)}, поступило ${formatRub(body.amount)}.`,
            { amount: [`Ожидается ${formatRub(expected)}`] },
          );
        }

        const nowMs = now();
        const occurredAt = new Date(nowMs).toISOString();
        order.status = "awaiting_confirmation";
        order.paidAt = occurredAt;
        order.confirmDeadlineAt = confirmDeadline(nowMs);
        ctx.touch(order);
        ctx.emit(order.id, {
          type: "status_changed",
          orderId: order.id,
          occurredAt,
          actor: OPERATOR,
          title: "Оплата зарезервирована в эскроу",
          detail:
            body.externalRef?.trim() ||
            "поступление подтверждено оператором по выписке банка-партнёра",
          from: "awaiting_payment",
          to: "awaiting_confirmation",
          stage: customerStageOf("awaiting_confirmation"),
        });
        ctx.emit(order.id, {
          type: "money",
          orderId: order.id,
          occurredAt,
          actor: SYSTEM,
          title: "Оплата зарезервирована в эскроу",
          detail: "деньги уйдут фабрике после приёмки заказчиком",
          operation: "hold",
          amount: order.quote.total,
        });
        state.idempotency[idempotencyKey] = { kind: "confirm-funds", orderId: order.id };
        storeOf().auditLog.push({
          at: occurredAt,
          actor: "Оператор",
          action: `confirm-funds:${trancheId}`,
          comment: body.externalRef ?? "",
        });
        save();
        return financeOverview();
      });
    },

    confirmDealPayout(
      dealId: string,
      body: PayoutConfirmedRequest,
      idempotencyKey: string,
    ): Promise<AdminFinanceOverview> {
      return respond(async () => {
        await requireOperator();
        const state = getState();
        const orderId = orderIdOfDeal(dealId);
        const order = orderId === null ? undefined : state.orders.find((row) => row.id === orderId);
        if (!order) throw notFound("Сделка");

        const stored = state.idempotency[idempotencyKey];
        if (stored?.kind === "payout" && stored.orderId === order.id) return financeOverview();
        if (order.status !== "completed" || order.payoutAt != null) {
          throw problem(
            409,
            "https://partiya.ru/problems/payments/nothing-to-pay",
            "Нечего выплачивать",
            "Выплата возможна после приёмки партии заказчиком.",
          );
        }
        const occurredAt = new Date(now()).toISOString();
        order.payoutAt = occurredAt;
        ctx.touch(order);
        ctx.emit(order.id, {
          type: "note",
          orderId: order.id,
          occurredAt,
          actor: OPERATOR,
          title: "Выплата отправлена в банк",
          detail: body.externalRef?.trim() || "платёжное поручение сформировано",
          topic: "payout",
        });
        state.idempotency[idempotencyKey] = { kind: "payout", orderId: order.id };
        save();
        return financeOverview();
      });
    },

    getAdminTaxonomy(): Promise<AdminTaxonomy> {
      return respond(async () => {
        await requireOperator();
        return storeOf().taxonomy;
      });
    },

    updateTaxonomyCategory(path: string, body: UpdateTaxonomyCategoryBody): Promise<AdminTaxonomy> {
      return respond(async () => {
        await requireOperator();
        const store = storeOf();
        if (store.taxonomy.selected?.path.join("/") !== path) throw notFound("Категория");
        store.taxonomy = {
          ...store.taxonomy,
          selected: { ...store.taxonomy.selected, ...body },
        };
        save();
        return store.taxonomy;
      });
    },

    getAdminRanking(): Promise<AdminRanking> {
      return respond(async () => {
        await requireOperator();
        const store = storeOf();
        return {
          weights: store.weights,
          penalties: PENALTIES,
          badges: BADGES,
          promos: store.promos,
          appliedAt: store.rankingAppliedAt,
        };
      });
    },

    updateAdminRanking(body: UpdateRankingBody): Promise<AdminRanking> {
      return respond(async () => {
        await requireOperator();
        const store = storeOf();
        const sum = body.weights.reduce((total, item) => total + item.weight, 0);
        if (sum !== 100) {
          throw problem(
            422,
            `${P}/weights-sum`,
            "Сумма весов должна быть 100",
            `Сейчас ${String(sum)}. Формулу нужно уметь объяснить заводу.`,
            { weights: [`Сумма весов — ${String(sum)}, а должна быть 100`] },
          );
        }
        store.weights = store.weights.map((item) => ({
          ...item,
          weight: body.weights.find((patch) => patch.key === item.key)?.weight ?? item.weight,
        }));
        store.rankingAppliedAt = new Date(now()).toISOString();
        save();
        return {
          weights: store.weights,
          penalties: PENALTIES,
          badges: BADGES,
          promos: store.promos,
          appliedAt: store.rankingAppliedAt,
        };
      });
    },

    previewAdminRanking(body: RankingPreviewBody): Promise<RankingPreview> {
      return respond(async () => {
        await requireOperator();
        const store = storeOf();
        const weightOf = (key: string) =>
          body.weights.find((item) => item.key === key)?.weight ??
          store.weights.find((item) => item.key === key)?.weight ??
          0;
        // предпросмотр считается по тем же трём фактам, что доступны мокам
        const rows = [
          {
            offerId: 2231,
            title: "Футболки 180 г/м² под СТМ",
            factoryName: "Волна",
            orders: 14,
            conversion: 0.8,
            capacity: 38,
          },
          {
            offerId: 2187,
            title: "Свечи в гипсовом кашпо",
            factoryName: "Формат",
            orders: 22,
            conversion: 1.2,
            capacity: 61,
          },
          {
            offerId: 2160,
            title: "Шоперы с шелкографией",
            factoryName: "Пошив37",
            orders: 9,
            conversion: 0.6,
            capacity: 45,
          },
          {
            offerId: 2144,
            title: "Поло пике 210 г/м²",
            factoryName: "Волна",
            orders: 3,
            conversion: 0.5,
            capacity: 15,
          },
        ].map((row) => ({
          ...row,
          score:
            row.orders * weightOf("orders90") +
            row.conversion * 100 * weightOf("conversion") +
            row.capacity * weightOf("capacity"),
        }));
        const now_ = [...rows].sort((a, b) => b.orders - a.orders);
        const next = [...rows].sort((a, b) => b.score - a.score);
        const preview = next.map((row, index) => ({
          offerId: row.offerId,
          title: row.title,
          factoryName: row.factoryName,
          positionNow: now_.findIndex((item) => item.offerId === row.offerId) + 1,
          positionNext: index + 1,
          score: Math.round(row.score),
        }));
        return {
          rows: preview,
          moved: preview.filter((row) => row.positionNow !== row.positionNext).length,
        };
      });
    },
  };
}

/** Дата аудита в подписи строки — общий формат кабинета. */
export const formatAuditDate = formatIsoDate;
