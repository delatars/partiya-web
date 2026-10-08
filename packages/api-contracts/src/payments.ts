import type { Kopecks } from "./common";
import type { PaymentInstructions, PaymentMethod } from "./orders";

/* Домен «Деньги» — крейты `payments` и ledger (ARCHITECTURE.md, 5.4):

     GET /orders/{id}/escrow      → сделка по одному заказу
     GET /me/escrow               → раздел «Эскроу и счета»

   Три правила домена, из которых следует форма этих типов:

   1. Суммы — целые копейки, и считает их только сервер. В контракте нет ни процентов,
      ни формул: комиссия и выплата фабрике приходят готовыми числами, потому что они
      же уходят в проводки ledger и в выписку банка.
   2. Деньги лежат на номинальном счёте банка-партнёра, а не «у платформы». Поэтому у
      сделки есть состояние hold → release/refund, а не «баланс».
   3. Схема 50/50 — это две сделки-транша в одной `EscrowDeal`. Отсюда `tranches[]`
      даже у полной оплаты: у неё просто один транш, и экран не ветвится по способу.

   ⚠ Q-10/Q-185: банк-партнёр не выбран, реквизиты и сроки выплат в моках демонстрационные. */

/** Состояние эскроу-сделки заказа. */
export type EscrowDealStatus =
  /** Счёт выставлен, деньги не поступили. */
  | "awaiting_funds"
  /** Деньги заблокированы платформой. */
  | "held"
  /** Первый транш выплачен, второй ещё в эскроу (схема 50/50). */
  | "partially_released"
  /** Выплачено фабрике — сделка закрыта. */
  | "released"
  /** Возвращено заказчику. */
  | "refunded"
  /** Заблокировано спором: ни выплаты, ни возврата до решения оператора. */
  | "blocked";

export type EscrowTrancheStatus = "awaiting_funds" | "held" | "released" | "refunded";

/** Транш сделки. У `escrow_full` он один, у `escrow_split_50_50` — два. */
export interface EscrowTranche {
  id: string;
  /** Порядковый номер, с 1. */
  index: number;
  /** «Первый транш · при запуске», «Второй транш · после приёмки». */
  title: string;
  amount: Kopecks;
  status: EscrowTrancheStatus;
  /** До какого момента ждём денег; `null` — срок не задан. */
  dueAt: string | null;
  heldAt: string | null;
  releasedAt: string | null;
}

/** Сделка по одному заказу — карточка «Эскроу» на экранах трекинга, приёмки и спора. */
export interface EscrowDeal {
  id: string;
  orderId: number;
  status: EscrowDealStatus;
  method: PaymentMethod;
  /** Полная сумма заказа. */
  amount: Kopecks;
  /** Сколько заблокировано прямо сейчас. */
  heldAmount: Kopecks;
  releasedAmount: Kopecks;
  refundedAmount: Kopecks;
  /** Комиссия платформы — её удерживают при выплате. */
  platformFee: Kopecks;
  /** Сколько получит фабрика после приёмки. */
  factoryPayout: Kopecks;
  tranches: EscrowTranche[];
  /** Когда деньги уйдут фабрике без вашей приёмки (окно приёмки истекло); `null` —
      автовыплата не назначена. */
  autoReleaseAt: string | null;
  /** Спор, из-за которого выплата заблокирована. */
  blockedByDisputeId?: string | null;
  /** Второй транш 50/50: состояние, счёт и реквизиты (Q-384, Q-401). `null` — оплата
      одним платежом. */
  finalPayment?: FinalPayment | null;
}

/** Состояние второго транша 50/50 (Q-401, вариант «в»). */
export type FinalPaymentState =
  /** Ещё не выставлен: партия не дошла до контроля качества. */
  | "not_issued"
  /** Выставлен, ждём оплату. */
  | "awaiting"
  /** Первая просрочка — срок продлён системой на 48 ч (или оператором вручную). */
  | "extended"
  /** Просрочен повторно — заказ у оператора платформы. */
  | "operator"
  /** Оплачен — отгрузка разрешена. */
  | "paid"
  /** Снят: заказ отменён или оператор открыл спор от имени платформы. */
  | "cancelled";

/** Второй транш 50/50 — карточка эскроу заказчика (`EscrowDeal.finalPayment`) и кабинет
    завода (`SellerOrder.finalPayment`, без реквизитов). */
export interface FinalPayment {
  state: FinalPaymentState;
  /** Номер счёта строкой как есть («4813-2-СЧ»): при продлении не меняется (Q-420).
      `null` — счёт ещё не выставлен. */
  invoiceNumber: string | null;
  amount: Kopecks;
  /** Текущий срок оплаты (после продлений — новый). */
  dueAt: string | null;
  /** Сколько раз продлевали срок. */
  extensions: number;
  /** Когда счёт ушёл к оператору. */
  overdueSince: string | null;
  paidAt: string | null;
  /** Реквизиты и назначение платежа — только заказчику и пока счёт ждёт оплаты. */
  instructions: PaymentInstructions | null;
  /** Готовая строка состояния — её пишет сервер. */
  note: string;
}

/** Сводка для карточки заказа: «Эскроу · 183 400 ₽ · зарезервировано платформой».
    Приходит полем `Order.escrow`, чтобы экран трекинга не делал второй запрос. */
export interface EscrowSummary {
  dealId: string;
  status: EscrowDealStatus;
  amount: Kopecks;
  heldAmount: Kopecks;
  /** Готовая строка состояния: «зарезервировано платформой». */
  note: string;
  autoReleaseAt: string | null;
  method: PaymentMethod;
}

/** Вид операции в истории. Знак суммы задаёт он, а не число: `hold` для заказчика —
    это не расход, а резерв, и рисуется он иначе, чем выплата. */
export type EscrowOperationKind =
  /** Резерв в эскроу. */
  | "hold"
  /** Выплата фабрике после приёмки. */
  | "release"
  /** Возврат заказчику (полный или частичный). */
  | "refund"
  /** Счёт выставлен — денег ещё нет. */
  | "invoice"
  /** Комиссия платформы. */
  | "fee";

/** Строка истории операций раздела «Эскроу и счета» (`.ledger` макета). */
export interface EscrowOperation {
  id: string;
  /** Когда, RFC 3339. */
  at: string;
  kind: EscrowOperationKind;
  /** «Резерв в эскроу», «Выплата фабрике после приёмки». */
  title: string;
  /** «№ 4790 · шоперы». */
  subtitle?: string | null;
  orderId: number | null;
  /** Сумма, всегда неотрицательная: направление задаёт `kind`. */
  amount: Kopecks;
}

/** Активный резерв — строка таблицы «Активные резервы». */
export interface EscrowDealRow {
  dealId: string;
  orderId: number;
  /** «Футболки 180 г/м², 1 000 шт». */
  orderTitle: string;
  /** «Волна, Иваново». */
  factory: string;
  /** Русское название текущего этапа заказа: сервер уже знает статус. */
  stageTitle: string;
  status: EscrowDealStatus;
  amount: Kopecks;
  /** Когда резерв освободится: «после приёмки · ≈ 2 окт»; `null` — пока неизвестно. */
  releaseNote: string | null;
}

/** Счёт к оплате — блок «Счета к оплате» правой колонки. */
export interface InvoiceSummary {
  id: string;
  orderId: number;
  /** «4744-СЧ». */
  number: string;
  /** «Свечи, «Формат»». */
  title: string;
  amount: Kopecks;
  /** Дедлайн оплаты: после него резерв мощности снимается. */
  dueAt: string;
}

/** `GET /me/escrow` — весь раздел одним запросом: четыре KPI, две таблицы и счета.
 *
 * Одним, а не пятью: цифры KPI обязаны сходиться с таблицами, а пять независимых
 * запросов рано или поздно покажут сумму от одного момента и список от другого. */
export interface EscrowOverview {
  /** В эскроу сейчас. */
  heldTotal: Kopecks;
  /** По скольким заказам. */
  heldOrders: number;
  /** Ждут оплаты — выставленные счета. */
  awaitingTotal: Kopecks;
  awaitingInvoices: number;
  /** Выплачено фабрикам за текущий год. */
  paidOutTotal: Kopecks;
  /** Возвращено по спорам. */
  refundedTotal: Kopecks;
  deals: EscrowDealRow[];
  operations: EscrowOperation[];
  invoices: InvoiceSummary[];
}

/** Коды problem+json домена «Деньги». */
export type PaymentProblemType =
  /** 404 · сделки нет: заказ не оплачен. */
  | "https://partiya.ru/problems/payments/deal-not-found"
  /** 409 · выплата заблокирована спором. */
  | "https://partiya.ru/problems/payments/blocked-by-dispute"
  /** 503 · банк-партнёр недоступен, операция будет повторена. */
  | "https://partiya.ru/problems/payments/provider-unavailable";
