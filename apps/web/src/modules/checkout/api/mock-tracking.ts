import type {
  Dispute,
  DisputeOptions,
  DocumentList,
  DocumentQuery,
  DocumentState,
  DocumentSummary,
  EdoConnection,
  EscrowDeal,
  EscrowOperation,
  EscrowOverview,
  MarkMessagesReadBody,
  MarkNotificationsReadBody,
  MessageAttachmentUploadRequest,
  MessageAttachmentUploadResponse,
  NotificationItem,
  NotificationList,
  NotificationQuery,
  NotificationSettings,
  NotificationTopic,
  OpenDisputeBody,
  Order,
  OrderDocument,
  OrderEvent,
  OrderEventPage,
  OrderEventQuery,
  OrderMessage,
  OrderMessageList,
  OrderMessageQuery,
  OrderStatus,
  SendOrderMessageBody,
  SignDocumentResponse,
  UpdateNotificationSettingsBody,
  UserCounters,
} from "@partiya/api-contracts";

import { ApiError } from "@/shared/api";
import type { OrderStreamOptions } from "@/shared/api";
import { addWorkingDays } from "@/shared/lib/dates";
import { customerStageOf, orderStatusTitle } from "@/shared/lib/order-status";

import { ARTWORK_LIMITS, isAllowedArtworkType } from "../lib/artwork";
import type { MockState } from "./mock-backend";
import {
  autoAcceptAt,
  finalPaymentOf,
  firstTrancheAmount,
  invoiceNumberOf,
  isSplitPayment,
  issueSecondTranche,
  orderFeeOf,
  secondTrancheAmount,
  settleSecondTranche,
} from "./mock-projections";
import { messagesOf, type MockOrder, type NewOrderEvent, statusEventText } from "./mock-seed";

/* Мок крейтов `tracking`, `messaging`, `documents`, `disputes`, `notifications`, `payments`.
 *
 * Всё это — надстройки над ОДНИМ журналом заказа, который живёт в состоянии мока заказов
 * (`mock-backend.ts`). Второго хранилища здесь нет намеренно: события, сообщения, деньги
 * и уведомления обязаны относиться к тем же заказам, включая только что оформленные.
 * Ровно по той же причине у бэка все эти крейты читают `order_events`, а не свои копии.
 *
 * Что мок воспроизводит всерьёз:
 *
 * * `seq` монотонен и общий для ленты и чата — курсор ленты, `Last-Event-ID` канала и
 *   порядок сообщений считаются по одному числу;
 * * канал заказа доставляет ровно те же события, что вернёт `GET /events?after=seq`,
 *   поэтому «дочитывание после обрыва» проверяется без сервера;
 * * уведомления и документы — проекции журнала и заказа, а не отдельные записи: закрыл
 *   заказ — проекция изменилась сама.
 *
 * Эмулятор потока (таймер, подкидывающий прогресс и сообщение технолога) работает только
 * здесь: у настоящего бэка это делает фабрика. */

/** Как часто эмулятор потока шевелит производство. */
const EMULATOR_INTERVAL_MS = 12_000;

/** Полный автомат «вперёд» для демо-пульта — те же рёбра, что в диаграмме 5.2. */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  awaiting_payment: "awaiting_confirmation",
  awaiting_confirmation: "confirmed",
  confirmed: "artwork_review",
  artwork_review: "materials",
  materials: "in_production",
  in_production: "quality_control",
  quality_control: "shipped",
  shipped: "acceptance",
};

const DEFAULT_SETTINGS: NotificationSettings = {
  preferences: [
    {
      topic: "order_status",
      title: "Статусы заказа",
      channels: { email: true, telegram: true, sms: false },
    },
    {
      topic: "photo_report",
      title: "Фотоотчёты",
      channels: { email: false, telegram: true, sms: false },
    },
    {
      topic: "documents",
      title: "Документы на подпись",
      channels: { email: true, telegram: true, sms: true },
      required: true,
    },
    {
      topic: "messages",
      title: "Сообщения технолога",
      channels: { email: true, telegram: true, sms: false },
    },
    {
      topic: "disputes",
      title: "Споры и возвраты",
      channels: { email: true, telegram: true, sms: true },
      required: true,
    },
    {
      topic: "offers",
      title: "Новые предложения",
      channels: { email: true, telegram: false, sms: false },
    },
  ],
  telegramConnected: false,
  telegramConnectUrl: "https://t.me/partiya_bot?start=demo",
  email: "a.korableva@kora.ru",
  phone: "+7 916 000-12-34",
};

const REASON_TITLES: Record<string, string> = {
  size_mismatch: "Несоответствие размерной сетки",
  defects: "Брак изделий",
  print_defects: "Брак печати",
  shortfall: "Недовложение",
  deadline: "Срыв срока",
  other: "Другое",
};

/* ─────────────────────────────── ошибки как у бэка ─────────────────────────────── */

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

const notFound = (detail: string) => problem(404, "/problems/not-found", "Не найдено", detail);

/* ─────────────────────────────── контекст ─────────────────────────────── */

/** Что слайс берёт у мока заказов. Состояние одно на всех — отсюда функции доступа,
    а не копия объекта: `reset()` подменяет состояние целиком. */
export interface TrackingContext {
  now: () => number;
  getState: () => MockState;
  save: () => void;
  respond: <T>(work: () => T | Promise<T>) => Promise<T>;
  requireCustomerOrg: () => Promise<{ orgId: string }>;
  requireOwnOrder: (id: number) => Promise<MockOrder>;
  /** Участник сделки: заказчик, завод или оператор (см. mock-backend.ts). */
  requireParticipant: (
    id: number,
  ) => Promise<{ order: MockOrder; side: "customer" | "factory" | "operator" }>;
  publicOrder: (order: MockOrder) => Order;
  journal: (orderId: number) => OrderEvent[];
  append: (orderId: number, event: NewOrderEvent) => OrderEvent;
  unreadOf: (orderId: number, channel?: string) => number;
  unreadFor: (
    orderId: number,
    side: "customer" | "factory" | "operator",
    channel?: string,
  ) => number;
  openDisputeOf: (orderId: number) => Dispute | null;
  touch: (order: MockOrder) => void;
}

export interface MockTrackingSlice {
  getOrderEvents(orderId: number, query?: OrderEventQuery): Promise<OrderEventPage>;
  streamOrderEvents(orderId: number, options: OrderStreamOptions): () => void;
  getOrderMessages(orderId: number, query?: OrderMessageQuery): Promise<OrderMessageList>;
  sendOrderMessage(
    orderId: number,
    body: SendOrderMessageBody,
    idempotencyKey: string,
  ): Promise<OrderMessage>;
  markOrderMessagesRead(orderId: number, body: MarkMessagesReadBody): Promise<OrderMessageList>;
  requestMessageAttachmentUpload(
    orderId: number,
    body: MessageAttachmentUploadRequest,
  ): Promise<MessageAttachmentUploadResponse>;
  listDocuments(query?: DocumentQuery): Promise<DocumentList>;
  signDocument(documentId: string): Promise<SignDocumentResponse>;
  getEdoConnection(): Promise<EdoConnection>;
  getDisputeOptions(orderId: number): Promise<DisputeOptions>;
  getDispute(orderId: number): Promise<Dispute>;
  openDispute(orderId: number, body: OpenDisputeBody, idempotencyKey: string): Promise<Dispute>;
  withdrawDispute(orderId: number): Promise<Dispute>;
  requestDisputeEvidenceUpload(
    orderId: number,
    body: MessageAttachmentUploadRequest,
  ): Promise<MessageAttachmentUploadResponse>;
  listNotifications(query?: NotificationQuery): Promise<NotificationList>;
  markNotificationsRead(body: MarkNotificationsReadBody): Promise<NotificationList>;
  getNotificationSettings(): Promise<NotificationSettings>;
  updateNotificationSettings(body: UpdateNotificationSettingsBody): Promise<NotificationSettings>;
  getUserCounters(): Promise<UserCounters>;
  streamUserEvents(options: {
    onNotification?: (item: NotificationItem) => void;
    onCounters?: (counters: UserCounters) => void;
    onStateChange?: (state: "connecting" | "open" | "closed") => void;
  }): () => void;
  getEscrowOverview(): Promise<EscrowOverview>;
  getOrderEscrow(orderId: number): Promise<EscrowDeal>;
  /** Записать событие и разослать его подписчикам канала. Внутреннее, но нужно моку
      заказов: приёмка и оплата тоже обязаны оставить след в журнале. */
  emit(orderId: number, event: NewOrderEvent): OrderEvent;
  /** Демо-пульт: продвинуть заказ по автомату от лица фабрики или системы. */
  demoAdvance(orderId: number, to?: OrderStatus): Promise<Order>;
  /** Остановить эмулятор и разорвать подписки — `reset()` и выход из аккаунта. */
  stopStreams(): void;
}

export function createTrackingSlice(ctx: TrackingContext): MockTrackingSlice {
  const { now, getState, save, respond } = ctx;

  /** Подписчики канала заказа: номер заказа → обработчики. */
  const orderSubscribers = new Map<number, Set<(event: OrderEvent) => void>>();
  const userSubscribers = new Set<() => void>();
  let emulator: ReturnType<typeof setInterval> | undefined;

  function emit(orderId: number, event: NewOrderEvent): OrderEvent {
    const stored = ctx.append(orderId, event);
    save();
    for (const listener of orderSubscribers.get(orderId) ?? []) listener(stored);
    for (const listener of userSubscribers) listener();
    return stored;
  }

  /* ───────── эмулятор потока: у бэка это фабрика, здесь — таймер ───────── */

  function ensureEmulator(): void {
    if (emulator !== undefined) return;
    emulator = setInterval(() => {
      for (const orderId of orderSubscribers.keys()) {
        tickOrder(orderId);
      }
    }, EMULATOR_INTERVAL_MS);
  }

  function stopEmulatorIfIdle(): void {
    if (orderSubscribers.size > 0 || emulator === undefined) return;
    clearInterval(emulator);
    emulator = undefined;
  }

  /** Один шаг производства: подвинуть строку «Отшито», иногда написать в чат. */
  function tickOrder(orderId: number): void {
    const state = getState();
    const order = state.orders.find((row) => row.id === orderId);
    if (!order || order.status !== "in_production") return;

    const events = ctx.journal(orderId);
    const sewn = [...events]
      .reverse()
      .find((event) => event.type === "progress" && event.progress.id === "sewn");
    const done = sewn?.type === "progress" ? sewn.progress.done : 0;
    const total = order.params.qty;
    if (done >= total) return;

    const next = Math.min(total, done + Math.max(10, Math.round(total * 0.05)));
    const occurredAt = new Date(now()).toISOString();
    const factory = {
      kind: "factory" as const,
      name: `Технолог «${order.offer.factoryName}»`,
      orgId: null,
    };
    emit(orderId, {
      type: "progress",
      orderId,
      occurredAt,
      actor: factory,
      title: `Отшито ${formatQty(next)} / ${formatQty(total)}`,
      detail: "1-я линия, план на неделю выполняется",
      progress: { id: "sewn", title: "Отшито", done: next, total, updatedAt: occurredAt },
    });

    // раз в несколько шагов технолог пишет сам: без этого чат выглядит мёртвым
    if (next >= total) {
      emit(orderId, {
        type: "message",
        orderId,
        occurredAt,
        actor: factory,
        title: `Сообщение · ${factory.name}`,
        detail: null,
        message: {
          id: `msg-${String(orderId)}-${String(now())}`,
          seq: 0,
          orderId,
          channel: "order",
          author: factory,
          text: "Пошив закончили, уходим на печать. Фотоотчёт пришлю вечером.",
          attachments: [],
          createdAt: occurredAt,
          readAt: null,
          own: false,
        },
      });
    }
  }

  /* ───────── журнал ───────── */

  function eventsPage(orderId: number, query: OrderEventQuery): OrderEventPage {
    const all = ctx.journal(orderId);
    const filtered =
      query.types && query.types.length > 0
        ? all.filter((event) => query.types?.includes(event.type))
        : all;
    const after = query.after ?? 0;
    const limit = Math.min(200, query.limit ?? 50);
    const newer = filtered.filter((event) => event.seq > after);
    // без курсора отдаём ХВОСТ журнала: экран открывается на свежем, а не на первом дне
    const items = query.after === undefined ? newer.slice(-limit) : newer.slice(0, limit);
    return {
      items,
      lastSeq: all.at(-1)?.seq ?? 0,
      hasMore: items.length > 0 && filtered.indexOf(items[0] as OrderEvent) > 0,
      total: filtered.length,
    };
  }

  /* ───────── документы ───────── */

  function documentNumber(orderId: number, document: OrderDocument): string {
    const no = String(orderId);
    switch (document.kind) {
      case "specification":
        return `${no}-С`;
      case "invoice":
        return `${no}-СЧ`;
      case "act":
        return document.title.includes("УПД") ? `${no}-У` : `${no}-А`;
      default:
        return no;
    }
  }

  function documentState(order: MockOrder, document: OrderDocument): DocumentState {
    if (document.url === null) return "generating";
    if (document.kind === "invoice") return order.paidAt === null ? "awaiting_payment" : "paid";
    if (document.signature === "edo_signed") return "signed";
    // УПД и акт подписывает заказчик, оферту и спецификацию — фабрика
    return document.kind === "act" ? "awaiting_customer" : "awaiting_factory";
  }

  function documentsOfOrg(orgId: string): DocumentSummary[] {
    const state = getState();
    return state.orders
      .filter((order) => order.orgId === orgId && order.status !== "draft")
      .flatMap((order) =>
        order.documents.map<DocumentSummary>((document) => ({
          ...document,
          orderId: order.id,
          number: documentNumber(order.id, document),
          state: documentState(order, document),
          amount: document.kind === "invoice" ? order.quote.total : null,
          signedAt: document.signature === "edo_signed" ? document.createdAt : null,
          orderTitle: `${order.offer.title}, ${String(order.params.qty)} шт`,
        })),
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  /* ───────── уведомления: проекция журналов ───────── */

  const TOPIC_OF: Record<OrderEvent["type"], NotificationTopic> = {
    status_changed: "order_status",
    progress: "order_status",
    photo_report: "photo_report",
    message: "messages",
    document: "documents",
    money: "order_status",
    note: "order_status",
  };

  /** Сколько уведомление считается «новым», если его не открывали.
   *
   * У настоящего бэка прочитанность хранится по каждому уведомлению. Здесь лента
   * выводится из журналов, и без этого окна вся история заказа выглядела бы одной
   * огромной пачкой непрочитанного — счётчик на колокольчике показывал бы 58. */
  const UNREAD_WINDOW_MS = 24 * 60 * 60_000;

  /** Глубина ленты. Уведомление — не журнал: месячную историю заказа человек смотрит
      в самом заказе, а здесь ему нужно «что нового». */
  const FEED_WINDOW_MS = 14 * 24 * 60 * 60_000;

  function notificationsOfOrg(orgId: string): NotificationItem[] {
    const state = getState();
    const read = new Set(state.readNotifications);
    const staleBefore = now() - UNREAD_WINDOW_MS;
    const feedBefore = now() - FEED_WINDOW_MS;
    const items: NotificationItem[] = [];
    for (const order of state.orders) {
      if (order.orgId !== orgId) continue;
      for (const event of ctx.journal(order.id)) {
        // свои же сообщения уведомлением не приходят
        if (event.type === "message" && event.message.own) continue;
        if (event.type === "progress" && event.progress.done % 500 !== 0) continue;
        if (Date.parse(event.occurredAt) < feedBefore) continue;
        const id = `${String(order.id)}:${String(event.seq)}`;
        items.push({
          id,
          topic: TOPIC_OF[event.type],
          title:
            event.type === "message"
              ? `Сообщение технолога · заказ № ${String(order.id)}`
              : `${event.title} · заказ № ${String(order.id)}`,
          text: event.type === "message" ? event.message.text : (event.detail ?? null),
          createdAt: event.occurredAt,
          readAt:
            read.has(id) || Date.parse(event.occurredAt) < staleBefore ? event.occurredAt : null,
          href: `/account/orders/${String(order.id)}`,
          orderId: order.id,
        });
      }
    }
    return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 40);
  }

  function countersOfOrg(orgId: string): UserCounters {
    const state = getState();
    const own = state.orders.filter((order) => order.orgId === orgId);
    const documents = documentsOfOrg(orgId);
    return {
      unreadNotifications: notificationsOfOrg(orgId).filter((item) => item.readAt === null).length,
      unreadMessages: own.reduce((sum, order) => sum + ctx.unreadOf(order.id), 0),
      ordersAwaitingAction: own.filter((order) => order.bucket === "action").length,
      documentsAwaitingSignature: documents.filter((item) => item.state === "awaiting_customer")
        .length,
      ordersInAcceptance: own.filter((order) => order.status === "acceptance").length,
      openDisputes: own.filter((order) => ctx.openDisputeOf(order.id) !== null).length,
    };
  }

  /* ───────── деньги ───────── */

  function escrowDealOf(order: MockOrder): EscrowDeal {
    const total = order.quote.total;
    // п. 2: комиссия только со стоимости товара
    const fee = orderFeeOf(order);
    const open = ctx.openDisputeOf(order.id);
    const released = order.status === "completed";
    const refunded =
      order.status === "refunded" || order.status === "declined" || order.status === "cancelled";
    const held = order.paidAt !== null && !released && !refunded;
    const acceptanceDeadline =
      order.deliveredAt === null || order.deliveredAt === undefined
        ? null
        : autoAcceptAt(order.deliveredAt);
    const split = isSplitPayment(order);
    const statusOf = (paid: boolean) =>
      released ? "released" : refunded ? "refunded" : paid ? "held" : "awaiting_funds";
    const firstPaid = order.paidAt !== null;
    const secondPaid = order.secondTranchePaidAt != null;
    const heldNow = split
      ? (firstPaid ? firstTrancheAmount(total) : 0) + (secondPaid ? secondTrancheAmount(total) : 0)
      : total;
    const tranches: EscrowDeal["tranches"] = split
      ? [
          {
            id: `tr-${String(order.id)}-1`,
            index: 1,
            title: "Первый транш · при запуске",
            amount: firstTrancheAmount(total),
            status: statusOf(firstPaid),
            dueAt: order.payment?.dueAt ?? null,
            heldAt: order.paidAt,
            releasedAt: released ? (order.acceptedAt ?? null) : null,
          },
          {
            // п. 4: выставляется по событию «готов к отгрузке»; до этого срока нет
            id: `tr-${String(order.id)}-2`,
            index: 2,
            title: "Второй транш · перед отгрузкой",
            amount: secondTrancheAmount(total),
            status: statusOf(secondPaid),
            dueAt: order.secondTrancheDueAt ?? null,
            heldAt: order.secondTranchePaidAt ?? null,
            releasedAt: released ? (order.acceptedAt ?? null) : null,
          },
        ]
      : [
          {
            id: `tr-${String(order.id)}-1`,
            index: 1,
            title: "Транш · вся сумма при запуске",
            amount: total,
            status: statusOf(held),
            dueAt: order.payment?.dueAt ?? null,
            heldAt: order.paidAt,
            releasedAt: released ? (order.acceptedAt ?? null) : null,
          },
        ];

    return {
      id: `deal-${String(order.id)}`,
      orderId: order.id,
      status: open
        ? "blocked"
        : released
          ? "released"
          : refunded
            ? "refunded"
            : held
              ? "held"
              : "awaiting_funds",
      method: order.paymentMethod ?? "escrow_full",
      amount: total,
      heldAmount: held || open ? heldNow : 0,
      releasedAmount: released ? total - fee : 0,
      refundedAmount: refunded ? total : 0,
      platformFee: fee,
      factoryPayout: total - fee,
      tranches,
      autoReleaseAt: acceptanceDeadline,
      blockedByDisputeId: open?.id ?? null,
      // Q-384, Q-401: второй счёт с реквизитами и его состояние
      finalPayment: finalPaymentOf(order, true),
    };
  }

  function operationsOfOrg(orgId: string): EscrowOperation[] {
    const state = getState();
    const operations: EscrowOperation[] = [];
    for (const order of state.orders) {
      if (order.orgId !== orgId) continue;
      const subtitle = `№ ${String(order.id)} · ${order.offer.title.toLowerCase()}`;
      for (const event of ctx.journal(order.id)) {
        if (event.type !== "money") continue;
        operations.push({
          id: `${String(order.id)}:${String(event.seq)}`,
          at: event.occurredAt,
          kind: event.operation,
          title: event.title,
          subtitle,
          orderId: order.id,
          amount: event.amount,
        });
      }
      if (order.status === "awaiting_payment" && order.payment) {
        operations.push({
          id: `${String(order.id)}:invoice`,
          at: order.submittedAt ?? order.createdAt,
          kind: "invoice",
          title: "Счёт выставлен",
          subtitle,
          orderId: order.id,
          amount: order.payment.amountDue,
        });
      }
    }
    return operations.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }

  /* ───────── сам слайс ───────── */

  return {
    emit,

    getOrderEvents(orderId: number, query: OrderEventQuery = {}): Promise<OrderEventPage> {
      return respond(async () => {
        // журнал принадлежит сделке: его читают обе стороны и оператор
        await ctx.requireParticipant(orderId);
        return eventsPage(orderId, query);
      });
    },

    streamOrderEvents(orderId: number, options: OrderStreamOptions): () => void {
      const listeners = orderSubscribers.get(orderId) ?? new Set();
      const listener = (event: OrderEvent) => {
        if (options.lastSeq !== undefined && event.seq <= options.lastSeq) return;
        options.onEvent(event);
      };
      listeners.add(listener);
      orderSubscribers.set(orderId, listeners);
      ensureEmulator();
      options.onStateChange?.("connecting");
      // канал «открывается» не мгновенно: индикатор связи должен успеть показаться
      const opened = setTimeout(() => {
        options.onStateChange?.("open");
      }, 120);

      return () => {
        clearTimeout(opened);
        listeners.delete(listener);
        if (listeners.size === 0) orderSubscribers.delete(orderId);
        options.onStateChange?.("closed");
        stopEmulatorIfIdle();
      };
    },

    getOrderMessages(orderId: number, query: OrderMessageQuery = {}): Promise<OrderMessageList> {
      return respond(async () => {
        const { side } = await ctx.requireParticipant(orderId);
        const channel = query.channel ?? "order";
        // `own` считается для того, кто спрашивает: своё сообщение у завода и у
        // заказчика — разные сообщения одного и того же журнала
        const all = messagesOf(ctx.journal(orderId), channel).map((message) => ({
          ...message,
          own: message.author.kind === side,
        }));
        const after = query.after;
        const items = after === undefined ? all : all.filter((message) => message.seq > after);
        return { items, total: all.length, unread: ctx.unreadFor(orderId, side, channel) };
      });
    },

    sendOrderMessage(
      orderId: number,
      body: SendOrderMessageBody,
      idempotencyKey: string,
    ): Promise<OrderMessage> {
      return respond(async () => {
        const { order, side } = await ctx.requireParticipant(orderId);
        const state = getState();
        const stored = state.idempotency[idempotencyKey];
        if (stored?.kind === "message") {
          const existing = messagesOf(ctx.journal(orderId), body.channel ?? "order").at(-1);
          if (existing) return existing;
        }
        const text = body.text.trim();
        const attachments = (body.attachmentIds ?? [])
          .map((fileId) => state.uploads.find((item) => item.fileId === fileId))
          .filter((item) => item !== undefined);
        if (text.length === 0 && attachments.length === 0) {
          throw problem(
            422,
            "https://partiya.ru/problems/messages/empty",
            "Пустое сообщение",
            "Напишите текст или приложите файл",
          );
        }
        if (order.status === "completed" || order.status === "cancelled") {
          throw problem(
            409,
            "https://partiya.ru/problems/messages/order-closed",
            "Заказ закрыт",
            "В завершённый заказ писать нельзя — откройте новый.",
          );
        }
        const channel = body.channel ?? "order";
        if (channel === "dispute" && ctx.openDisputeOf(orderId) === null) {
          throw problem(
            409,
            "https://partiya.ru/problems/messages/no-dispute",
            "Спор не открыт",
            "Ветка спора появляется вместе с претензией.",
          );
        }

        const occurredAt = new Date(now()).toISOString();
        const author =
          side === "factory"
            ? {
                kind: "factory" as const,
                name: `Технолог «${order.offer.factoryName}»`,
                orgId: null,
              }
            : side === "operator"
              ? { kind: "operator" as const, name: "Оператор платформы", orgId: null }
              : { kind: "customer" as const, name: "Вы", orgId: order.orgId };
        const message: OrderMessage = {
          id: `msg-${String(orderId)}-${String(now())}`,
          seq: 0,
          orderId,
          channel,
          author,
          text,
          attachments: attachments.map((upload) => ({
            id: upload.fileId,
            fileName: upload.fileName,
            size: upload.size,
            contentType: upload.contentType,
            url: `#/attachments/${upload.fileId}`,
          })),
          createdAt: occurredAt,
          readAt: null,
          own: true,
        };
        const event = emit(orderId, {
          type: "message",
          orderId,
          occurredAt,
          actor: message.author,
          title: `Сообщение · ${author.name}`,
          detail: null,
          message,
        });
        state.idempotency[idempotencyKey] = { kind: "message", orderId };
        save();
        return event.type === "message" ? event.message : message;
      });
    },

    markOrderMessagesRead(orderId: number, body: MarkMessagesReadBody): Promise<OrderMessageList> {
      return respond(async () => {
        const { side } = await ctx.requireParticipant(orderId);
        const channel = body.channel ?? "order";
        const state = getState();
        // курсоры у сторон разные: прочитанное заводом заказчику ничего не говорит
        const key =
          side === "customer"
            ? `${String(orderId)}:${channel}`
            : `${String(orderId)}:${channel}:${side}`;
        state.readCursors[key] = Math.max(state.readCursors[key] ?? 0, body.upToSeq);
        save();
        for (const listener of userSubscribers) listener();
        const all = messagesOf(ctx.journal(orderId), channel).map((message) => ({
          ...message,
          own: message.author.kind === side,
        }));
        return { items: all, total: all.length, unread: ctx.unreadFor(orderId, side, channel) };
      });
    },

    requestMessageAttachmentUpload(
      orderId: number,
      body: MessageAttachmentUploadRequest,
    ): Promise<MessageAttachmentUploadResponse> {
      return respond(async () => {
        await ctx.requireParticipant(orderId);
        return upload(orderId, body, "msg");
      });
    },

    listDocuments(query: DocumentQuery = {}): Promise<DocumentList> {
      return respond(async () => {
        const { orgId } = await ctx.requireCustomerOrg();
        const all = documentsOfOrg(orgId);
        const needle = query.q?.trim().toLowerCase() ?? "";
        const items = all.filter((item) => {
          if (query.orderId !== undefined && item.orderId !== query.orderId) return false;
          if (query.kind !== undefined && item.kind !== query.kind) return false;
          if (query.state !== undefined && item.state !== query.state) return false;
          if (needle.length === 0) return true;
          return (
            item.title.toLowerCase().includes(needle) ||
            item.number.toLowerCase().includes(needle) ||
            String(item.orderId).includes(needle)
          );
        });
        return {
          items,
          total: items.length,
          awaitingSignature: all.filter((item) => item.state === "awaiting_customer").length,
        };
      });
    },

    signDocument(documentId: string): Promise<SignDocumentResponse> {
      return respond(async () => {
        const { orgId } = await ctx.requireCustomerOrg();
        const state = getState();
        const order = state.orders.find(
          (row) => row.orgId === orgId && row.documents.some((doc) => doc.id === documentId),
        );
        const document = order?.documents.find((doc) => doc.id === documentId);
        if (!order || !document) throw notFound("Документ");
        if (document.url === null) {
          throw problem(
            409,
            "https://partiya.ru/problems/documents/not-ready",
            "Документ ещё формируется",
          );
        }
        if (document.signature === "edo_signed") {
          throw problem(
            409,
            "https://partiya.ru/problems/documents/already-signed",
            "Документ уже подписан",
          );
        }
        document.signature = "edo_signed";
        emit(order.id, {
          type: "document",
          orderId: order.id,
          occurredAt: new Date(now()).toISOString(),
          actor: { kind: "customer", name: "Вы", orgId },
          title: `${document.title} подписан по ЭДО`,
          detail: null,
          document,
        });
        save();
        return {
          document: {
            ...document,
            orderId: order.id,
            number: documentNumber(order.id, document),
            state: documentState(order, document),
            amount: document.kind === "invoice" ? order.quote.total : null,
            signedAt: new Date(now()).toISOString(),
            orderTitle: `${order.offer.title}, ${String(order.params.qty)} шт`,
          },
          redirectUrl: null,
        };
      });
    },

    getEdoConnection(): Promise<EdoConnection> {
      return respond(async () => {
        await ctx.requireCustomerOrg();
        return {
          connected: true,
          operator: "Оператор ЭДО (демо)",
          participantId: "2BM-7707083893-202603021200",
          connectedAt: "2026-03-02T12:00:00.000Z",
        };
      });
    },

    getDisputeOptions(orderId: number): Promise<DisputeOptions> {
      return respond(async () => {
        const order = await ctx.requireOwnOrder(orderId);
        const total = order.quote.total;
        const deadline =
          order.deliveredAt === null || order.deliveredAt === undefined
            ? null
            : autoAcceptAt(order.deliveredAt);
        return {
          reasons: Object.entries(REASON_TITLES).map(([value, title]) => ({
            value: value as DisputeOptions["reasons"][number]["value"],
            title,
          })),
          remedies: [
            {
              kind: "rework",
              title: "Допечатка за счёт фабрики",
              description: "Эскроу остаётся заблокированным до приёмки допечатки.",
              amount: null,
              available: true,
            },
            {
              kind: "partial_refund",
              title: "Частичный возврат",
              description: "Возврат за затронутые изделия. Остальное выплачивается фабрике.",
              amount: null,
              available: true,
            },
            {
              kind: "full_refund",
              title: "Полный возврат и возврат партии",
              description: "Партия возвращается фабрике за её счёт.",
              amount: total,
              available: true,
            },
          ],
          totalQty: order.params.qty,
          unitPrice: order.quote.unitPrice,
          evidence: ARTWORK_LIMITS,
          openUntil: deadline,
        };
      });
    },

    getDispute(orderId: number): Promise<Dispute> {
      return respond(async () => {
        await ctx.requireOwnOrder(orderId);
        const dispute = getState().disputes[String(orderId)];
        if (!dispute) throw notFound(`Спор по заказу № ${String(orderId)}`);
        return dispute;
      });
    },

    openDispute(orderId: number, body: OpenDisputeBody, idempotencyKey: string): Promise<Dispute> {
      return respond(async () => {
        const order = await ctx.requireOwnOrder(orderId);
        const state = getState();
        const existing = state.disputes[String(orderId)];
        if (existing && existing.status !== "withdrawn") {
          if (state.idempotency[idempotencyKey]?.kind === "dispute") return existing;
          throw problem(
            409,
            "https://partiya.ru/problems/disputes/already-open",
            "Спор уже открыт",
            "По заказу уже идёт разбирательство.",
          );
        }
        if (order.status !== "in_production" && order.status !== "acceptance") {
          throw problem(
            409,
            "https://partiya.ru/problems/disputes/not-allowed",
            "Сейчас спор открыть нельзя",
            "Претензию принимаем в производстве и в окне приёмки.",
          );
        }
        const errors: Record<string, string[]> = {};
        if (body.description.trim().length < 10) {
          errors.description = ["Опишите проблему — минимум 10 символов"];
        }
        if (
          body.affectedQty !== null &&
          body.affectedQty !== undefined &&
          (body.affectedQty <= 0 || body.affectedQty > order.params.qty)
        ) {
          errors.affectedQty = [`Укажите от 1 до ${String(order.params.qty)} шт`];
        }
        if (Object.keys(errors).length > 0) {
          throw problem(
            422,
            "https://partiya.ru/problems/disputes/invalid",
            "Проверьте претензию",
            undefined,
            errors,
          );
        }

        const nowMs = now();
        const openedAt = new Date(nowMs).toISOString();
        const affected = body.affectedQty ?? order.params.qty;
        const remedyAmount =
          body.remedy === "full_refund"
            ? order.quote.total
            : body.remedy === "partial_refund"
              ? order.quote.unitPrice * affected
              : null;
        const evidence = (body.evidenceFileIds ?? [])
          .map((fileId) => state.uploads.find((item) => item.fileId === fileId))
          .filter((item) => item !== undefined)
          .map((item) => ({
            id: item.fileId,
            fileName: item.fileName,
            size: item.size,
            contentType: item.contentType,
            url: `#/evidence/${item.fileId}`,
            caption: null,
            uploadedBy: { kind: "customer" as const, name: "Вы", orgId: order.orgId },
            uploadedAt: openedAt,
          }));

        const dispute: Dispute = {
          id: `dsp-${String(orderId)}`,
          orderId,
          status: "opened",
          reason: body.reason,
          reasonTitle: REASON_TITLES[body.reason] ?? "Претензия",
          affectedQty: body.affectedQty ?? null,
          totalQty: order.params.qty,
          description: body.description.trim(),
          remedy: body.remedy,
          remedyAmount,
          evidence,
          openedAt,
          openedBy: { kind: "customer", name: "Вы", orgId: order.orgId },
          factoryReplyDueAt: addWorkingDays(new Date(nowMs), 2).toISOString(),
          decisionDueAt: addWorkingDays(new Date(nowMs), 5).toISOString(),
          decision: null,
          escrowBlocked: true,
          escrowAmount: order.quote.total,
          messageCount: 1,
        };
        state.disputes[String(orderId)] = dispute;
        const from = order.status;
        order.status = "dispute";
        ctx.touch(order);
        state.idempotency[idempotencyKey] = { kind: "dispute", orderId };

        emit(orderId, {
          type: "status_changed",
          orderId,
          occurredAt: openedAt,
          actor: { kind: "customer", name: "Вы", orgId: order.orgId },
          title: "Открыт спор",
          detail: `${dispute.reasonTitle} · выплата фабрике заблокирована`,
          from,
          to: "dispute",
          stage: customerStageOf("dispute"),
        });
        emit(orderId, {
          type: "message",
          orderId,
          occurredAt: openedAt,
          actor: dispute.openedBy,
          title: "Претензия · Вы",
          detail: null,
          message: {
            id: `dmsg-${String(orderId)}-open`,
            seq: 0,
            orderId,
            channel: "dispute",
            author: dispute.openedBy,
            text: `Открыта претензия: ${dispute.reasonTitle.toLowerCase()}${
              body.affectedQty ? `, ${String(body.affectedQty)} шт` : ""
            }. ${dispute.description}`,
            attachments: [],
            createdAt: openedAt,
            readAt: null,
            own: true,
          },
        });
        // фабрика отвечает не мгновенно, но демо без ответа выглядит сломанным
        emit(orderId, {
          type: "message",
          orderId,
          occurredAt: new Date(nowMs + 60_000).toISOString(),
          actor: {
            kind: "factory",
            name: `Технолог «${order.offer.factoryName}»`,
            orgId: null,
          },
          title: "Ответ фабрики",
          detail: null,
          message: {
            id: `dmsg-${String(orderId)}-reply`,
            seq: 0,
            orderId,
            channel: "dispute",
            author: {
              kind: "factory",
              name: `Технолог «${order.offer.factoryName}»`,
              orgId: null,
            },
            text: "Получили претензию, поднимаем лекала и отчёт КК. Ответим в течение рабочего дня.",
            attachments: [],
            createdAt: new Date(nowMs + 60_000).toISOString(),
            readAt: null,
            own: false,
          },
        });
        dispute.messageCount = 2;
        save();
        return dispute;
      });
    },

    withdrawDispute(orderId: number): Promise<Dispute> {
      return respond(async () => {
        const order = await ctx.requireOwnOrder(orderId);
        const state = getState();
        const dispute = state.disputes[String(orderId)];
        if (!dispute) throw notFound(`Спор по заказу № ${String(orderId)}`);
        if (dispute.status === "resolved") {
          throw problem(
            409,
            "https://partiya.ru/problems/disputes/already-resolved",
            "Решение уже принято",
          );
        }
        dispute.status = "withdrawn";
        dispute.escrowBlocked = false;
        // заказ возвращается туда, откуда ушёл в спор: партия доставлена, окно приёмки идёт
        order.status = order.deliveredAt ? "acceptance" : "in_production";
        ctx.touch(order);
        emit(orderId, {
          type: "status_changed",
          orderId,
          occurredAt: new Date(now()).toISOString(),
          actor: { kind: "customer", name: "Вы", orgId: order.orgId },
          title: "Претензия отозвана",
          detail: "выплата фабрике разблокирована",
          from: "dispute",
          to: order.status,
          stage: customerStageOf(order.status),
        });
        save();
        return dispute;
      });
    },

    requestDisputeEvidenceUpload(
      orderId: number,
      body: MessageAttachmentUploadRequest,
    ): Promise<MessageAttachmentUploadResponse> {
      return respond(async () => {
        await ctx.requireOwnOrder(orderId);
        return upload(orderId, body, "evd");
      });
    },

    listNotifications(query: NotificationQuery = {}): Promise<NotificationList> {
      return respond(async () => {
        const { orgId } = await ctx.requireCustomerOrg();
        const all = notificationsOfOrg(orgId);
        const items = all.filter((item) => {
          if (query.unread === true && item.readAt !== null) return false;
          if (query.topic !== undefined && item.topic !== query.topic) return false;
          return true;
        });
        return {
          items,
          total: items.length,
          unread: all.filter((item) => item.readAt === null).length,
        };
      });
    },

    markNotificationsRead(body: MarkNotificationsReadBody): Promise<NotificationList> {
      return respond(async () => {
        const { orgId } = await ctx.requireCustomerOrg();
        const state = getState();
        if (body.all !== true && (body.ids?.length ?? 0) === 0) {
          throw problem(
            422,
            "https://partiya.ru/problems/notifications/nothing-to-read",
            "Нечего отмечать",
          );
        }
        const ids =
          body.all === true ? notificationsOfOrg(orgId).map((item) => item.id) : (body.ids ?? []);
        state.readNotifications = [...new Set([...state.readNotifications, ...ids])];
        save();
        for (const listener of userSubscribers) listener();
        const all = notificationsOfOrg(orgId);
        return {
          items: all,
          total: all.length,
          unread: all.filter((i) => i.readAt === null).length,
        };
      });
    },

    getNotificationSettings(): Promise<NotificationSettings> {
      return respond(async () => {
        await ctx.requireCustomerOrg();
        return getState().notificationSettings ?? DEFAULT_SETTINGS;
      });
    },

    updateNotificationSettings(
      body: UpdateNotificationSettingsBody,
    ): Promise<NotificationSettings> {
      return respond(async () => {
        await ctx.requireCustomerOrg();
        const state = getState();
        const current = state.notificationSettings ?? DEFAULT_SETTINGS;
        const preferences = current.preferences.map((preference) => {
          const patch = body.preferences.find((item) => item.topic === preference.topic);
          if (!patch) return preference;
          return { ...preference, channels: { ...preference.channels, ...patch.channels } };
        });
        const next: NotificationSettings = { ...current, preferences };
        state.notificationSettings = next;
        save();
        return next;
      });
    },

    getUserCounters(): Promise<UserCounters> {
      return respond(async () => {
        const { orgId } = await ctx.requireCustomerOrg();
        return countersOfOrg(orgId);
      });
    },

    streamUserEvents(options): () => void {
      const listener = () => {
        void (async () => {
          try {
            const { orgId } = await ctx.requireCustomerOrg();
            options.onCounters?.(countersOfOrg(orgId));
          } catch {
            /* вышли из аккаунта — счётчики больше не наши */
          }
        })();
      };
      userSubscribers.add(listener);
      options.onStateChange?.("open");
      return () => {
        userSubscribers.delete(listener);
        options.onStateChange?.("closed");
      };
    },

    getEscrowOverview(): Promise<EscrowOverview> {
      return respond(async () => {
        const { orgId } = await ctx.requireCustomerOrg();
        const state = getState();
        const own = state.orders.filter(
          (order) => order.orgId === orgId && order.status !== "draft",
        );
        for (const order of own) settleSecondTranche(order, now(), emit);
        const deals = own.map((order) => ({ order, deal: escrowDealOf(order) }));
        const held = deals.filter((item) => item.deal.heldAmount > 0);
        const first = own
          .filter((order) => order.status === "awaiting_payment")
          .map((order) => ({
            id: `inv-${String(order.id)}`,
            orderId: order.id,
            number: order.payment?.invoiceNumber ?? invoiceNumberOf(order.id),
            title: `${order.offer.title} · «${order.offer.factoryName}»`,
            amount: order.payment?.amountDue ?? order.quote.total,
            dueAt: order.payment?.dueAt ?? new Date(now()).toISOString(),
          }));
        // п. 4: второй транш 50/50 — счёт появляется, когда партия готова к отгрузке
        const second = own
          .filter(
            (order) =>
              isSplitPayment(order) &&
              order.secondTrancheDueAt != null &&
              order.secondTranchePaidAt == null &&
              order.secondTrancheCancelledAt == null &&
              order.status !== "cancelled" &&
              order.status !== "refunded",
          )
          .map((order) => ({
            id: `inv-${String(order.id)}-2`,
            orderId: order.id,
            number: invoiceNumberOf(order.id, 2),
            title: `Второй транш · перед отгрузкой · ${order.offer.title}`,
            amount: secondTrancheAmount(order.quote.total),
            dueAt: order.secondTrancheDueAt ?? new Date(now()).toISOString(),
          }));
        const invoices = [...first, ...second];
        const operations = operationsOfOrg(orgId);

        return {
          heldTotal: held.reduce((sum, item) => sum + item.deal.heldAmount, 0),
          heldOrders: held.length,
          awaitingTotal: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
          awaitingInvoices: invoices.length,
          paidOutTotal: deals.reduce((sum, item) => sum + item.deal.releasedAmount, 0),
          refundedTotal: deals.reduce((sum, item) => sum + item.deal.refundedAmount, 0),
          deals: held.map(({ order, deal }) => ({
            dealId: deal.id,
            orderId: order.id,
            orderTitle: `${order.offer.title}, ${String(order.params.qty)} шт`,
            factory: `${order.offer.factoryName}, ${order.offer.factoryCity}`,
            stageTitle: orderStatusTitle(order.status),
            status: deal.status,
            amount: deal.heldAmount,
            releaseNote:
              order.status === "awaiting_confirmation"
                ? "после подтверждения фабрики"
                : deal.autoReleaseAt !== null
                  ? "после приёмки"
                  : order.shipDate !== null
                    ? `после приёмки · ≈ ${order.shipDate}`
                    : null,
          })),
          operations,
          invoices,
        };
      });
    },

    getOrderEscrow(orderId: number): Promise<EscrowDeal> {
      return respond(async () => {
        const order = await ctx.requireOwnOrder(orderId);
        if (order.paidAt === null) {
          throw problem(
            404,
            "https://partiya.ru/problems/payments/deal-not-found",
            "Сделки ещё нет",
            "Деньги не поступили — эскроу-сделка не создана.",
          );
        }
        // Q-401: таймер срока второго транша — у мока лениво, при чтении
        settleSecondTranche(order, now(), emit);
        return escrowDealOf(order);
      });
    },

    demoAdvance(orderId: number, to?: OrderStatus): Promise<Order> {
      return respond(async () => {
        const order = await ctx.requireOwnOrder(orderId);
        const next = to ?? NEXT_STATUS[order.status];
        if (next === undefined) return ctx.publicOrder(order);

        const nowMs = now();
        const occurredAt = new Date(nowMs).toISOString();
        const from = order.status;
        const factory = {
          kind: "factory" as const,
          name: `Технолог «${order.offer.factoryName}»`,
          orgId: null,
        };
        const system = { kind: "system" as const, name: "Система", orgId: null };

        order.status = next;
        if (next === "awaiting_confirmation" && order.paidAt === null) {
          order.paidAt = occurredAt;
        }
        if (next === "acceptance") order.deliveredAt = occurredAt;
        if (next === "completed") order.acceptedAt = occurredAt;
        if (next === "materials") {
          // демо-пульт проходит согласование макета за обе стороны (п. 16)
          order.artworkSignoff = { customerApprovedAt: occurredAt, factoryApprovedAt: occurredAt };
        }
        // п. 4: «готов к отгрузке» — у 50/50 выставляется второй транш
        if (next === "quality_control") issueSecondTranche(order, occurredAt, emit);
        ctx.touch(order);

        const text = statusEventText(next);
        emit(orderId, {
          type: "status_changed",
          orderId,
          occurredAt,
          actor: next === "awaiting_confirmation" || next === "acceptance" ? system : factory,
          title: text.title,
          detail: text.detail ?? null,
          from,
          to: next,
          stage: customerStageOf(next),
        });

        if (next === "awaiting_confirmation") {
          emit(orderId, {
            type: "money",
            orderId,
            occurredAt,
            actor: system,
            title: "Оплата зарезервирована в эскроу",
            detail: "деньги уйдут фабрике после вашей приёмки",
            operation: "hold",
            amount: order.quote.total,
          });
        }
        if (next === "quality_control") {
          emit(orderId, {
            type: "photo_report",
            orderId,
            occurredAt,
            actor: factory,
            title: "Отчёт контроля качества",
            detail: "выборка 5 % по ГОСТ · 3 фото",
            photos: [
              {
                id: `ph-${String(orderId)}-qc1`,
                url: null,
                label: "выборка 1",
                tone: "c",
                takenAt: occurredAt,
              },
              {
                id: `ph-${String(orderId)}-qc2`,
                url: null,
                label: "выборка 2",
                tone: "a",
                takenAt: occurredAt,
              },
              {
                id: `ph-${String(orderId)}-qc3`,
                url: null,
                label: "упаковка",
                tone: "d",
                takenAt: occurredAt,
              },
            ],
            caption: "Контроль качества",
          });
        }
        if (next === "shipped") {
          const upd: OrderDocument = {
            id: `doc-upd-${String(orderId)}`,
            kind: "act",
            title: `УПД № ${String(orderId)}-У`,
            url: `#/documents/${String(orderId)}/upd.pdf`,
            signature: "edo_pending",
            createdAt: occurredAt,
          };
          if (!order.documents.some((doc) => doc.id === upd.id)) order.documents.push(upd);
          emit(orderId, {
            type: "document",
            orderId,
            occurredAt,
            actor: system,
            title: `${upd.title} ждёт вашей подписи`,
            detail: "без подписи фабрика не получит выплату",
            document: upd,
          });
        }
        save();
        return ctx.publicOrder(order);
      });
    },

    stopStreams(): void {
      orderSubscribers.clear();
      userSubscribers.clear();
      if (emulator !== undefined) {
        clearInterval(emulator);
        emulator = undefined;
      }
    },
  };

  /* ───────── общая presigned-загрузка для вложений и доказательств ───────── */

  function upload(
    orderId: number,
    body: MessageAttachmentUploadRequest,
    prefix: string,
  ): MessageAttachmentUploadResponse {
    if (!isAllowedArtworkType(body.contentType, body.fileName)) {
      throw problem(
        415,
        "https://partiya.ru/problems/messages/attachment-unsupported-type",
        "Такой файл не подойдёт",
        "Принимаем PDF, AI, EPS, PNG, TIFF или SVG",
      );
    }
    if (body.size > ARTWORK_LIMITS.maxSize) {
      throw problem(
        413,
        "https://partiya.ru/problems/messages/attachment-too-large",
        "Файл слишком большой",
        `Максимум ${String(Math.round(ARTWORK_LIMITS.maxSize / 1024 / 1024))} МБ на файл`,
      );
    }
    const fileId = `${prefix}-${String(orderId)}-${String(now())}-${String(
      Math.round(Math.random() * 1000),
    )}`;
    const expiresAtMs = now() + 15 * 60_000;
    getState().uploads.push({
      fileId,
      orderId,
      fileName: body.fileName,
      contentType: body.contentType,
      size: body.size,
      expiresAtMs,
    });
    save();
    return {
      fileId,
      uploadUrl: `mock://attachments/${fileId}`,
      method: "PUT",
      headers: { "Content-Type": body.contentType },
      expiresAt: new Date(expiresAtMs).toISOString(),
      limits: ARTWORK_LIMITS,
    };
  }
}

function formatQty(value: number): string {
  return value.toLocaleString("ru-RU").replace(/\s/g, " ");
}
