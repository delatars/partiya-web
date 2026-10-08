import type {
  AdminStuckAction,
  AdminStuckActionBody,
  AdminStuckCard,
  AdminStuckCount,
  AdminStuckKind,
  AdminStuckPage,
  AdminStuckQuery,
  AdminStuckRow,
} from "@partiya/api-contracts";

import { ApiError } from "@/shared/api";

/* Мок экрана «Зависшие» (DECISIONS.md, п. 35; `crates/backoffice/src/stuck.rs`).

   Три очереди: мёртвые фоновые задания (`job`, статус `dead`), не разосланные доменные
   события (`outbox`) и не обработанные webhook-и (`inbox`) старше минуты (`pending`).
   Правила кнопок — как в `card_dto` бэка:
     job/dead → повторить и решить; job/resolved → только повторить (оператор передумал);
     outbox|inbox/pending → повторить и решить; остальное — ничего.

   Упрощение мока: у бэка «Повторить» лишь ставит строку в очередь, а результат приходит
   позже. Воркера в моках нет, поэтому повторённое событие/webhook сразу считается
   доставленным (`done`), а задание — взятым воркером (`pending`). Строка `stuck-busy`
   (её держит воркер) воспроизводится на одной фикстуре: `lockedBy` у неё заполнен. */

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
    problem: { type: `${P}/${type}`, title, status, detail, errors },
  });
}

export interface StuckItem {
  row: AdminStuckRow;
  payload: Record<string, unknown>;
  lockedBy: string | null;
  actions: AdminStuckAction[];
}

export interface StuckStore {
  items: StuckItem[];
}

const minutesAgo = (nowMs: number, minutes: number) =>
  new Date(nowMs - minutes * 60_000).toISOString();

function row(
  nowMs: number,
  input: Pick<AdminStuckRow, "kind" | "id" | "type" | "subject" | "status" | "attempts"> & {
    maxAttempts?: number | null;
    lastError: string | null;
    createdMinutesAgo: number;
  },
): AdminStuckRow {
  return {
    kind: input.kind,
    id: input.id,
    type: input.type,
    subject: input.subject,
    status: input.status,
    attempts: input.attempts,
    maxAttempts: input.maxAttempts ?? null,
    lastError: input.lastError,
    createdAt: minutesAgo(nowMs, input.createdMinutesAgo),
    nextAttemptAt: input.status === "dead" ? null : minutesAgo(nowMs, -1),
    resolvedAt: null,
  };
}

/** Фикстуры: по нескольку строк каждой очереди, одна — «занята воркером». */
export function seedStuck(nowMs: number): StuckStore {
  const items: StuckItem[] = [
    {
      row: row(nowMs, {
        kind: "job",
        id: "7c1f8a52-3d0b-4b8e-9a51-0b6f4f1c2a01",
        type: "order.confirm_deadline",
        subject: null,
        status: "dead",
        attempts: 20,
        maxAttempts: 20,
        lastError:
          "заказ № 4799: дедлайн подтверждения истёк, но отклонение не прошло — сделка в статусе partially_funded (payments/tranche-not-awaiting)",
        createdMinutesAgo: 190,
      }),
      payload: { orderId: 4799, deadlineAt: minutesAgo(nowMs, 200) },
      lockedBy: null,
      actions: [],
    },
    {
      row: row(nowMs, {
        kind: "job",
        id: "7c1f8a52-3d0b-4b8e-9a51-0b6f4f1c2a02",
        type: "backoffice.ranking_recompute",
        subject: null,
        status: "dead",
        attempts: 20,
        maxAttempts: 20,
        lastError: "canceling statement due to statement timeout",
        createdMinutesAgo: 75,
      }),
      payload: { reason: "hourly" },
      lockedBy: null,
      actions: [],
    },
    {
      row: row(nowMs, {
        kind: "outbox",
        id: "5b2e9d14-7f6a-4c3d-8e21-1a2b3c4d5e01",
        type: "order.status_changed",
        subject: "order:4771",
        status: "pending",
        attempts: 6,
        lastError: "подписчик notifications: connection reset by peer",
        createdMinutesAgo: 12,
      }),
      payload: { orderId: 4771, from: "shipped", to: "acceptance" },
      lockedBy: null,
      actions: [],
    },
    {
      row: row(nowMs, {
        kind: "outbox",
        id: "5b2e9d14-7f6a-4c3d-8e21-1a2b3c4d5e02",
        type: "payments.tranche_issued",
        subject: "deal:4911",
        status: "pending",
        attempts: 2,
        lastError: null,
        createdMinutesAgo: 3,
      }),
      payload: { dealNo: 4911, trancheNo: 2, amount: 9_170_000 },
      // строку прямо сейчас держит воркер — «Повторить» ответит 409 stuck-busy
      lockedBy: "worker-2",
      actions: [],
    },
    {
      row: row(nowMs, {
        kind: "inbox",
        id: "9e8d7c6b-5a49-4382-9170-6f5e4d3c2b01",
        type: "bank",
        subject: "bank-op-118204",
        status: "pending",
        attempts: 4,
        lastError: "сумма поступления 91 700,00 ₽ не совпала со счётом 4811-СЧ (183 400,00 ₽)",
        createdMinutesAgo: 41,
      }),
      payload: {
        operationId: "bank-op-118204",
        amount: 9_170_000,
        purpose: "Оплата по заказу № 4811, спецификация 4811-С. Без НДС",
        payerInn: "7707083893",
      },
      lockedBy: null,
      actions: [],
    },
  ];
  return { items };
}

/** Строка ещё «висит» — попадает в ленту и в счётчики. */
function isStuck(item: StuckItem): boolean {
  return item.row.kind === "job" ? item.row.status === "dead" : item.row.status === "pending";
}

function countsOf(store: StuckStore): AdminStuckCount {
  const stuck = store.items.filter(isStuck);
  const jobs = stuck.filter((item) => item.row.kind === "job").length;
  const outbox = stuck.filter((item) => item.row.kind === "outbox").length;
  const inbox = stuck.filter((item) => item.row.kind === "inbox").length;
  return { total: jobs + outbox + inbox, jobs, outbox, inbox };
}

function cardOf(item: StuckItem): AdminStuckCard {
  const { kind, status } = item.row;
  const [canRetry, canResolve] =
    kind === "job" && status === "dead"
      ? [true, true]
      : kind === "job" && status === "resolved"
        ? [true, false]
        : kind !== "job" && status === "pending"
          ? [true, true]
          : [false, false];
  return {
    row: item.row,
    payload: item.payload,
    lockedBy: item.lockedBy,
    canRetry,
    canResolve,
    actions: [...item.actions].reverse(),
  };
}

const KINDS: readonly AdminStuckKind[] = ["job", "outbox", "inbox"];

export interface StuckContext {
  now: () => number;
  store: () => StuckStore;
  save: () => void;
}

export interface MockStuckApi {
  listAdminStuck(query?: AdminStuckQuery): AdminStuckPage;
  getAdminStuckCount(): AdminStuckCount;
  getAdminStuckCard(kind: AdminStuckKind, id: string): AdminStuckCard;
  retryAdminStuck(kind: AdminStuckKind, id: string, body: AdminStuckActionBody): AdminStuckCard;
  resolveAdminStuck(kind: AdminStuckKind, id: string, body: AdminStuckActionBody): AdminStuckCard;
}

/** Синхронная логика; задержку и проверку роли оператора добавляет бэк-офис. */
export function createStuckApi(ctx: StuckContext): MockStuckApi {
  function find(kind: AdminStuckKind, id: string): StuckItem {
    if (!KINDS.includes(kind)) {
      throw problem(400, "bad-request", "Неизвестная очередь", `kind = «${String(kind)}»`);
    }
    const item = ctx.store().items.find((row) => row.row.kind === kind && row.row.id === id);
    if (!item) throw problem(404, "not-found", "Не найдено", "строка очереди не найдена");
    return item;
  }

  function act(item: StuckItem, action: AdminStuckAction["action"], comment: string | null): void {
    item.actions.push({
      at: new Date(ctx.now()).toISOString(),
      actorRef: "operator@partiya.ru",
      action,
      comment,
    });
  }

  return {
    listAdminStuck(query: AdminStuckQuery = {}): AdminStuckPage {
      const store = ctx.store();
      const limit = Math.min(100, Math.max(1, query.limit ?? 20));
      const all = store.items
        .filter(isStuck)
        .filter((item) => query.kind === undefined || item.row.kind === query.kind)
        .filter((item) => query.type === undefined || item.row.type === query.type)
        // новые сверху: так оператор видит свежую поломку первой
        .sort((a, b) => b.row.createdAt.localeCompare(a.row.createdAt));
      let start = 0;
      if (query.cursor !== undefined) {
        const parsed = Number(query.cursor);
        if (!Number.isInteger(parsed) || parsed < 0) {
          throw problem(400, "bad-request", "Некорректный курсор", "курсор не распознан");
        }
        start = parsed;
      }
      const page = all.slice(start, start + limit);
      const next = start + limit < all.length ? String(start + limit) : null;
      return {
        // в ленте ошибка урезана до 300 символов, в карточке — целиком
        items: page.map((item) => ({
          ...item.row,
          lastError: item.row.lastError === null ? null : item.row.lastError.slice(0, 300),
        })),
        nextCursor: next,
        counts: countsOf(store),
      };
    },

    getAdminStuckCount(): AdminStuckCount {
      return countsOf(ctx.store());
    },

    getAdminStuckCard(kind: AdminStuckKind, id: string): AdminStuckCard {
      return cardOf(find(kind, id));
    },

    retryAdminStuck(kind: AdminStuckKind, id: string, body: AdminStuckActionBody): AdminStuckCard {
      const item = find(kind, id);
      if (!cardOf(item).canRetry) {
        throw problem(
          409,
          "stuck-not-stuck",
          "Уже не зависла",
          "строка уже не зависла: её выполнили, разослали или решили раньше",
        );
      }
      if (item.lockedBy !== null) {
        // занятость воркера — разовая: следующая попытка пройдёт
        item.lockedBy = null;
        ctx.save();
        throw problem(
          409,
          "stuck-busy",
          "Строка занята",
          "строку прямо сейчас обрабатывает воркер — повторите через несколько секунд",
        );
      }
      const nowIso = new Date(ctx.now()).toISOString();
      if (item.row.kind === "job") {
        // Q-372: ровно одна попытка — max_attempts = attempts + 1
        item.row = {
          ...item.row,
          status: "pending",
          maxAttempts: item.row.attempts + 1,
          nextAttemptAt: nowIso,
          resolvedAt: null,
        };
      } else {
        item.row = {
          ...item.row,
          status: "done",
          attempts: item.row.attempts + 1,
          nextAttemptAt: null,
        };
      }
      act(item, "stuck.retry", body.comment?.trim() || null);
      ctx.save();
      return cardOf(item);
    },

    resolveAdminStuck(
      kind: AdminStuckKind,
      id: string,
      body: AdminStuckActionBody,
    ): AdminStuckCard {
      const comment = body.comment?.trim() ?? "";
      if (comment.length === 0) {
        throw problem(422, "comment-required", "Нужно обоснование", "обоснование обязательно", {
          comment: ["Напишите, почему строку можно считать решённой"],
        });
      }
      const item = find(kind, id);
      if (!cardOf(item).canResolve) {
        throw problem(
          409,
          "stuck-not-stuck",
          "Уже не зависла",
          "строка уже не зависла: её выполнили, разослали или решили раньше",
        );
      }
      const nowIso = new Date(ctx.now()).toISOString();
      item.row = { ...item.row, status: "resolved", resolvedAt: nowIso, nextAttemptAt: null };
      act(item, "stuck.resolve", comment);
      ctx.save();
      return cardOf(item);
    },
  };
}
