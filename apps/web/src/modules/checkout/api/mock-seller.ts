import type {
  AdvanceStageBody,
  AnswerBody,
  ArtworkSignoff,
  MarkDeliveredBody,
  CapacityCell,
  CapacityPlan,
  CapacityQuery,
  CapacityReservation,
  CopyCapacityBody,
  DeclineOrderBody,
  DeclineSampleBody,
  FactoryOnboardingDraft,
  Me,
  OrderStatus,
  PhotoReportBody,
  PhotoReportUploadRequest,
  PhotoReportUploadResponse,
  ReportProgressBody,
  RequestAuditBody,
  SaveFactoryOnboardingBody,
  SaveSellerOfferBody,
  SellerAudit,
  SellerDashboard,
  SellerFeedback,
  SellerFinanceSummary,
  SellerFunnel,
  SellerOfferEditor,
  SellerOfferList,
  SellerOfferListItem,
  SellerOrder,
  SellerOrderList,
  SellerOrderListItem,
  SellerOrderSummary,
  SellerPayout,
  SellerPayoutsPage,
  SellerProfile,
  SellerQuestion,
  SellerReview,
  SellerSampleList,
  SellerSampleRequest,
  SellerStage,
  SellerStageCommand,
  SetOfferListedBody,
  ShipSampleBody,
  SubmitSellerOfferResponse,
  UnderloadDiscountRule,
  UpdateCapacityBody,
  UpdateSellerProfileBody,
} from "@partiya/api-contracts";

import { ApiError } from "@/shared/api";
import {
  capacityUnitsFor,
  completeCell,
  totalLoadPct,
  underloadWeeksOf,
} from "@/shared/lib/capacity";
import { formatDayMonth, formatIsoDate, toIsoDate } from "@/shared/lib/dates";
import { factoryOrgIdOf } from "@/shared/lib/demo";
import { formatNumber, formatRub } from "@/shared/lib/format";
import { hasPricingErrors, validateOfferPricing } from "@/shared/lib/offer-pricing";
import { customerStageOf, orderStatusTitle } from "@/shared/lib/order-status";
import {
  createSellerOfferRecord,
  ensureSellerOffersOrg,
  findSellerOfferRecord,
  listSellerOfferRecords,
  needsModeration,
  offerChanges,
  patchSellerOfferRecord,
  setSellerOfferListed,
  submitSellerOfferRecord,
  toOfferListItem,
} from "@/shared/mocks";

import { ARTWORK_LIMITS } from "../lib/artwork";
import type { MockState } from "./mock-backend";
import {
  finalPaymentOf,
  issueSecondTranche,
  markOrderDelivered,
  normalizeTrackingNumber,
  orderFeeOf,
  orderPayoutOf,
  PLATFORM_FEE_PERCENT,
  settleSecondTranche,
  signArtwork,
} from "./mock-projections";
import type { MockOrder, NewOrderEvent } from "./mock-seed";
import {
  CAPACITY_LINES,
  EXTERNAL_BY_WEEK_INDEX,
  ITEM_COEFFICIENTS,
  PLANNED_WEEKS,
  seedOnboarding,
  seedSellerAudit,
  seedSellerProfile,
  seedSellerQuestions,
  seedSellerReviews,
  seedSellerSamples,
  UNDERLOAD_RULE,
} from "./mock-seller-seed";

/* Мок кабинета завода поверх ТОГО ЖЕ хранилища заказов, что видит заказчик.
 *
 * Это главное свойство слайса: `confirm` здесь меняет статус того самого заказа, который
 * открыт у заказчика на экране трекинга, и пишет событие в тот же журнал. Второго
 * хранилища нет — иначе «завод подтвердил» и «у заказчика статус сменился» разошлись бы
 * в первый же день, а проверить сквозной сценарий было бы нечем.
 *
 * Всё, чего у заказа нет (план мощности, отзывы, аудит, профиль, черновик онбординга),
 * живёт в `MockState.seller[orgId]` — рядом, в том же sessionStorage. Реестр SKU лежит
 * отдельно, в `shared/mocks/seller-offers.ts`: его читает ещё и каталог. */

/** Что принимает фотоотчёт. Шире макета печати: фотографии с телефона — это JPEG и
    HEIC, а не PDF, и отвергать их значило бы сломать самый частый сценарий завода. */
const PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "image/tiff",
  "application/pdf",
];

const PHOTO_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
  ".webp",
  ".tif",
  ".tiff",
  ".pdf",
];

export function isAllowedPhotoType(contentType: string, fileName: string): boolean {
  if (PHOTO_TYPES.includes(contentType.toLowerCase())) return true;
  const lower = fileName.toLowerCase();
  return PHOTO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/* ─────────────────────────────── ошибки как у бэка ─────────────────────────────── */

const P = "https://partiya.ru/problems/seller";

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

const notFactory = () =>
  problem(
    403,
    `${P}/not-a-factory`,
    "Нет доступа",
    "Раздел доступен организации-заводу. Переключите компанию в шапке.",
  );

const orderNotFound = (id: number) =>
  problem(404, `${P}/order-not-found`, "Не найдено", `Заказ № ${String(id)}`);

const transitionNotAllowed = (detail: string) =>
  problem(409, `${P}/transition-not-allowed`, "Переход невозможен", detail);

/* ─────────────────────────────── ступени завода ─────────────────────────────── */

/** Ступень вкладки по статусу автомата (Q-01: `shipped` — добавленная пятая).
 *
 * Q-335 / Q-353: `completed` делится на две ступени по отметке выплаты — `accepted`
 * («Принят заказчиком»: приёмка состоялась, оператор ещё не выплатил) и `paid_out`. */
export function sellerStageOf(status: OrderStatus, paidOut = false): SellerStage | null {
  switch (status) {
    case "awaiting_confirmation":
      return "new";
    case "confirmed":
    case "artwork_review":
    case "materials":
    case "in_production":
      return "in_production";
    case "quality_control":
      return "quality_control";
    case "shipped":
    case "acceptance":
    case "dispute":
      return "shipped";
    case "completed":
      return paidOut ? "paid_out" : "accepted";
    default:
      // черновик, ожидание оплаты, отказ и возвраты заводу не показываются
      return null;
  }
}

export const SELLER_STAGE_TITLES: Record<SellerStage, string> = {
  new: "Новый",
  in_production: "В производстве",
  quality_control: "Контроль качества",
  shipped: "Отгружен",
  accepted: "Принят заказчиком",
  paid_out: "Выплачено",
};

/** Ступень заказа завода с учётом отметки выплаты. */
export function sellerStageOfOrder(order: Pick<MockOrder, "status" | "payoutAt">) {
  return sellerStageOf(order.status, order.payoutAt != null);
}

/** Подписи под макетом: у заказа без поля — никто ещё не подписал. */
export function signoffOf(order: Pick<MockOrder, "artworkSignoff">): ArtworkSignoff {
  return order.artworkSignoff ?? { customerApprovedAt: null, factoryApprovedAt: null };
}

/** Какие команды автомата доступны заводу из этого статуса.
    DECISIONS.md, п. 16: на согласовании макета технолог подписывает производимость
    (`approve_artwork`), пока он ещё не подписал; порядок подписей сторон любой. */
export function commandsFor(
  status: OrderStatus,
  signoff?: ArtworkSignoff,
  awaitingFinalPayment = false,
): SellerStageCommand[] {
  switch (status) {
    case "confirmed":
      return ["start_artwork_review"];
    case "artwork_review":
      return (signoff?.factoryApprovedAt ?? null) === null ? ["approve_artwork"] : [];
    case "materials":
      return ["materials_purchased"];
    case "in_production":
      return ["start_quality_control"];
    case "quality_control":
      // 50/50: отгрузка — только после оплаты второго транша (409 ship-before-final-payment)
      return awaitingFinalPayment ? [] : ["ship"];
    default:
      return [];
  }
}

/** 50/50: второй транш выставлен, но ещё не оплачен — отгружать нельзя. */
export function awaitingFinalPayment(
  order: Pick<MockOrder, "paymentMethod" | "secondTrancheDueAt" | "secondTranchePaidAt">,
): boolean {
  return (
    order.paymentMethod === "escrow_split_50_50" &&
    order.secondTrancheDueAt != null &&
    order.secondTranchePaidAt == null
  );
}

/** Переходы команд. `approve_artwork` здесь нет: статус она меняет только второй подписью. */
const COMMAND_TARGET: Record<
  Exclude<SellerStageCommand, "approve_artwork">,
  { from: OrderStatus; to: OrderStatus }
> = {
  start_artwork_review: { from: "confirmed", to: "artwork_review" },
  materials_purchased: { from: "materials", to: "in_production" },
  start_quality_control: { from: "in_production", to: "quality_control" },
  ship: { from: "quality_control", to: "shipped" },
};

export const COMMAND_TITLES: Record<SellerStageCommand, string> = {
  start_artwork_review: "Отправить макет технологу",
  approve_artwork: "Согласовать макет",
  materials_purchased: "Сырьё закуплено — старт производства",
  start_quality_control: "Перевести в «Контроль качества»",
  ship: "Отгрузить партию",
};

/* ─────────────────────────────── хранилище завода ─────────────────────────────── */

interface CapacityCellStore {
  unitsTotal: number;
  planned: boolean;
  externalUnits: number;
}

export interface SellerStore {
  capacity: {
    cells: Record<string, CapacityCellStore>;
    coefficients: { key: string; title: string; unitsPerItem: number }[];
    underload: UnderloadDiscountRule;
    lines: { id: string; title: string; defaultUnitsPerWeek: number }[];
  };
  samples: SellerSampleRequest[];
  questions: SellerQuestion[];
  reviews: SellerReview[];
  audit: SellerAudit;
  profile: SellerProfile;
  onboarding: FactoryOnboardingDraft;
}

/* ─────────────────────────────── контекст ─────────────────────────────── */

export interface SellerContext {
  now: () => number;
  getState: () => MockState;
  save: () => void;
  respond: <T>(work: () => T | Promise<T>) => Promise<T>;
  getMe: () => Promise<Me>;
  emit: (orderId: number, event: NewOrderEvent) => void;
  journalOf: (orderId: number) => readonly { seq: number; type: string }[];
  touch: (order: MockOrder) => void;
  unreadOf: (orderId: number, channel?: string) => number;
  disputeOpen: (orderId: number) => boolean;
  /** Разложить заводские фикстуры, если их ещё нет. */
  ensureFactorySeed: () => void;
}

export interface MockSellerSlice {
  getSellerDashboard(): Promise<SellerDashboard>;
  listSellerOrders(query?: { stage?: SellerStage }): Promise<SellerOrderList>;
  getSellerOrder(id: number): Promise<SellerOrder>;
  confirmSellerOrder(id: number, idempotencyKey: string): Promise<SellerOrder>;
  declineSellerOrder(
    id: number,
    body: DeclineOrderBody,
    idempotencyKey: string,
  ): Promise<SellerOrder>;
  reportSellerProgress(id: number, body: ReportProgressBody): Promise<SellerOrder>;
  advanceSellerStage(id: number, body: AdvanceStageBody): Promise<SellerOrder>;
  markSellerOrderDelivered(id: number, body: MarkDeliveredBody): Promise<SellerOrder>;
  requestPhotoReportUpload(
    id: number,
    body: PhotoReportUploadRequest,
  ): Promise<PhotoReportUploadResponse>;
  publishPhotoReport(id: number, body: PhotoReportBody): Promise<SellerOrder>;
  listSellerOffers(): Promise<SellerOfferList>;
  getSellerOfferEditor(id: number | null): Promise<SellerOfferEditor>;
  saveSellerOffer(id: number | null, body: SaveSellerOfferBody): Promise<SellerOfferEditor>;
  submitSellerOffer(id: number): Promise<SubmitSellerOfferResponse>;
  setSellerOfferListed(id: number, body: SetOfferListedBody): Promise<SellerOfferListItem>;
  listSellerSamples(): Promise<SellerSampleList>;
  acceptSellerSample(id: string): Promise<SellerSampleList>;
  shipSellerSample(id: string, body: ShipSampleBody): Promise<SellerSampleList>;
  declineSellerSample(id: string, body: DeclineSampleBody): Promise<SellerSampleList>;
  getSellerFinanceSummary(): Promise<SellerFinanceSummary>;
  listSellerPayouts(): Promise<SellerPayoutsPage>;
  getSellerFeedback(): Promise<SellerFeedback>;
  answerSellerQuestion(questionId: number, body: AnswerBody): Promise<SellerFeedback>;
  replySellerReview(reviewId: number, body: AnswerBody): Promise<SellerFeedback>;
  getSellerAudit(): Promise<SellerAudit>;
  requestSellerAudit(body: RequestAuditBody): Promise<SellerAudit>;
  getSellerProfile(): Promise<SellerProfile>;
  updateSellerProfile(body: UpdateSellerProfileBody): Promise<SellerProfile>;
  getFactoryOnboarding(): Promise<FactoryOnboardingDraft>;
  saveFactoryOnboarding(body: SaveFactoryOnboardingBody): Promise<FactoryOnboardingDraft>;
  getCapacityPlan(query?: CapacityQuery): Promise<CapacityPlan>;
  updateCapacityPlan(body: UpdateCapacityBody): Promise<CapacityPlan>;
  copyCapacityPlan(body: CopyCapacityBody): Promise<CapacityPlan>;
  /** Внутреннее: заказы завода — их же читает бэк-офис. */
  ordersOfFactory(orgId: string): MockOrder[];
}

const MONTHS = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

const SHORT_MONTHS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

/** Понедельник недели, в которую попадает дата. */
export function weekStartOf(date: Date): string {
  const copy = new Date(date.getTime());
  copy.setHours(0, 0, 0, 0);
  const weekday = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - weekday);
  return toIsoDate(copy);
}

/** «29–5 окт» — подпись колонки сетки. */
function weekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 6);
  const endMonth = SHORT_MONTHS[end.getMonth()] ?? "";
  if (start.getMonth() === end.getMonth()) {
    return `${String(start.getDate())}–${String(end.getDate())} ${endMonth}`;
  }
  return `${String(start.getDate())} ${SHORT_MONTHS[start.getMonth()] ?? ""}–${String(end.getDate())} ${endMonth}`;
}

export function createSellerSlice(ctx: SellerContext): MockSellerSlice {
  const { now, getState, save, respond } = ctx;

  /** Активная организация-завод. 401 бросает `getMe`, как настоящий `/me`. */
  async function requireFactoryOrg(): Promise<{ orgId: string; name: string }> {
    const me = await ctx.getMe();
    const active = me.organizations.find((org) => org.id === me.activeOrgId);
    if (!active || active.kind !== "factory") throw notFactory();
    ctx.ensureFactorySeed();
    ensureSellerOffersOrg(active.id);
    ensureStore(active.id, active.name);
    return { orgId: active.id, name: active.name };
  }

  function ensureStore(orgId: string, orgName: string): SellerStore {
    const state = getState();
    state.seller ??= {};
    const existing = state.seller[orgId];
    if (existing) return existing;
    const created: SellerStore = {
      capacity: {
        cells: {},
        coefficients: ITEM_COEFFICIENTS.map((item) => ({ ...item })),
        underload: { ...UNDERLOAD_RULE },
        lines: CAPACITY_LINES.map((line) => ({ ...line })),
      },
      samples: seedSellerSamples(now()),
      questions: seedSellerQuestions(now()),
      reviews: seedSellerReviews(now()),
      audit: seedSellerAudit(),
      profile: seedSellerProfile(orgId, orgName),
      onboarding: seedOnboarding(),
    };
    state.seller[orgId] = created;
    save();
    return created;
  }

  function storeOf(orgId: string): SellerStore {
    const state = getState();
    state.seller ??= {};
    const store = state.seller[orgId];
    if (!store) throw notFactory();
    return store;
  }

  /* ───────── заказы ───────── */

  function ordersOfFactory(orgId: string): MockOrder[] {
    return (
      getState()
        .orders.filter((order) => factoryOrgIdOf(order.offer.factoryId) === orgId)
        // до денег заказа для завода не существует (ARCHITECTURE.md, 8.4)
        .filter((order) => sellerStageOf(order.status) !== null)
        .sort((a, b) => b.id - a.id)
    );
  }

  async function requireFactoryOrder(id: number): Promise<MockOrder> {
    const { orgId } = await requireFactoryOrg();
    const order = getState().orders.find(
      (row) => row.id === id && factoryOrgIdOf(row.offer.factoryId) === orgId,
    );
    // чужой заказ неотличим от несуществующего
    if (!order || sellerStageOf(order.status) === null) throw orderNotFound(id);
    return order;
  }

  function factoryActor(order: MockOrder, orgId: string) {
    return { kind: "factory" as const, name: `Технолог «${order.offer.factoryName}»`, orgId };
  }

  /** Условные единицы мощности, которые резервирует партия. */
  function unitsOf(order: MockOrder): number {
    return capacityUnitsFor(order.params.qty, 1);
  }

  function noteOf(order: MockOrder): string | null {
    switch (order.status) {
      case "awaiting_confirmation":
        return order.confirmDeadlineAt === null
          ? "подтвердите заказ"
          : `подтвердить до ${new Date(order.confirmDeadlineAt).getHours().toString().padStart(2, "0")}:00`;
      case "in_production": {
        const started = order.paidAt === null ? null : Date.parse(order.paidAt);
        if (started === null) return null;
        const day = Math.max(1, Math.round((now() - started) / 86_400_000));
        return `день ${String(day)} из ${String(order.quote.leadDays ?? 18)}`;
      }
      case "acceptance":
        return order.shipDate === null
          ? "приёмка идёт"
          : `приёмка ${formatIsoDate(order.shipDate) ?? ""}`;
      case "completed":
        return formatRub(orderPayoutOf(order));
      case "quality_control":
        return "выборка 5 % по ГОСТ";
      default:
        return null;
    }
  }

  function toSellerListItem(order: MockOrder): SellerOrderListItem {
    const fee = orderFeeOf(order);
    return {
      id: order.id,
      status: order.status,
      sellerStage: sellerStageOfOrder(order),
      title: order.offer.title,
      customer: order.payer?.name ?? "Заказчик",
      customerOrgId: order.orgId,
      total: order.quote.total,
      fee,
      payout: order.quote.total - fee,
      note: noteOf(order),
      confirmDeadlineAt: order.confirmDeadlineAt,
      shipDate: order.shipDate,
      progressPct: progressPctOf(order),
      unreadMessages: ctx.unreadOf(order.id),
      disputeOpen: ctx.disputeOpen(order.id),
      capacityUnits: unitsOf(order),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  function progressPctOf(order: MockOrder): number {
    const rows = progressRows(order.id);
    if (rows.length === 0) return 0;
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const done = rows.reduce((sum, row) => sum + row.done, 0);
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  function progressRows(orderId: number) {
    const rows = new Map<
      string,
      {
        id: string;
        title: string;
        done: number;
        total: number;
        note?: string | null;
        updatedAt: string;
      }
    >();
    for (const event of getState().events[String(orderId)] ?? []) {
      if (event.type === "progress") rows.set(event.progress.id, event.progress);
    }
    const order = ["cut", "sewn", "print", "pack"];
    const known = order.filter((id) => rows.has(id));
    const rest = [...rows.keys()].filter((id) => !order.includes(id));
    return [...known, ...rest].map((id) => rows.get(id)).filter((row) => row !== undefined);
  }

  function summaryOf(orders: readonly MockOrder[]): SellerOrderSummary {
    const byStage = (stage: SellerStage) =>
      orders.filter((order) => sellerStageOfOrder(order) === stage).length;
    const awaiting = orders.filter((order) => order.status === "awaiting_confirmation");
    const deadlines = awaiting
      .map((order) => order.confirmDeadlineAt)
      .filter((value): value is string => value !== null)
      .sort();
    const held = orders.filter(
      (order) =>
        order.paidAt !== null && order.status !== "completed" && order.status !== "refunded",
    );
    // к выплате — принятые заказчиком, но ещё не выплаченные оператором (Q-353)
    const payable = orders.filter((order) => sellerStageOfOrder(order) === "accepted");

    return {
      all: orders.length,
      new: byStage("new"),
      inProduction: byStage("in_production"),
      qualityControl: byStage("quality_control"),
      shipped: byStage("shipped"),
      accepted: byStage("accepted"),
      paidOut: byStage("paid_out"),
      awaitingConfirmation: awaiting.length,
      nearestConfirmDeadlineAt: deadlines[0] ?? null,
      escrowHeld: held.reduce((sum, order) => sum + order.quote.total, 0),
      payoutPlanned: payable.reduce((sum, order) => sum + orderPayoutOf(order), 0),
    };
  }

  function toSellerOrder(order: MockOrder): SellerOrder {
    const fee = orderFeeOf(order);
    const rows = progressRows(order.id);
    const lastProgress =
      rows
        .map((row) => row.updatedAt)
        .sort()
        .at(-1) ?? null;
    const started = order.paidAt === null ? null : Date.parse(order.paidAt);
    const disputeOpen = ctx.disputeOpen(order.id);

    return {
      id: order.id,
      status: order.status,
      sellerStage: sellerStageOfOrder(order),
      title: order.offer.title,
      customer: order.payer?.name ?? "Заказчик",
      customerOrgId: order.orgId,
      customerCity: null,
      offerId: order.offer.id,
      offerTitle: order.offer.title,
      params: order.params,
      delivery: order.delivery,
      artwork: order.artwork.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        status: file.status,
        url: file.url,
      })),
      progress: rows,
      documents: order.documents,
      money: {
        escrowAmount: order.quote.total,
        fee,
        feePercent: PLATFORM_FEE_PERCENT,
        payout: order.quote.total - fee,
        // Q-353: момент выплаты оператором, а не приёмки
        payoutAt: order.payoutAt ?? null,
        note:
          order.payoutAt != null
            ? "выплата отправлена после приёмки заказчиком"
            : order.status === "completed"
              ? "Партия принята заказчиком — выплата в течение 2 рабочих дней."
              : "Выплата — в течение 2 рабочих дней после приёмки партии заказчиком. Комиссия — только со стоимости товара, доставка без комиссии.",
        blockedByDispute: disputeOpen,
      },
      confirmDeadlineAt: order.confirmDeadlineAt,
      shipDate: order.shipDate,
      productionDay:
        started === null || order.status === "awaiting_confirmation"
          ? null
          : Math.max(1, Math.round((now() - started) / 86_400_000)),
      productionDays: order.quote.leadDays ?? null,
      availableCommands: disputeOpen
        ? []
        : commandsFor(order.status, order.artworkSignoff, awaitingFinalPayment(order)),
      canConfirm: order.status === "awaiting_confirmation",
      canDecline: order.status === "awaiting_confirmation",
      canMarkDelivered: order.status === "shipped" && !disputeOpen,
      trackingNumber: order.trackingNumber ?? null,
      artworkSignoff: signoffOf(order),
      progressUpdatedAt: lastProgress,
      unreadMessages: ctx.unreadOf(order.id),
      disputeOpen,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // Q-383, Q-401: заводу — состояние второго транша без реквизитов; как у бэка, только
      // на контроле качества, в споре и после отгрузки
      finalPayment:
        order.status === "quality_control" ||
        order.status === "dispute" ||
        order.status === "shipped"
          ? finalPaymentOf(order, false)
          : null,
    };
  }

  /* ───────── мощность ───────── */

  function weeksFrom(fromWeek: string, count: number): string[] {
    const weeks: string[] = [];
    const cursor = new Date(`${fromWeek}T00:00:00`);
    for (let index = 0; index < count; index += 1) {
      weeks.push(toIsoDate(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return weeks;
  }

  /** Резервы мощности по заказам: soft до подтверждения, hard после (5.3). */
  function reservationsOf(
    orders: readonly MockOrder[],
    weeks: readonly string[],
  ): CapacityReservation[] {
    const first = weeks[0];
    if (first === undefined) return [];
    const last = weeks.at(-1) ?? first;
    const items: CapacityReservation[] = [];
    for (const order of orders) {
      const kind: "soft" | "hard" = order.status === "awaiting_confirmation" ? "soft" : "hard";
      if (order.status === "completed" || order.status === "acceptance") continue;
      const anchor = weekStartOf(new Date(order.paidAt ?? order.createdAt));
      const weekStart = anchor < first ? first : anchor > last ? last : anchor;
      items.push({
        orderId: order.id,
        title: `№ ${String(order.id)} · ${order.offer.title}`,
        weekStart,
        weeks: 2,
        units: unitsOf(order),
        kind,
        expiresAt: kind === "soft" ? order.confirmDeadlineAt : null,
        note:
          kind === "soft"
            ? "ждёт вашего подтверждения"
            : `${weekLabel(weekStart)} · ${orderStatusTitle(order.status)}`,
      });
    }
    return items;
  }

  function buildPlan(orgId: string, query: CapacityQuery = {}): CapacityPlan {
    const store = storeOf(orgId);
    const from = query.from ?? weekStartOf(new Date(now()));
    const weekKeys = weeksFrom(from, 8);
    const to = weekKeys.at(-1) ?? from;
    const orders = ordersOfFactory(orgId);
    const reservations = reservationsOf(orders, weekKeys);
    const rule = store.capacity.underload;
    const todayWeek = weekStartOf(new Date(now()));

    const cells: CapacityCell[] = [];
    store.capacity.lines.forEach((line, lineIndex) => {
      weekKeys.forEach((weekStart, weekIndex) => {
        const key = `${line.id}:${weekStart}`;
        const stored = store.capacity.cells[key];
        const planned = stored?.planned ?? weekIndex < PLANNED_WEEKS;
        const unitsTotal = stored?.unitsTotal ?? (planned ? line.defaultUnitsPerWeek : 0);
        const externalUnits =
          stored?.externalUnits ??
          (planned ? (EXTERNAL_BY_WEEK_INDEX[line.id]?.[weekIndex] ?? 0) : 0);
        // резервы кладутся на первую линию: вторая — худи, их в демо-заказах нет
        const own =
          lineIndex === 0 ? reservations.filter((item) => item.weekStart === weekStart) : [];
        cells.push(
          completeCell(
            {
              lineId: line.id,
              weekStart,
              unitsTotal,
              planned,
              hardUnits: own
                .filter((item) => item.kind === "hard")
                .reduce((sum, item) => sum + item.units, 0),
              softUnits: own
                .filter((item) => item.kind === "soft")
                .reduce((sum, item) => sum + item.units, 0),
              externalUnits,
            },
            rule,
          ),
        );
      });
    });

    const activeWeeks = underloadWeeksOf(cells, rule);
    const underload: UnderloadDiscountRule = {
      ...rule,
      activeWeeks,
      note:
        activeWeeks.length === 0
          ? null
          : `Сейчас действует для недель ${weekLabel(activeWeeks[0] ?? "")} – ${weekLabel(activeWeeks.at(-1) ?? "")}`,
    };

    const plannedCells = cells.filter((cell) => cell.planned);
    const totalUnits = plannedCells.reduce((sum, cell) => sum + cell.unitsTotal, 0);
    const freeUnits = plannedCells.reduce((sum, cell) => sum + cell.freeUnits, 0);
    const externalUnits = plannedCells.reduce((sum, cell) => sum + cell.externalUnits, 0);
    const soldUnits = plannedCells.reduce((sum, cell) => sum + cell.hardUnits + cell.softUnits, 0);
    const unplanned = cells.filter((cell) => !cell.planned && cell.weekStart >= todayWeek).length;

    const monthName = MONTHS[new Date(now()).getMonth()] ?? "";
    return {
      from,
      to,
      lines: store.capacity.lines,
      weeks: weekKeys.map((weekStart) => ({
        weekStart,
        label: weekLabel(weekStart),
        past: weekStart < todayWeek,
      })),
      cells,
      reservations,
      itemCoefficients: store.capacity.coefficients,
      underloadDiscount: underload,
      summary: {
        month: monthName,
        loadPct: totalLoadPct(cells),
        soldUnits,
        totalUnits,
        freeUnits,
        externalPct: totalUnits === 0 ? 0 : Math.round((externalUnits / totalUnits) * 100),
        underloadWeeks: activeWeeks.length,
        unplannedWeeks: unplanned,
        unit: "усл. ед.",
      },
      warning:
        unplanned === 0
          ? null
          : {
              title: `План заполнен не на весь горизонт: ${String(unplanned)} пустых ячеек`,
              text: "Без плана предложения выпадут из выдачи: платформа не знает, есть ли у вас место.",
            },
    };
  }

  /* ───────── воронка ───────── */

  function funnelOf(orgId: string): SellerFunnel {
    const offers = listSellerOfferRecords(orgId);
    const impressions = offers.reduce((sum, offer) => sum + offer.metrics.impressions, 0);
    const views = offers.reduce((sum, offer) => sum + offer.metrics.views, 0);
    const inCompare = offers.reduce((sum, offer) => sum + offer.metrics.inCompare, 0);
    const orders = offers.reduce((sum, offer) => sum + offer.metrics.orders, 0);
    const quotes = Math.round(views * 0.033);
    const max = Math.max(1, impressions);
    const step = (title: string, key: string, value: number) => ({
      key,
      title,
      value,
      pct: Math.max(4, Math.round((value / max) * 100)),
    });
    return {
      period: "30d",
      steps: [
        step("Показы в выдаче", "impressions", impressions),
        step("Просмотры карточек", "views", views),
        step("Добавили в сравнение", "compare", inCompare),
        step("Рассчитали партию", "quotes", quotes),
        step("Оформили заказ", "orders", orders),
      ],
      conversionPct: impressions === 0 ? 0 : Math.round((orders / impressions) * 10_000) / 100,
      views: [
        { day: "пн", value: 62 },
        { day: "вт", value: 80 },
        { day: "ср", value: 45 },
        { day: "чт", value: 92 },
        { day: "пт", value: 70 },
        { day: "сб", value: 20 },
        { day: "вс", value: 12 },
      ],
    };
  }

  /* ───────── редактор SKU ───────── */

  const CATEGORIES = [
    { path: ["tekstil", "futbolki"], title: "Текстиль › Футболки" },
    { path: ["tekstil", "hudi"], title: "Текстиль › Худи и свитшоты" },
    { path: ["tekstil", "polo"], title: "Текстиль › Поло" },
    { path: ["tekstil", "sumki"], title: "Текстиль › Сумки и шоперы" },
  ];

  const SCHEMA = {
    path: ["tekstil", "futbolki"],
    title: "Текстиль › Футболки",
    defaultCapacityUnitsPerItem: 1,
    unit: "шт",
    attributes: [
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
      },
      {
        key: "fit",
        label: "Крой",
        kind: "multiselect" as const,
        options: ["классический", "оверсайз", "женский приталенный", "детский"],
        required: true,
      },
      {
        key: "sizes",
        label: "Размеры",
        kind: "multiselect" as const,
        options: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
        required: true,
      },
      {
        key: "print",
        label: "Нанесение",
        kind: "multiselect" as const,
        options: ["шелкография до 6 цв.", "DTF", "вышивка", "сублимация", "без нанесения"],
        required: false,
      },
      { key: "colors", label: "Цвета ткани в наличии", kind: "text" as const, required: false },
      { key: "pantone", label: "Свой Pantone", kind: "text" as const, required: false },
    ],
  };

  function editorOf(id: number | null, orgId: string, orgName: string): SellerOfferEditor {
    const record = id === null ? undefined : findSellerOfferRecord(id);
    const draft =
      record?.draft ?? createSellerOfferRecord(orgId, new Date(now()).toISOString()).draft;
    const versions = record?.versions ?? [];
    const changes = record ? offerChanges(record) : [];
    const profile = storeOf(orgId).profile;
    const tiers = draft.tiers.map((tier) => ({ fromQty: tier.fromQty, unitPrice: tier.unitPrice }));

    const ready = (condition: boolean, current: boolean) =>
      condition ? ("done" as const) : current ? ("now" as const) : ("todo" as const);
    const titleDone = draft.title.trim().length > 0;
    const photosDone = draft.images.length >= 3;
    const attrsDone = SCHEMA.attributes
      .filter((a) => a.required)
      .every((a) => draft.attributes[a.key] !== undefined);
    const pricesDone = !hasPricingErrors(validateOfferPricing(draft));

    return {
      draft: record ? { ...draft, id: record.id } : draft,
      schema: SCHEMA,
      categories: CATEGORIES,
      versions:
        versions.length > 0
          ? versions.map((version, index) => (index === 0 ? { ...version, changes } : version))
          : [],
      categoryMedianPrice: 17_200,
      readiness: [
        { key: "title", title: "Категория и название", state: ready(titleDone, !titleDone) },
        {
          key: "photos",
          title: `Фото — ${String(draft.images.length)} из 3`,
          state: ready(photosDone, titleDone && !photosDone),
        },
        {
          key: "attrs",
          title: "Характеристики",
          state: ready(attrsDone, photosDone && !attrsDone),
        },
        { key: "prices", title: "Цены", state: ready(pricesDone, attrsDone && !pricesDone) },
        {
          key: "lead",
          title: "Срок: уточните прибавку за объём",
          state: ready(draft.leadDaysPer1000 > 0, pricesDone),
        },
      ],
      preview: {
        title: draft.title.length > 0 ? draft.title : "Новое предложение",
        priceFrom: tiers.at(-1)?.unitPrice ?? tiers[0]?.unitPrice ?? 0,
        moq: draft.moq,
        leadDaysMin: draft.leadDaysMin,
        freeCapacityPct: buildPlan(orgId).summary.freeUnits > 0 ? 38 : 0,
        sampleAvailable: draft.sampleAvailable,
        badges: profile.auditedAt === null ? [] : ["audit"],
        tone: record?.tone ?? "b",
        factoryName: orgName,
        factoryCity: profile.city,
        rating: profile.rating,
        reviews: profile.reviews,
        tiers,
      },
    };
  }

  /* ───────── сам слайс ───────── */

  return {
    ordersOfFactory,

    getSellerDashboard(): Promise<SellerDashboard> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const orders = ordersOfFactory(orgId);
        const summary = summaryOf(orders);
        const plan = buildPlan(orgId);
        const store = storeOf(orgId);
        const urgent = orders.find((order) => order.status === "awaiting_confirmation");
        const unanswered = store.questions.filter((item) => item.answer === null).length;
        const paidMonth = orders
          .filter((order) => order.status === "completed")
          .reduce((sum, order) => sum + orderPayoutOf(order), 0);

        const todo: SellerDashboard["todo"] = [];
        if (urgent) {
          todo.push({
            key: "confirm",
            title: `Подтвердить заказ № ${String(urgent.id)}`,
            note: "до 18:00",
            href: `/seller/orders/${String(urgent.id)}`,
            urgent: true,
          });
        }
        const inWork = orders.find((order) => order.status === "in_production");
        if (inWork) {
          todo.push({
            key: "progress",
            title: `Внести прогресс по № ${String(inWork.id)}`,
            note: "обновляйте раз в 2 рабочих дня",
            href: `/seller/orders/${String(inWork.id)}`,
            urgent: true,
          });
        }
        const sample = store.samples.find((item) => item.status !== "delivered");
        if (sample) {
          todo.push({
            key: "sample",
            title: `Отправить образец ${sample.id}`,
            note: sample.dueNote,
            href: "/seller/samples",
            urgent: false,
          });
        }
        if (unanswered > 0) {
          todo.push({
            key: "questions",
            title: `Ответить на ${String(unanswered)} ${unanswered === 1 ? "вопрос" : "вопроса"}`,
            note: "влияет на «отвечает за…»",
            href: "/feedback",
            urgent: false,
          });
        }
        if (plan.summary.unplannedWeeks > 0) {
          todo.push({
            key: "capacity",
            title: "Заполнить план мощности",
            note: "без плана предложения выпадут из выдачи",
            href: "/capacity",
            urgent: false,
          });
        }

        return {
          capacity: {
            month: plan.summary.month,
            loadPct: plan.summary.loadPct,
            soldUnits: plan.summary.soldUnits,
            totalUnits: plan.summary.totalUnits,
            unit: plan.summary.unit,
            weeks: plan.weeks.map((week) => {
              const weekCells = plan.cells.filter((cell) => cell.weekStart === week.weekStart);
              return { label: week.label, loadPct: totalLoadPct(weekCells) };
            }),
          },
          finance: {
            escrowHeld: summary.escrowHeld,
            paidMonth,
            nextPayoutAt: orders.find((order) => order.status === "acceptance")?.shipDate ?? null,
          },
          ranking: { position: 3, category: "Футболки", deltaWeek: 2 },
          funnel: funnelOf(orgId),
          todo,
          urgentOrder: urgent ? toSellerListItem(urgent) : null,
          quality: [
            { label: "Отгружено в срок", value: "97 %" },
            { label: "Подтверждение заказов", value: "100 % · в среднем 2 ч" },
            { label: "Ответ на вопросы", value: "40 мин" },
            { label: "Споры", value: "1 из 87" },
            {
              label: "Аудит действует до",
              value: formatIsoDate(store.audit.validUntil ?? undefined) ?? "—",
            },
          ],
          orders: summary,
        };
      });
    },

    listSellerOrders(query: { stage?: SellerStage } = {}): Promise<SellerOrderList> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const all = ordersOfFactory(orgId);
        const items = all
          .filter((order) => query.stage === undefined || sellerStageOfOrder(order) === query.stage)
          .map(toSellerListItem);
        return { items, total: items.length, summary: summaryOf(all) };
      });
    },

    getSellerOrder(id: number): Promise<SellerOrder> {
      return respond(async () => {
        const order = await requireFactoryOrder(id);
        // Q-401: таймер срока второго транша — у мока лениво, при чтении
        settleSecondTranche(order, now(), ctx.emit);
        return toSellerOrder(order);
      });
    },

    confirmSellerOrder(id: number, idempotencyKey: string): Promise<SellerOrder> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const order = await requireFactoryOrder(id);
        const state = getState();
        const stored = state.idempotency[idempotencyKey];
        if (stored?.kind === "seller-confirm" && stored.orderId === id) {
          return toSellerOrder(order);
        }
        if (order.status !== "awaiting_confirmation") {
          throw transitionNotAllowed(
            `Подтверждать можно заказ, ожидающий подтверждения; сейчас — «${orderStatusTitle(order.status)}».`,
          );
        }
        if (order.confirmDeadlineAt !== null && Date.parse(order.confirmDeadlineAt) < now()) {
          throw problem(
            409,
            `${P}/confirm-deadline-passed`,
            "Срок подтверждения истёк",
            "Платформа сняла резерв мощности и вернула деньги заказчику.",
          );
        }
        const occurredAt = new Date(now()).toISOString();
        order.status = "confirmed";
        order.confirmDeadlineAt = null;
        ctx.touch(order);
        ctx.emit(order.id, {
          type: "status_changed",
          orderId: order.id,
          occurredAt,
          actor: factoryActor(order, orgId),
          title: "Фабрика подтвердила заказ",
          detail: "мощность зарезервирована",
          from: "awaiting_confirmation",
          to: "confirmed",
          stage: customerStageOf("confirmed"),
        });
        state.idempotency[idempotencyKey] = { kind: "seller-confirm", orderId: id };
        save();
        return toSellerOrder(order);
      });
    },

    declineSellerOrder(
      id: number,
      body: DeclineOrderBody,
      idempotencyKey: string,
    ): Promise<SellerOrder> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const order = await requireFactoryOrder(id);
        const state = getState();
        const stored = state.idempotency[idempotencyKey];
        if (stored?.kind === "seller-decline" && stored.orderId === id) {
          return toSellerOrder(order);
        }
        if (order.status !== "awaiting_confirmation") {
          throw transitionNotAllowed(
            `Отклонить можно заказ, ожидающий подтверждения; сейчас — «${orderStatusTitle(order.status)}».`,
          );
        }
        const reason = body.reason?.trim();
        const occurredAt = new Date(now()).toISOString();
        order.status = "declined";
        order.confirmDeadlineAt = null;
        ctx.touch(order);
        ctx.emit(order.id, {
          type: "status_changed",
          orderId: order.id,
          occurredAt,
          actor: factoryActor(order, orgId),
          title: "Фабрика отклонила заказ",
          detail: reason && reason.length > 0 ? reason : "деньги возвращаются заказчику",
          from: "awaiting_confirmation",
          to: "declined",
          stage: null,
        });
        ctx.emit(order.id, {
          type: "money",
          orderId: order.id,
          occurredAt,
          actor: { kind: "system", name: "Система", orgId: null },
          title: "Возврат заказчику",
          detail: "заказ отклонён фабрикой",
          operation: "refund",
          amount: order.quote.total,
        });
        // возврат закрывает сделку целиком — автомат идёт дальше сам (5.2)
        order.status = "refunded";
        ctx.touch(order);
        state.idempotency[idempotencyKey] = { kind: "seller-decline", orderId: id };
        save();
        return toSellerOrder(order);
      });
    },

    reportSellerProgress(id: number, body: ReportProgressBody): Promise<SellerOrder> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const order = await requireFactoryOrder(id);
        const errors: Record<string, string[]> = {};
        if (!Number.isFinite(body.done) || body.done < 0)
          errors.done = ["Не может быть меньше нуля"];
        if (!Number.isFinite(body.total) || body.total <= 0)
          errors.total = ["Укажите объём партии"];
        if (body.done > body.total) {
          errors.done = [`Не больше объёма партии — ${formatNumber(body.total)} шт`];
        }
        if (Object.keys(errors).length > 0) {
          throw problem(422, `${P}/invalid-progress`, "Проверьте прогресс", undefined, errors);
        }
        const titles: Record<string, string> = {
          cut: "Раскроено",
          sewn: "Отшито",
          print: "Принт",
          pack: "Упаковано",
        };
        const title = titles[body.stage] ?? body.stage;
        const occurredAt = new Date(now()).toISOString();
        ctx.emit(order.id, {
          type: "progress",
          orderId: order.id,
          occurredAt,
          actor: factoryActor(order, orgId),
          title: `${title} ${formatNumber(body.done)} / ${formatNumber(body.total)}`,
          detail: null,
          progress: {
            id: body.stage,
            title,
            done: body.done,
            total: body.total,
            updatedAt: occurredAt,
          },
        });
        save();
        return toSellerOrder(order);
      });
    },

    advanceSellerStage(id: number, body: AdvanceStageBody): Promise<SellerOrder> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const order = await requireFactoryOrder(id);
        if (body.command === "approve_artwork") {
          // п. 16 / Q-354: подпись технолога — производимость; статус меняет вторая подпись
          if (order.status !== "artwork_review") {
            throw problem(
              409,
              "https://partiya.ru/problems/orders/transition-not-allowed",
              "Переход невозможен",
              `Макет согласуют на шаге «${orderStatusTitle("artwork_review")}», сейчас — «${orderStatusTitle(order.status)}».`,
            );
          }
          signArtwork(
            order,
            "factory",
            new Date(now()).toISOString(),
            factoryActor(order, orgId),
            ctx.emit,
          );
          ctx.touch(order);
          save();
          return toSellerOrder(order);
        }
        const target = COMMAND_TARGET[body.command] as
          { from: OrderStatus; to: OrderStatus } | undefined;
        if (!target) {
          throw problem(400, "/problems/bad-request", "Неизвестная команда", body.command);
        }
        if (order.status !== target.from) {
          throw transitionNotAllowed(
            `Команда «${COMMAND_TITLES[body.command]}» применима из статуса «${orderStatusTitle(target.from)}», сейчас — «${orderStatusTitle(order.status)}».`,
          );
        }
        if (body.command === "ship" && awaitingFinalPayment(order)) {
          throw problem(
            409,
            "https://partiya.ru/problems/orders/ship-before-final-payment",
            "Ждём оплату второго транша",
            "Схема 50/50: отгрузить партию можно после оплаты второго транша заказчиком.",
          );
        }
        const occurredAt = new Date(now()).toISOString();
        const factory = factoryActor(order, orgId);
        const system = { kind: "system" as const, name: "Система", orgId: null };
        const from = order.status;
        order.status = target.to;
        ctx.touch(order);

        const TEXTS: Record<OrderStatus, { title: string; detail: string | null }> = {
          artwork_review: { title: "Макет у технолога", detail: "цветопроба и раскладка" },
          in_production: { title: "Старт производства", detail: "партия в работе" },
          quality_control: {
            title: "Партия на контроле качества",
            detail: "выборка 5 % по ГОСТ",
          },
          shipped: { title: "Партия отгружена", detail: "передана перевозчику" },
        } as Record<OrderStatus, { title: string; detail: string | null }>;
        const text = TEXTS[target.to] ?? { title: orderStatusTitle(target.to), detail: null };
        ctx.emit(order.id, {
          type: "status_changed",
          orderId: order.id,
          occurredAt,
          actor: factory,
          title: text.title,
          detail: text.detail,
          from,
          to: target.to,
          stage: customerStageOf(target.to),
        });

        if (target.to === "shipped") {
          const upd = {
            id: `doc-upd-${String(order.id)}`,
            kind: "act" as const,
            title: `УПД № ${String(order.id)}-У`,
            url: `#/documents/${String(order.id)}/upd.pdf`,
            signature: "edo_pending" as const,
            createdAt: occurredAt,
          };
          if (!order.documents.some((doc) => doc.id === upd.id)) order.documents.push(upd);
          ctx.emit(order.id, {
            type: "document",
            orderId: order.id,
            occurredAt,
            actor: system,
            title: `${upd.title} ждёт подписи заказчика`,
            detail: "без подписи выплата не уйдёт",
            document: upd,
          });
          /* DECISIONS.md, п. 13: «Доставлено» фиксирует завод по трек-номеру
             (`POST /seller/orders/{id}/delivered`), запасной путь — кнопка оператора.
             Отгрузка сама окно приёмки больше не открывает. */
        }
        // п. 4 / Q-342: «готов к отгрузке» — второй транш 50/50 выставляется сейчас
        if (target.to === "quality_control") issueSecondTranche(order, occurredAt, ctx.emit);
        save();
        return toSellerOrder(order);
      });
    },

    markSellerOrderDelivered(id: number, body: MarkDeliveredBody): Promise<SellerOrder> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const order = await requireFactoryOrder(id);
        const trackingNumber = normalizeTrackingNumber(body.trackingNumber);
        if (trackingNumber === null) {
          throw problem(
            422,
            `${P}/invalid-tracking-number`,
            "Трек-номер не подходит",
            "Укажите трек-номер перевозчика: от 1 до 64 символов.",
            { trackingNumber: ["Трек-номер — от 1 до 64 символов"] },
          );
        }
        if (ctx.disputeOpen(order.id)) {
          throw transitionNotAllowed("По заказу открыт спор — доставку отметит оператор.");
        }
        if (order.status !== "shipped") {
          // Q-350: повтор — 409, как у бэка
          throw transitionNotAllowed(
            `«Доставлено» отмечают у отгруженной партии, сейчас — «${orderStatusTitle(order.status)}».`,
          );
        }
        markOrderDelivered(
          order,
          new Date(now()).toISOString(),
          factoryActor(order, orgId),
          trackingNumber,
          ctx.emit,
        );
        ctx.touch(order);
        save();
        return toSellerOrder(order);
      });
    },

    requestPhotoReportUpload(
      id: number,
      body: PhotoReportUploadRequest,
    ): Promise<PhotoReportUploadResponse> {
      return respond(async () => {
        await requireFactoryOrder(id);
        if (!isAllowedPhotoType(body.contentType, body.fileName)) {
          throw problem(
            415,
            `${P}/photo-unsupported-type`,
            "Такой файл не подойдёт",
            "Фотоотчёт принимаем в JPG, PNG, HEIC, PDF или TIFF",
          );
        }
        if (body.size > ARTWORK_LIMITS.maxSize) {
          throw problem(
            413,
            `${P}/photo-too-large`,
            "Файл слишком большой",
            `Максимум ${String(Math.round(ARTWORK_LIMITS.maxSize / 1024 / 1024))} МБ на файл`,
          );
        }
        const fileId = `pht-${String(id)}-${String(now())}-${String(Math.round(Math.random() * 1000))}`;
        const expiresAtMs = now() + 15 * 60_000;
        getState().uploads.push({
          fileId,
          orderId: id,
          fileName: body.fileName,
          contentType: body.contentType,
          size: body.size,
          expiresAtMs,
        });
        save();
        return {
          fileId,
          uploadUrl: `mock://photo-report/${fileId}`,
          method: "PUT",
          headers: { "Content-Type": body.contentType },
          expiresAt: new Date(expiresAtMs).toISOString(),
          limits: ARTWORK_LIMITS,
        };
      });
    },

    publishPhotoReport(id: number, body: PhotoReportBody): Promise<SellerOrder> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const order = await requireFactoryOrder(id);
        const state = getState();
        const files = body.fileIds
          .map((fileId) => state.uploads.find((item) => item.fileId === fileId))
          .filter((item) => item !== undefined);
        if (files.length === 0) {
          throw problem(
            422,
            `${P}/photo-report-empty`,
            "Нечего публиковать",
            "Приложите хотя бы одно фото",
            { fileIds: ["Приложите хотя бы одно фото"] },
          );
        }
        const caption = body.caption?.trim() ?? "";
        const occurredAt = new Date(now()).toISOString();
        const tones = ["a", "b", "c", "d"] as const;
        ctx.emit(order.id, {
          type: "photo_report",
          orderId: order.id,
          occurredAt,
          actor: factoryActor(order, orgId),
          title: caption.length > 0 ? `Фотоотчёт: ${caption}` : "Фотоотчёт",
          detail: `${String(files.length)} фото · ${order.offer.factoryName}`,
          photos: files.map((file, index) => ({
            id: file.fileId,
            url: null,
            label: file.fileName,
            tone: tones[index % tones.length] ?? "a",
            takenAt: occurredAt,
          })),
          caption: caption.length > 0 ? caption : null,
        });
        state.uploads = state.uploads.filter((item) => !body.fileIds.includes(item.fileId));
        save();
        return toSellerOrder(order);
      });
    },

    /* ───────── предложения ───────── */

    listSellerOffers(): Promise<SellerOfferList> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const records = listSellerOfferRecords(orgId);
        const items = records.map(toOfferListItem);
        const weak = items.find((item) => item.views > 300 && item.orders === 0);
        return {
          items,
          total: items.length,
          counts: {
            all: items.length,
            listed: items.filter((item) => item.listed).length,
            hidden: items.filter((item) => item.status === "published" && !item.listed).length,
            moderation: items.filter((item) => item.status === "moderation").length,
            draft: items.filter((item) => item.status === "draft").length,
          },
          hint: weak
            ? {
                offerId: weak.id,
                title: `«${weak.title}»: ${formatNumber(weak.views)} просмотров, 0 заказов`,
                text: "Цена выше медианы категории (172 ₽ при 1 000 шт). MOQ выше, чем у конкурентов.",
              }
            : null,
        };
      });
    },

    getSellerOfferEditor(id: number | null): Promise<SellerOfferEditor> {
      return respond(async () => {
        const { orgId, name } = await requireFactoryOrg();
        if (id !== null && !findSellerOfferRecord(id)) {
          throw problem(404, "/problems/not-found", "Не найдено", `Предложение ${String(id)}`);
        }
        return editorOf(id, orgId, name);
      });
    },

    saveSellerOffer(id: number | null, body: SaveSellerOfferBody): Promise<SellerOfferEditor> {
      return respond(async () => {
        const { orgId, name } = await requireFactoryOrg();
        const nowIso = new Date(now()).toISOString();
        const record =
          id === null ? createSellerOfferRecord(orgId, nowIso) : findSellerOfferRecord(id);
        if (!record) {
          throw problem(404, "/problems/not-found", "Не найдено", `Предложение ${String(id)}`);
        }
        const next = { ...record.draft, ...body };
        const errors = validateOfferPricing(next);
        if (next.title.trim().length === 0) errors.title = ["Укажите название предложения"];
        if (hasPricingErrors(errors)) {
          throw problem(
            422,
            `${P}/invalid-offer`,
            "Проверьте условия предложения",
            "Ступени цены обязаны расти по объёму, а цена — не расти.",
            errors,
          );
        }
        patchSellerOfferRecord(record.id, body, nowIso);
        return editorOf(record.id, orgId, name);
      });
    },

    submitSellerOffer(id: number): Promise<SubmitSellerOfferResponse> {
      return respond(async () => {
        await requireFactoryOrg();
        const record = findSellerOfferRecord(id);
        if (!record) {
          throw problem(404, "/problems/not-found", "Не найдено", `Предложение ${String(id)}`);
        }
        if (record.status === "moderation") {
          throw problem(
            409,
            `${P}/offer-in-moderation`,
            "Уже на модерации",
            "Дождитесь решения оператора — обычно до 1 рабочего дня.",
          );
        }
        const errors = validateOfferPricing(record.draft);
        if (record.draft.title.trim().length === 0) errors.title = ["Укажите название предложения"];
        if (hasPricingErrors(errors)) {
          throw problem(
            422,
            `${P}/invalid-offer`,
            "Предложение не готово к публикации",
            undefined,
            errors,
          );
        }
        const changes = offerChanges(record);
        submitSellerOfferRecord(id, new Date(now()).toISOString());
        const updated = findSellerOfferRecord(id);
        return {
          offer: toOfferListItem(updated ?? record),
          changes,
          slaNote: needsModeration(changes)
            ? "Название, фото и характеристики проверяет оператор — до 1 рабочего дня."
            : "Правки цены и сроков публикуются сразу после проверки.",
        };
      });
    },

    setSellerOfferListed(id: number, body: SetOfferListedBody): Promise<SellerOfferListItem> {
      return respond(async () => {
        await requireFactoryOrg();
        const record = findSellerOfferRecord(id);
        if (!record) {
          throw problem(404, "/problems/not-found", "Не найдено", `Предложение ${String(id)}`);
        }
        if (record.status !== "published") {
          throw transitionNotAllowed("В выдачу попадает только опубликованное предложение.");
        }
        setSellerOfferListed(id, body.listed, new Date(now()).toISOString());
        return toOfferListItem(findSellerOfferRecord(id) ?? record);
      });
    },

    /* ───────── образцы ───────── */

    listSellerSamples(): Promise<SellerSampleList> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const store = storeOf(orgId);
        return { items: store.samples, total: store.samples.length, conversionPct: 61 };
      });
    },

    acceptSellerSample(id: string): Promise<SellerSampleList> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const store = storeOf(orgId);
        const sample = store.samples.find((item) => item.id === id);
        if (!sample) throw problem(404, "/problems/not-found", "Не найдено", `Образец ${id}`);
        if (sample.status !== "new") throw transitionNotAllowed("Запрос уже принят в работу.");
        sample.status = "in_work";
        sample.dueNote = `Изготовить до ${formatDayMonth(new Date(now() + 5 * 86_400_000))}`;
        save();
        return { items: store.samples, total: store.samples.length, conversionPct: 61 };
      });
    },

    shipSellerSample(id: string, body: ShipSampleBody): Promise<SellerSampleList> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const store = storeOf(orgId);
        const sample = store.samples.find((item) => item.id === id);
        if (!sample) throw problem(404, "/problems/not-found", "Не найдено", `Образец ${id}`);
        const tracking = body.trackingNumber.trim();
        if (tracking.length === 0) {
          throw problem(422, `${P}/invalid-tracking`, "Укажите трек-номер", undefined, {
            trackingNumber: ["Укажите трек-номер перевозчика"],
          });
        }
        sample.status = "shipped";
        sample.trackingNumber = tracking;
        sample.dueNote = null;
        save();
        return { items: store.samples, total: store.samples.length, conversionPct: 61 };
      });
    },

    declineSellerSample(id: string, body: DeclineSampleBody): Promise<SellerSampleList> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const store = storeOf(orgId);
        const sample = store.samples.find((item) => item.id === id);
        if (!sample) throw problem(404, "/problems/not-found", "Не найдено", `Образец ${id}`);
        sample.status = "declined";
        sample.dueNote = body.reason?.trim() ?? null;
        save();
        return { items: store.samples, total: store.samples.length, conversionPct: 61 };
      });
    },

    /* ───────── финансы ───────── */

    getSellerFinanceSummary(): Promise<SellerFinanceSummary> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const orders = ordersOfFactory(orgId);
        const store = storeOf(orgId);
        const summary = summaryOf(orders);
        const completed = orders.filter((order) => order.status === "completed");
        const paidTotal = completed.reduce((sum, order) => sum + orderPayoutOf(order), 0);
        const feeWithheld = completed.reduce((sum, order) => sum + orderFeeOf(order), 0);
        const next = orders.find((order) => order.status === "acceptance");

        return {
          escrowHeld: summary.escrowHeld,
          payable: summary.payoutPlanned,
          paidTotal,
          feeWithheld,
          feePercent: PLATFORM_FEE_PERCENT,
          nextPayoutAmount: next === undefined ? 0 : orderPayoutOf(next),
          nextPayoutAt: next?.shipDate ?? null,
          payoutAccount: store.profile.payoutAccount,
          escrowOrders: orders
            .filter((order) => order.paidAt !== null && order.status !== "completed")
            .map((order) => ({
              orderId: order.id,
              title: `№ ${String(order.id)} · ${order.offer.title}`,
              amount: order.quote.total,
              note:
                order.status === "awaiting_confirmation"
                  ? "ждёт вашего подтверждения"
                  : order.status === "acceptance"
                    ? "приёмка заказчиком"
                    : orderStatusTitle(order.status).toLowerCase(),
            })),
        };
      });
    },

    listSellerPayouts(): Promise<SellerPayoutsPage> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const items: SellerPayout[] = ordersOfFactory(orgId)
          .filter((order) => order.paidAt !== null && order.status !== "awaiting_confirmation")
          .map((order) => {
            const fee = orderFeeOf(order);
            const released = order.status === "completed";
            return {
              dealId: `deal-${String(order.id)}`,
              dealNo: 4900 + (order.id - 4700),
              subjectId: String(order.id),
              customerOrgId: order.orgId,
              amount: order.quote.total,
              feeAmount: fee,
              payoutAmount: order.quote.total - fee,
              status: released ? "released" : "funded",
              statusTitle: released ? "Выплачено" : "Запланирована",
              createdAt: order.paidAt ?? order.createdAt,
              updatedAt: order.updatedAt,
              orderId: order.id,
              orderTitle: order.offer.title,
              customerName: order.payer?.name ?? "Заказчик",
              updDocumentId: order.documents.find((doc) => doc.title.startsWith("УПД"))?.id,
            };
          });
        return { items, nextCursor: null };
      });
    },

    /* ───────── отзывы и вопросы ───────── */

    getSellerFeedback(): Promise<SellerFeedback> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        return feedbackOf(orgId);
      });
    },

    answerSellerQuestion(questionId: number, body: AnswerBody): Promise<SellerFeedback> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const store = storeOf(orgId);
        const question = store.questions.find((item) => item.id === questionId);
        if (!question) throw problem(404, "/problems/not-found", "Не найдено", "Вопрос");
        const text = body.text.trim();
        if (text.length === 0) {
          throw problem(422, `${P}/empty-answer`, "Пустой ответ", undefined, {
            text: ["Напишите ответ — его увидят все посетители карточки"],
          });
        }
        question.answer = { text, answeredAt: new Date(now()).toISOString() };
        save();
        return feedbackOf(orgId);
      });
    },

    replySellerReview(reviewId: number, body: AnswerBody): Promise<SellerFeedback> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const store = storeOf(orgId);
        const review = store.reviews.find((item) => item.id === reviewId);
        if (!review) throw problem(404, "/problems/not-found", "Не найдено", "Отзыв");
        const text = body.text.trim();
        if (text.length === 0) {
          throw problem(422, `${P}/empty-answer`, "Пустой ответ", undefined, {
            text: ["Напишите ответ"],
          });
        }
        review.reply = { text, repliedAt: new Date(now()).toISOString() };
        save();
        return feedbackOf(orgId);
      });
    },

    /* ───────── аудит, профиль, онбординг ───────── */

    getSellerAudit(): Promise<SellerAudit> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        return storeOf(orgId).audit;
      });
    },

    requestSellerAudit(body: RequestAuditBody): Promise<SellerAudit> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const store = storeOf(orgId);
        if (store.audit.status === "requested" || store.audit.status === "scheduled") {
          throw problem(409, `${P}/audit-requested`, "Заявка уже подана");
        }
        store.audit = {
          ...store.audit,
          status: "requested",
          warning: {
            title: "Заявка на аудит принята",
            text: body.comment?.trim() || "Оператор свяжется с вами и назначит выезд аудитора.",
          },
        };
        save();
        return store.audit;
      });
    },

    getSellerProfile(): Promise<SellerProfile> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        return storeOf(orgId).profile;
      });
    },

    updateSellerProfile(body: UpdateSellerProfileBody): Promise<SellerProfile> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const store = storeOf(orgId);
        store.profile = { ...store.profile, ...body };
        save();
        return store.profile;
      });
    },

    getFactoryOnboarding(): Promise<FactoryOnboardingDraft> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        return storeOf(orgId).onboarding;
      });
    },

    saveFactoryOnboarding(body: SaveFactoryOnboardingBody): Promise<FactoryOnboardingDraft> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const store = storeOf(orgId);
        store.onboarding = {
          ...store.onboarding,
          ...body,
          updatedAt: new Date(now()).toISOString(),
        };
        if (body.auditRequested === true) store.audit = { ...store.audit, status: "requested" };
        save();
        return store.onboarding;
      });
    },

    /* ───────── мощность ───────── */

    getCapacityPlan(query: CapacityQuery = {}): Promise<CapacityPlan> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        return buildPlan(orgId, query);
      });
    },

    updateCapacityPlan(body: UpdateCapacityBody): Promise<CapacityPlan> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const store = storeOf(orgId);
        const plan = buildPlan(orgId);
        const errors: Record<string, string[]> = {};
        const todayWeek = weekStartOf(new Date(now()));

        for (const cell of body.cells ?? []) {
          const key = `${cell.lineId}:${cell.weekStart}`;
          if (cell.weekStart < todayWeek) {
            throw problem(
              409,
              "https://partiya.ru/problems/capacity/week-in-past",
              "Неделя в прошлом",
              "План задним числом не правится.",
            );
          }
          if (cell.unitsTotal < 0 || cell.externalUnits < 0) {
            errors[key] = ["Значения не могут быть отрицательными"];
            continue;
          }
          const current = plan.cells.find(
            (item) => item.lineId === cell.lineId && item.weekStart === cell.weekStart,
          );
          const reserved = (current?.hardUnits ?? 0) + (current?.softUnits ?? 0);
          if (cell.unitsTotal < reserved + cell.externalUnits) {
            errors[key] = [
              `Занято ${formatNumber(reserved + cell.externalUnits)} усл. ед. — план не может быть меньше`,
            ];
            continue;
          }
          store.capacity.cells[key] = {
            unitsTotal: cell.unitsTotal,
            externalUnits: cell.externalUnits,
            planned: cell.unitsTotal > 0,
          };
        }

        if (Object.keys(errors).length > 0) {
          throw problem(
            422,
            "https://partiya.ru/problems/capacity/below-reserved",
            "План ниже занятого",
            "Уменьшить план можно только до объёма, который ещё не продан.",
            errors,
          );
        }

        for (const patch of body.itemCoefficients ?? []) {
          const item = store.capacity.coefficients.find((row) => row.key === patch.key);
          if (!item) continue;
          if (patch.unitsPerItem <= 0) {
            throw problem(
              422,
              "https://partiya.ru/problems/capacity/invalid",
              "Коэффициент должен быть больше нуля",
            );
          }
          item.unitsPerItem = patch.unitsPerItem;
        }
        if (body.underloadDiscount) {
          store.capacity.underload = { ...store.capacity.underload, ...body.underloadDiscount };
        }
        for (const line of body.lines ?? []) {
          const target = store.capacity.lines.find((row) => row.id === line.id);
          if (!target) continue;
          if (line.title !== undefined) target.title = line.title;
          if (line.defaultUnitsPerWeek !== undefined) {
            target.defaultUnitsPerWeek = line.defaultUnitsPerWeek;
          }
        }
        save();
        return buildPlan(orgId);
      });
    },

    copyCapacityPlan(body: CopyCapacityBody): Promise<CapacityPlan> {
      return respond(async () => {
        const { orgId } = await requireFactoryOrg();
        const store = storeOf(orgId);
        const plan = buildPlan(orgId, { from: body.fromWeekStart });
        const sourceWeeks = weeksFrom(body.fromWeekStart, body.weeks);
        const targetWeeks = weeksFrom(body.toWeekStart, body.weeks);
        sourceWeeks.forEach((sourceWeek, index) => {
          const targetWeek = targetWeeks[index];
          if (targetWeek === undefined) return;
          for (const line of store.capacity.lines) {
            const source = plan.cells.find(
              (cell) => cell.lineId === line.id && cell.weekStart === sourceWeek,
            );
            if (!source) continue;
            store.capacity.cells[`${line.id}:${targetWeek}`] = {
              unitsTotal: source.unitsTotal,
              planned: source.planned,
              externalUnits: body.withExternal === true ? source.externalUnits : 0,
            };
          }
        });
        save();
        return buildPlan(orgId);
      });
    },
  };

  function feedbackOf(orgId: string): SellerFeedback {
    const store = storeOf(orgId);
    const reviews = store.reviews;
    const rating = store.profile.rating;
    const distribution = [5, 4, 3, 2, 1].map((value) => ({
      rating: value,
      count: value === 5 ? 102 : value === 4 ? 19 : value === 3 ? 4 : value === 2 ? 1 : 0,
    }));
    return {
      questions: store.questions,
      reviews,
      rating,
      reviewCount: store.profile.reviews,
      distribution,
      respondsInMinutes: 40,
      unansweredQuestions: store.questions.filter((item) => item.answer === null).length,
      templates: [
        {
          key: "lead",
          title: "сроки",
          text: "Срок производства — 14–18 рабочих дней, плюс 3 дня на каждую 1 000 шт сверх первой.",
        },
        {
          key: "pantone",
          title: "Pantone",
          text: "Окраска в ваш Pantone — от 1 000 шт, срок +5 рабочих дней.",
        },
        {
          key: "sample",
          title: "образец",
          text: "Образец — 1 500 ₽ и 5 рабочих дней, стоимость зачтётся в первую партию.",
        },
      ],
    };
  }
}
