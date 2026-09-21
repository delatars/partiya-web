import type { Kopecks } from "./common";
import type { ArtworkLimits, ArtworkUploadRequest, ArtworkUploadResponse } from "./orders";
import type { OrderActor } from "./tracking";

/* Домен «Споры» — крейт `disputes` (ARCHITECTURE.md, 8.4):

     GET  /orders/{id}/dispute-options
     POST /orders/{id}/dispute            → открыть претензию
     GET  /orders/{id}/dispute
     POST /orders/{id}/dispute/withdraw
     POST /orders/{id}/dispute/evidence   → presigned-загрузка доказательств

   Спор — это не «жалоба в поддержку», а состояние сделки: пока он открыт, эскроу
   заблокирован, а решение оператора обязательно для обеих сторон по оферте. Отсюда:

   * открыть спор можно только из `in_production` и `acceptance` (диаграмма 5.2);
   * требование заказчика (`remedy`) — часть претензии, а не переписки: именно его
     исполняет платформа, и суммы по нему считает сервер;
   * доказательства — файлы в S3 через presigned-ссылку, как макет печати (8.2);
   * переписка по спору идёт в чат заказа веткой `dispute` (`messages.ts`), потому что
     оператор обязан видеть её рядом с журналом заказа.

   Q-02/Q-03: решение принимает оператор (`Actor::Operator`), команда автомата —
   `ResolveDispute { in_favor_of }`. */

/** Причина претензии. Список закрытый: по нему оператор группирует статистику и по нему
    же завод получает типовой регламент ответа. */
export type DisputeReason =
  /** Несоответствие размерной сетки. */
  | "size_mismatch"
  /** Брак изделий. */
  | "defects"
  /** Брак печати или нанесения. */
  | "print_defects"
  /** Недовложение: пришло меньше, чем в спецификации. */
  | "shortfall"
  /** Срыв срока отгрузки. */
  | "deadline"
  /** Другое — обязателен текст описания. */
  | "other";

/** Чего требует заказчик. Каждому варианту соответствует свой исход автомата:
    `rework` оставляет эскроу заблокированным, возвраты разворачивают hold. */
export type DisputeRemedyKind =
  /** Допечатка/переделка за счёт фабрики. */
  | "rework"
  /** Частичный возврат: доля партии, посчитанная сервером. */
  | "partial_refund"
  /** Полный возврат и возврат партии фабрике. */
  | "full_refund";

/** Вариант требования с посчитанной суммой — их присылает сервер, браузер ничего не
    умножает: сумма частичного возврата уходит в проводки ledger. */
export interface DisputeRemedyOption {
  kind: DisputeRemedyKind;
  /** «Допечатка 120 шт за счёт фабрики». */
  title: string;
  /** «Эскроу остаётся заблокированным до приёмки допечатки». */
  description?: string | null;
  /** Сумма возврата; у переделки `null`. */
  amount?: Kopecks | null;
  available: boolean;
  unavailableReason?: string | null;
}

/** Стадии спора — они же четыре сегмента `.pipe` на экране спора. */
export type DisputeStatus =
  /** Претензия открыта, ждём ответа фабрики. */
  | "opened"
  /** Фабрика ответила, ждём согласия заказчика или решения оператора. */
  | "factory_replied"
  /** Спор ушёл к оператору платформы. */
  | "operator_review"
  /** Решение принято и исполняется. */
  | "resolved"
  /** Претензия отозвана заказчиком. */
  | "withdrawn";

/** Итог спора. `rejected` — оператор не нашёл нарушения, деньги уходят фабрике целиком. */
export type DisputeResolution = "rework" | "partial_refund" | "full_refund" | "rejected";

export interface DisputeDecision {
  /** В чью пользу — `Party` из `crates/orders/src/domain/command.rs`. */
  inFavorOf: "customer" | "factory";
  resolution: DisputeResolution;
  /** Сумма возврата заказчику; у переделки и отказа `null`. */
  amount: Kopecks | null;
  /** Мотивировка оператора — она видна обеим сторонам. */
  comment: string;
  decidedAt: string;
  decidedBy: OrderActor;
}

export interface DisputeEvidence {
  /** Он же `fileId` из ответа на запрос загрузки. */
  id: string;
  fileName: string;
  size: number;
  contentType: string;
  /** Ссылка на файл; `null`, пока не долетел до хранилища. */
  url: string | null;
  /** Подпись под снимком: «замер L, 52 см». */
  caption?: string | null;
  /** Кто приложил: доказательства носят обе стороны. */
  uploadedBy: OrderActor;
  uploadedAt: string;
}

export interface Dispute {
  id: string;
  orderId: number;
  status: DisputeStatus;
  reason: DisputeReason;
  /** Название причины по-русски — его пишет сервер, справочник у него. */
  reasonTitle: string;
  /** Сколько изделий затронуто; `null` — претензия ко всей партии. */
  affectedQty: number | null;
  /** Всего изделий в партии — знаменатель строки «120 из 1 000». */
  totalQty: number;
  description: string;
  /** Чего требует заказчик. */
  remedy: DisputeRemedyKind;
  /** Сумма требования на момент открытия; `null` у переделки. */
  remedyAmount: Kopecks | null;
  evidence: DisputeEvidence[];
  openedAt: string;
  openedBy: OrderActor;
  /** До какого момента отвечает фабрика; `null` — срок прошёл. */
  factoryReplyDueAt: string | null;
  /** До какого момента решает оператор. */
  decisionDueAt: string | null;
  decision: DisputeDecision | null;
  /** Заблокирована ли выплата фабрике — она блокируется на всё время спора. */
  escrowBlocked: boolean;
  /** Сумма в эскроу на момент спора — карточка «Эскроу · 183 400 ₽». */
  escrowAmount: Kopecks;
  /** Сколько сообщений в ветке `dispute` — счётчик у вкладки переписки. */
  messageCount: number;
}

/** Краткая ссылка на спор в теле заказа: экран трекинга показывает бейдж и ведёт на спор,
    не запрашивая его целиком. */
export interface DisputeSummary {
  id: string;
  status: DisputeStatus;
  reasonTitle: string;
  openedAt: string;
  decisionDueAt: string | null;
  escrowBlocked: boolean;
}

/** `GET /orders/{id}/dispute-options` — из чего собирается форма претензии.
 *
 * Причины и варианты требований приходят с сервера, а не зашиты в браузер: суммы
 * частичного возврата считает он же, и релиз фронта ради нового варианта не нужен. */
export interface DisputeOptions {
  reasons: { value: DisputeReason; title: string }[];
  remedies: DisputeRemedyOption[];
  /** Всего изделий в партии — для поля «Затронуто изделий». */
  totalQty: number;
  /** Цена за штуку: по ней экран показывает сумму частичного возврата при вводе количества. */
  unitPrice: Kopecks;
  /** Ограничения загрузки доказательств. */
  evidence: ArtworkLimits;
  /** До какого момента можно открыть спор (конец окна приёмки); `null` — бессрочно. */
  openUntil: string | null;
}

/** `POST /orders/{id}/dispute`. Требует `Idempotency-Key`: запрос блокирует деньги. */
export interface OpenDisputeBody {
  reason: DisputeReason;
  /** Сколько изделий затронуто; не указано — вся партия. */
  affectedQty?: number | null;
  description: string;
  remedy: DisputeRemedyKind;
  /** `fileId` из `POST /orders/{id}/dispute/evidence`. */
  evidenceFileIds?: string[];
}

/** `POST /orders/{id}/dispute/evidence` — presigned-загрузка доказательства. */
export type DisputeEvidenceUploadRequest = ArtworkUploadRequest;
export type DisputeEvidenceUploadResponse = ArtworkUploadResponse;

/** Коды problem+json домена «Споры». */
export type DisputeProblemType =
  /** 409 · из этого статуса спор не открывают (только `in_production` и `acceptance`). */
  | "https://partiya.ru/problems/disputes/not-allowed"
  /** 409 · спор по заказу уже открыт. */
  | "https://partiya.ru/problems/disputes/already-open"
  /** 409 · окно приёмки закрыто, заказ завершён. */
  | "https://partiya.ru/problems/disputes/window-closed"
  /** 422 · форма заполнена не полностью; `errors` — по полям. */
  | "https://partiya.ru/problems/disputes/invalid"
  /** 409 · решение уже принято: отозвать претензию нельзя. */
  | "https://partiya.ru/problems/disputes/already-resolved";
