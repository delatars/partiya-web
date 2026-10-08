import type { Kopecks } from "./common";
import type {
  DisputeDecision,
  DisputeEvidence,
  DisputeResolution,
  DisputeStatus,
} from "./disputes";
import type { OrderMessage } from "./messages";
import type { CategoryAttributeDef, DealStatusName, TrancheStatusName } from "./seller";
import type { OrderEvent } from "./tracking";

/* Домен «Бэк-офис оператора» — ARCHITECTURE.md, раздел 9:

     GET  /admin/overview
     GET  /admin/factories?tab            POST /admin/factories/{orgId}/decision
                                          POST /admin/factories/{orgId}/audit-visit
     GET  /admin/offers?tab               POST /admin/offers/{id}/decision
     GET  /admin/disputes?tab             GET  /admin/disputes/{orderId}
                                          POST /admin/disputes/{orderId}/resolve
     GET  /admin/finance                  (сводка: сверка + очереди)
     GET  /admin/payments/tranches        POST /admin/payments/tranches/{id}/confirm-funds
     GET  /admin/payments/reconciliation  POST /admin/payments/deals/{id}/payout-confirmed
     GET/PUT /admin/taxonomy
     GET/PUT /admin/ranking
     GET  /admin/stuck?kind&type&cursor   GET  /admin/stuck/{kind}/{id}
     GET  /admin/stuck/count  (бейдж)     POST /admin/stuck/{kind}/{id}/retry
                                          POST /admin/stuck/{kind}/{id}/resolve

   Четыре эндпоинта `payments` бэк уже реализовал — их типы скопированы из openapi.json
   без изменений (см. `AdminTrancheRow`, `AdminTranchesPage`, `ConfirmFundsRequest`,
   `PayoutConfirmedRequest`, `LedgerReconciliation`).

   Правило раздела 9: любая ручная проводка требует комментария и уходит в аудит-лог.
   Отсюда обязательный `comment` во всех телах решений — его видят обе стороны. */

/* ─────────────────────────────── обзор ─────────────────────────────── */

/** Строка блока «Очереди»: что и сколько ждёт оператора. */
export interface AdminQueueRow {
  key: string;
  /** «Модерация предложений». */
  title: string;
  count: number;
  /** «старейшее — 5 ч». */
  note: string | null;
  /** Куда ведёт кнопка «Открыть». */
  href: string;
}

/** Бизнес-алерт: то, что горит прямо сейчас. */
export interface AdminAlert {
  id: string;
  kind: "info" | "warn" | "danger";
  title: string;
  text: string | null;
  /** Подпись кнопки действия; `null` — действия нет. */
  actionLabel: string | null;
  actionHref: string | null;
}

/** `GET /admin/overview`. Одним запросом: KPI обязаны сходиться с очередями. */
export interface AdminOverview {
  /** Сегодняшняя дата словами: «Сегодня, 20 сентября». */
  todayNote: string;
  /** GMV за месяц. */
  gmvMonth: Kopecks;
  gmvDeltaPct: number | null;
  escrowTotal: Kopecks;
  escrowOrders: number;
  feeMonth: Kopecks;
  ordersInWork: number;
  ordersOverdue: number;
  queues: AdminQueueRow[];
  alerts: AdminAlert[];
  /** Сделки по этапам — воронка «Ожидают оплаты … Спор». */
  stages: { key: string; title: string; count: number; pct: number }[];
}

/* ─────────────────────────────── заводы и аудит ─────────────────────────────── */

/** Этап подключения завода. */
export type AdminFactoryStage =
  /** Заявка подана, документы не проверены. */
  | "application"
  /** Документы приняты, нужен выезд аудитора. */
  | "documents_ok"
  /** Выезд назначен. */
  | "visit_scheduled"
  /** Аудит пройден. */
  | "passed"
  /** Работает без аудита. */
  | "no_audit"
  /** Заявка отклонена. */
  | "rejected"
  /** Завод приостановлен оператором. */
  | "suspended";

export interface AdminFactoryRow {
  orgId: string;
  name: string;
  city: string;
  inn: string;
  stage: AdminFactoryStage;
  /** «ждёт проверки документов», «назначить выезд аудитора». */
  nextStep: string | null;
  /** Дата заявки, ISO `YYYY-MM-DD`; `null` — завод давно работает. */
  appliedAt: string | null;
  /** Аудит действует до, ISO `YYYY-MM-DD`. */
  auditValidUntil: string | null;
  /** Заявка горит — строка подсвечена. */
  urgent: boolean;
}

/** Пункт чек-листа аудита в бэк-офисе. */
export interface AdminAuditCheck {
  key: string;
  title: string;
  state: "done" | "now" | "todo";
}

/** Карточка завода в правой колонке очереди. */
export interface AdminFactoryCard {
  orgId: string;
  name: string;
  city: string;
  inn: string;
  stage: AdminFactoryStage;
  appliedAt: string | null;
  checks: AdminAuditCheck[];
  /** Доступные аудиторы — выпадающий список. */
  auditors: string[];
  auditorName: string | null;
  visitAt: string | null;
  /** Сколько заказов завод не подтвердил подряд — основание для понижения. */
  declinedInRow: number;
}

export interface AdminFactoryList {
  items: AdminFactoryRow[];
  total: number;
  counts: { queue: number; active: number; suspended: number; auditExpiring: number };
  /** Карточка первого горящего завода — правая колонка открывается сразу. */
  selected: AdminFactoryCard | null;
}

export interface AdminFactoryListQuery {
  tab?: "queue" | "active" | "suspended" | "audit_expiring";
  /** Организация завода, чью карточку раскрыть справа; пусто — сервер выбирает первый
      горящий. Выбор делает клик по строке и живёт в search-параметре URL. */
  selected?: string;
}

/** `POST /admin/factories/{orgId}/decision` — принять заявку или отклонить. */
export interface AdminFactoryDecisionBody {
  decision: "approve" | "reject" | "suspend" | "resume";
  /** Обоснование — уходит заводу и в аудит-лог. Обязательно у отказа и приостановки. */
  comment: string;
}

/** `POST /admin/factories/{orgId}/audit-visit` — назначить выезд. */
export interface ScheduleAuditVisitBody {
  auditorName: string;
  /** Дата выезда, ISO `YYYY-MM-DD`. */
  visitAt: string;
}

/* ─────────────────────────────── модерация предложений ─────────────────────────────── */

/** Что проверяем: новое предложение или правку опубликованной версии. */
export type AdminOfferKind = "new" | "update";

export interface AdminOfferRow {
  offerId: number;
  title: string;
  factoryName: string;
  factoryOrgId: string;
  kind: AdminOfferKind;
  /** «Правка v3 → v4» — готовая подпись. */
  kindNote: string;
  /** Автофлаги: «фото с чужим логотипом», «цена −48 % от медианы». */
  flags: string[];
  /** Сколько времени в очереди: «5 ч». */
  waiting: string;
  queuedAt: string;
  urgent: boolean;
}

/** Карточка модерации: что изменилось и что показать оператору. */
export interface AdminOfferCard {
  offerId: number;
  title: string;
  factoryName: string;
  factoryCity: string;
  kind: AdminOfferKind;
  fromVersion: number | null;
  toVersion: number;
  /** Строки диффа: поле, было, стало, флаг. */
  changes: {
    field: string;
    label: string;
    before: string | null;
    after: string | null;
    flag?: string | null;
  }[];
  /** Фотографии версии — среди них помечены флагами. */
  images: { id: string; label: string; tone: "a" | "b" | "c" | "d"; flag?: string | null }[];
  /** Заготовка комментария заводу — её формирует правило автофлага. */
  suggestedComment: string | null;
}

export interface AdminOfferList {
  items: AdminOfferRow[];
  total: number;
  counts: { queue: number; complaints: number; autoflags: number };
  /** SLA очереди: «1 рабочий день». */
  slaNote: string;
  selected: AdminOfferCard | null;
}

export interface AdminOfferListQuery {
  tab?: "queue" | "complaints" | "autoflags";
  /** Номер заявки, чью карточку раскрыть справа; пусто — первая в очереди. */
  selected?: number;
}

/** `POST /admin/offers/{id}/decision` — опубликовать или вернуть на доработку. */
export interface AdminOfferDecisionBody {
  decision: "approve" | "reject";
  /** Комментарий заводу. Обязателен у отказа. */
  comment: string;
}

/* ─────────────────────────────── споры ─────────────────────────────── */

export interface AdminDisputeRow {
  disputeId: string;
  orderId: number;
  status: DisputeStatus;
  /** «ООО «Кора» ↔ ООО «Волна»». */
  parties: string;
  reasonTitle: string;
  openedAt: string;
  decisionDueAt: string | null;
  escrowAmount: Kopecks;
  /** Решение сегодня — строка горит. */
  urgent: boolean;
}

/** Позиция стороны — две колонки блока «Позиции сторон». */
export interface AdminDisputeParty {
  side: "customer" | "factory";
  /** «Заказчик», «Фабрика». */
  title: string;
  /** Изложение позиции. */
  text: string;
  evidence: DisputeEvidence[];
  /** Бейдж: «Претензия признана». */
  badge: string | null;
}

/** Строка доказательной базы: документ, что в нём и вывод оператора. */
export interface AdminDisputeEvidenceRow {
  key: string;
  /** «Спецификация 4812-С», «Чат». */
  title: string;
  /** «L: ширина 56 см ±1». */
  fact: string;
  /** «подтверждает заказчика», «замеры не приложены». */
  verdict: string | null;
  /** Куда ведёт кнопка «Открыть»: документ, журнал, чат. */
  href: string | null;
}

/** Вариант решения с посчитанным распределением эскроу. Суммы считает сервер. */
export interface AdminDisputeResolutionOption {
  resolution: DisputeResolution;
  title: string;
  description: string | null;
  /** Сколько вернётся заказчику. */
  customerAmount: Kopecks;
  /** Сколько получит завод. */
  factoryAmount: Kopecks;
  /** Комиссия платформы при таком исходе (Q-194: берётся только с доли завода). */
  fee: Kopecks;
  available: boolean;
  unavailableReason?: string | null;
}

/** `GET /admin/disputes/{orderId}` — карточка спора. */
export interface AdminDisputeCard {
  disputeId: string;
  orderId: number;
  status: DisputeStatus;
  orderTitle: string;
  customerName: string;
  factoryName: string;
  reasonTitle: string;
  affectedQty: number | null;
  totalQty: number;
  openedAt: string;
  decisionDueAt: string | null;
  escrowAmount: Kopecks;
  parties: AdminDisputeParty[];
  evidence: AdminDisputeEvidenceRow[];
  /** Переписка обеих сторон — ветка `dispute` чата заказа. */
  messages: OrderMessage[];
  /** Журнал заказа: оператор обязан видеть его рядом со спором. */
  events: OrderEvent[];
  options: AdminDisputeResolutionOption[];
  /** Принятое решение; `null` — спор ещё открыт. */
  decision: DisputeDecision | null;
}

export interface AdminDisputeList {
  items: AdminDisputeRow[];
  total: number;
  counts: { open: number; dueToday: number; resolved: number };
  selected: AdminDisputeCard | null;
}

export interface AdminDisputeListQuery {
  tab?: "open" | "resolved";
}

/** `POST /admin/disputes/{orderId}/resolve` — вынести решение.
 *
 * Требует `Idempotency-Key`: решение двигает деньги в эскроу. Сумму возврата сервер
 * пересчитывает сам и сверяет с присланной — расхождение даёт 422. */
export interface ResolveDisputeBody {
  resolution: DisputeResolution;
  inFavorOf: "customer" | "factory";
  /** Сумма возврата заказчику; `null` у переделки и отказа. */
  amount: Kopecks | null;
  /** Обоснование — видят обе стороны и аудит-лог. Обязательно. */
  comment: string;
}

/* ─────────────────────────────── финансы и сверка ─────────────────────────────── */

/* Ниже — типы уже реализованных бэком эндпоинтов `admin-payments`.
   Скопированы из openapi.json один в один. */

/** Строка очереди счетов (`AdminTrancheRow` openapi). */
export interface AdminTrancheRow {
  trancheId: string;
  trancheNo: number;
  dealId: string;
  dealNo: number;
  payerOrgId: string;
  payeeOrgId: string;
  amount: Kopecks;
  /** Назначение платежа — по нему сопоставляется поступление. */
  reference: string;
  dueAt: string;
  status: TrancheStatusName;
  overdue: boolean;
  /* ── расширения фронта: необязательные, бэк их пока не присылает ── */
  /** Публичный номер заказа — по нему строка ведёт в заказ (Q-B2). */
  orderId?: number;
  /** «ООО «Кора»» — название плательщика. */
  payerName?: string;
  /** «Футболки 1 000 шт». */
  subjectTitle?: string;
}

/** `GET /admin/payments/tranches` (`AdminTranchesPage` openapi). */
export interface AdminTranchesPage {
  items: AdminTrancheRow[];
  nextCursor: string | null;
}

export interface AdminTranchesQuery {
  status?: TrancheStatusName;
  cursor?: string;
  limit?: number;
}

/** `POST /admin/payments/tranches/{id}/confirm-funds` (`ConfirmFundsRequest` openapi). */
export interface ConfirmFundsRequest {
  /** Сколько поступило, копейки. Без поля — ровно сумма счёта; другая сумма — 422. */
  amount?: Kopecks | null;
  /** Номер платёжного поручения из выписки. */
  externalRef?: string | null;
}

/** `POST /admin/payments/deals/{id}/payout-confirmed` (`PayoutConfirmedRequest` openapi). */
export interface PayoutConfirmedRequest {
  externalRef?: string | null;
}

/** Вид счёта ledger (`AccountKindName` openapi). */
export type LedgerAccountKind =
  | "customer_funds"
  | "escrow_hold"
  | "factory_payable"
  | "platform_fee"
  | "refund_payable"
  | "payout_settled";

/** Остаток по виду счетов (`LedgerKindBalance` openapi). */
export interface LedgerKindBalance {
  kind: LedgerAccountKind;
  title: string;
  balance: Kopecks;
}

/** Остаток одного счёта (`LedgerAccountBalance` openapi). */
export interface LedgerAccountBalance {
  code: string;
  kind: LedgerAccountKind;
  orgId: string | null;
  balance: Kopecks;
}

/** `GET /admin/payments/reconciliation` (`LedgerReconciliation` openapi). */
export interface LedgerReconciliation {
  byKind: LedgerKindBalance[];
  accounts: LedgerAccountBalance[];
  /** Сумма всех проводок; обязана быть нулём — контроль двойной записи. */
  journalTotal: Kopecks;
  /** Записей, не сходящихся к нулю; обязано быть нулём. */
  unbalancedEntries: number;
  escrowHeld: Kopecks;
  /** Сколько обязано лежать на номинальном счёте по данным ledger. */
  nominalExpected: Kopecks;
  consistent: boolean;
}

/** Строка очереди выплат: заводу готово к переводу. */
export interface AdminPayoutRow {
  dealId: string;
  dealNo: number;
  orderId: number | null;
  factoryName: string;
  /** «3 заказа», «№ 4771». */
  subtitle: string;
  amount: Kopecks;
  status: DealStatusName;
  /** Готово к выплате; `false` — есть блокер. */
  ready: boolean;
  /** Почему не готово: «УПД не подписан заказчиком». */
  blocker: string | null;
}

/** `GET /admin/finance` — весь экран «Финансы и сверка» одним запросом. */
export interface AdminFinanceOverview {
  reconciliation: LedgerReconciliation;
  /** Остаток номинального счёта по выписке банка; `null` — выписка не загружена (Q-10). */
  nominalActual: Kopecks | null;
  /** Расхождение ledger ↔ выписка. */
  discrepancy: Kopecks;
  /** Когда была последняя сверка. */
  lastCheckedAt: string | null;
  /** Ожидающие оплаты счета — «Несопоставленные поступления» со стороны площадки. */
  tranches: AdminTrancheRow[];
  payouts: AdminPayoutRow[];
  /** К выплате сегодня и скольким заводам. */
  payoutTodayTotal: Kopecks;
  payoutTodayFactories: number;
}

/* ─────────────────────────────── таксономия ─────────────────────────────── */

/** Узел дерева категорий. */
export interface TaxonomyNode {
  /** Слаг: «futbolki». */
  slug: string;
  /** Полный путь от корня. */
  path: string[];
  title: string;
  /** Сколько предложений в категории. */
  offersCount: number;
  children: TaxonomyNode[];
}

/** Категория с её схемой атрибутов. */
export interface TaxonomyCategory {
  path: string[];
  title: string;
  /** Коэффициент мощности по умолчанию для изделий категории. */
  defaultCapacityUnitsPerItem: number;
  /** Единица измерения партии: «шт». */
  unit: string;
  attributes: CategoryAttributeDef[];
}

/** `GET /admin/taxonomy`. */
export interface AdminTaxonomy {
  tree: TaxonomyNode[];
  /** Выбранная категория со схемой; `null` — ничего не выбрано. */
  selected: TaxonomyCategory | null;
}

/** `PUT /admin/taxonomy/categories/{path}` — правка схемы категории. */
export interface UpdateTaxonomyCategoryBody {
  title?: string;
  defaultCapacityUnitsPerItem?: number;
  unit?: string;
  attributes?: CategoryAttributeDef[];
}

/* ─────────────────────────────── ранжирование ─────────────────────────────── */

/** Вес фактора в формуле «Популярные». Сумма весов обязана быть 100. */
export interface RankingWeight {
  key: string;
  /** «Заказы за 90 дней». */
  title: string;
  weight: number;
}

/** Штраф: за что и насколько. */
export interface RankingPenalty {
  key: string;
  title: string;
  /** «−8 на 30 дней», «скрыть из выдачи». */
  effect: string;
}

/** Правило бейджа. */
export interface RankingBadge {
  key: string;
  /** «Хит», «−15 % мощность», «аудит». */
  title: string;
  tone: "hot" | "disc" | "ok";
  rule: string;
}

export interface PromoCode {
  code: string;
  /** Скидка, %. */
  percent: number;
  /** «первый заказ, до 15 000 ₽, за счёт платформы». */
  condition: string;
  used: number;
  /** До какой даты действует, ISO `YYYY-MM-DD`; `null` — бессрочно. */
  validUntil: string | null;
  enabled: boolean;
}

/** `GET /admin/ranking`. */
export interface AdminRanking {
  weights: RankingWeight[];
  penalties: RankingPenalty[];
  badges: RankingBadge[];
  promos: PromoCode[];
  /** Когда веса применялись в последний раз. */
  appliedAt: string | null;
}

/** `PUT /admin/ranking` — применить веса. Сумма ≠ 100 даёт 422.
    Набор полный: каждый `key` из `AdminRanking.weights` ровно один раз, вес 0..100
    (иначе 422 `admin/weights-invalid`). Изменение пишется в аудит-лог (до/после). */
export interface UpdateRankingBody {
  weights: { key: string; weight: number }[];
}

/** `POST /admin/ranking/preview` — предпросмотр выдачи с новыми весами. */
export interface RankingPreviewBody {
  weights: { key: string; weight: number }[];
  /** Категория, по которой считать предпросмотр. */
  category?: string;
}

export interface RankingPreviewRow {
  offerId: number;
  title: string;
  factoryName: string;
  /** Позиция сейчас и с новыми весами. */
  positionNow: number;
  positionNext: number;
  score: number;
}

export interface RankingPreview {
  rows: RankingPreviewRow[];
  /** Сколько позиций поменялось местами. */
  moved: number;
}

/* ─────────────────────────────── зависшие ───────────────────────────────

   Экран «Зависшие» (DECISIONS.md, п. 35): мёртвые фоновые задания и события, не
   разосланные/не обработанные дольше минуты. Пушей нет — только бейдж в меню
   (`GET /admin/stuck/count`) и сам экран. Типы — из openapi.json один в один. */

/** Очередь: фоновое задание, доменное событие, входящий webhook. */
export type AdminStuckKind = "job" | "outbox" | "inbox";

/** Состояние строки. В ленте: `dead` у заданий, `pending` у событий и webhook-ов. */
export type AdminStuckStatus = "dead" | "pending" | "running" | "done" | "resolved";

/** Строка ленты (`AdminStuckRow` openapi). */
export interface AdminStuckRow {
  kind: AdminStuckKind;
  id: string;
  /** Тип задания (`order.confirm_deadline`), события (`order.status_changed`) или отправитель webhook-а (`bank`). */
  type: string;
  /** Агрегат события (`order:<uuid>`) или id webhook-а у отправителя; у задания — `null`. */
  subject: string | null;
  status: AdminStuckStatus;
  attempts: number;
  /** Лимит попыток задания; у событий и webhook-ов — `null`. */
  maxAttempts: number | null;
  /** В ленте — первые 300 символов, в карточке — целиком. */
  lastError: string | null;
  createdAt: string;
  /** Когда воркер возьмёт строку снова; `null` — не возьмёт. */
  nextAttemptAt: string | null;
  resolvedAt: string | null;
}

/** `GET /admin/stuck/count` — бейдж в меню и вкладки экрана (`AdminStuckCount` openapi). */
export interface AdminStuckCount {
  total: number;
  jobs: number;
  outbox: number;
  inbox: number;
}

/** `GET /admin/stuck` (`AdminStuckPage` openapi). */
export interface AdminStuckPage {
  items: AdminStuckRow[];
  nextCursor: string | null;
  /** Счётчики по очередям без учёта фильтров. */
  counts: AdminStuckCount;
}

export interface AdminStuckQuery {
  kind?: AdminStuckKind;
  /** Точный тип, как в `AdminStuckRow.type`. */
  type?: string;
  cursor?: string;
  /** 1..100, по умолчанию 20. */
  limit?: number;
}

/** Действие оператора над строкой — из аудит-лога (`AdminStuckAction` openapi). */
export interface AdminStuckAction {
  at: string;
  actorRef: string;
  action: "stuck.retry" | "stuck.resolve";
  comment: string | null;
}

/** `GET /admin/stuck/{kind}/{id}` — карточка (`AdminStuckCard` openapi). */
export interface AdminStuckCard {
  row: AdminStuckRow;
  /** Payload как лежит в очереди (подпись webhook-а не отдаётся). */
  payload: Record<string, unknown>;
  lockedBy: string | null;
  canRetry: boolean;
  canResolve: boolean;
  /** Новые сверху. */
  actions: AdminStuckAction[];
}

/** Тело `POST /admin/stuck/{kind}/{id}/retry` и `/resolve` (`AdminStuckActionBody` openapi).
 *  Для `resolve` комментарий обязателен (422 `admin/comment-required`). Ответ обоих — `AdminStuckCard`. */
export interface AdminStuckActionBody {
  comment?: string | null;
}

/* ─────────────── «Просроченные транши» (Q-401, вариант «в») ───────────────
   Второй транш 50/50 не оплачен и после автопродления на 48 ч: заказ стоит на контроле
   качества. Оператор продлевает срок или открывает спор от имени платформы.

     GET  /admin/overdue-tranches                     → AdminOverdueTranchePage
     GET  /admin/overdue-tranches/count               → AdminOverdueTrancheCount (бейдж)
     POST /admin/overdue-tranches/{orderNo}/extend    → AdminOverdueActionResult
     POST /admin/overdue-tranches/{orderNo}/dispute   → AdminOverdueActionResult */

/** Как продлили срок счёта: `auto` — система на первой просрочке, `manual` — оператор. */
export type AdminTrancheExtensionKind = "auto" | "manual";

/** Строка истории сроков счёта (`AdminTrancheExtension` openapi). */
export interface AdminTrancheExtension {
  kind: AdminTrancheExtensionKind;
  previousDueAt: string;
  dueAt: string;
  /** Обоснование оператора; у автопродления — `null`. */
  comment: string | null;
  at: string;
}

/** Строка очереди (`AdminOverdueTranche` openapi). */
export interface AdminOverdueTranche {
  /** Публичный номер заказа — им же ходят действия. */
  orderNo: number;
  orderTitle: string;
  customerName: string;
  factoryName: string;
  /** Номер второго счёта строкой как есть. */
  invoiceNumber: string;
  /** Сумма второго транша. */
  amount: Kopecks;
  /** Сколько уже в эскроу (первый транш) — это и делит спор. */
  heldAmount: Kopecks;
  /** Последний (просроченный) срок оплаты. */
  dueAt: string;
  /** Когда счёт ушёл к оператору. */
  overdueSince: string;
  extensions: number;
  history: AdminTrancheExtension[];
}

/** `GET /admin/overdue-tranches` (`AdminOverdueTranchePage` openapi). */
export interface AdminOverdueTranchePage {
  items: AdminOverdueTranche[];
  count: number;
}

/** `GET /admin/overdue-tranches/count` — бейдж меню. */
export interface AdminOverdueTrancheCount {
  count: number;
}

/** Тело «Продлить»: часы 1–336, комментарий обязателен (422 `payments/extension-invalid`). */
export interface AdminOverdueExtendBody {
  hours: number;
  comment: string;
}

/** Тело «Открыть спор»: комментарий обязателен (422 `admin/comment-required`). */
export interface AdminOverdueDisputeBody {
  comment: string;
}

export type AdminOverdueOutcome = "extended" | "dispute_opened";

/** Ответ на «Продлить» и «Открыть спор». Счёт успели оплатить — 409
    `payments/tranche-already-paid`. */
export interface AdminOverdueActionResult {
  orderNo: number;
  outcome: AdminOverdueOutcome;
  /** Новый срок (у продления). */
  dueAt: string | null;
  /** Открытый спор (у спора) — карточка в «Спорах». */
  disputeId: string | null;
}

/* ─────────────────────────────── ошибки ─────────────────────────────── */

/** Коды problem+json бэк-офиса. */
export type BackofficeProblemType =
  /** 403 · вошедший не оператор платформы (Q-110). */
  | "https://partiya.ru/problems/admin/not-an-operator"
  /** 404 · очередь пуста или объект уже обработан другим оператором. */
  | "https://partiya.ru/problems/admin/not-found"
  /** 409 · решение по спору уже вынесено. */
  | "https://partiya.ru/problems/admin/already-decided"
  /** 422 · обоснование обязательно. */
  | "https://partiya.ru/problems/admin/comment-required"
  /** 422 · распределение эскроу не сходится с суммой сделки. */
  | "https://partiya.ru/problems/admin/amount-mismatch"
  /** 422 · сумма весов ранжирования не равна 100. */
  | "https://partiya.ru/problems/admin/weights-sum"
  /** 409 · строка очереди уже не зависла (выполнена, разослана или решена раньше). */
  | "https://partiya.ru/problems/admin/stuck-not-stuck"
  /** 409 · строку прямо сейчас держит воркер — повторить через несколько секунд. */
  | "https://partiya.ru/problems/admin/stuck-busy"
  /** 422 · набор весов неполный или неверный: неизвестный, повторный или пропущенный
      фактор, вес вне 0..100. Поля — `errors["weights.<key>"]`. */
  | "https://partiya.ru/problems/admin/weights-invalid"
  /** 409 · счёт уже не ждёт оплаты. */
  | "https://partiya.ru/problems/payments/tranche-not-awaiting"
  /** 409 · просроченный второй транш успели оплатить — заказ продолжает путь (Q-401). */
  | "https://partiya.ru/problems/payments/tranche-already-paid"
  /** 409 · счёт уже снят или не в очереди оператора (Q-401). */
  | "https://partiya.ru/problems/payments/tranche-cancelled"
  | "https://partiya.ru/problems/payments/tranche-not-overdue"
  /** 422 · продление: часы вне 1–336 или нет комментария (Q-401). */
  | "https://partiya.ru/problems/payments/extension-invalid"
  /** 422 · сумма поступления не совпала с суммой счёта (Q-192). */
  | "https://partiya.ru/problems/payments/amount_mismatch";
