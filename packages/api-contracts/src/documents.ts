import type { Kopecks, PageInfo } from "./common";
import type { OrderDocument, OrderDocumentKind } from "./orders";

/* Домен «Документы и ЭДО» — крейт `documents` (ARCHITECTURE.md, 8.4):

     GET  /orders/{id}/documents
     GET  /documents?order=&kind=&state=&q=&from=&to=
     POST /documents/{id}/sign
     GET  /documents/export?from=&to=
     GET  /me/edo

   Документы формируются автоматически из заказа (`submit` рождает оферту, спецификацию
   и счёт; отгрузка — УПД; приёмка — акт), поэтому создавать их снаружи нельзя: в API
   нет ни одного POST, который заводит документ.

   Подпись идёт через оператора ЭДО, а не через платформу. Платформа знает только
   состояние: чьей подписи ждём и когда обе получены. */

/** Состояние документа — то, что стоит в колонке «Статус» раздела «Документы и ЭДО».
 *
 * Оплата и подпись здесь в одном перечислении намеренно: для человека это один вопрос
 * «что с этой бумагой», а `paid` и `signed` взаимно исключают друг друга (счёт не
 * подписывают, оферту не оплачивают). */
export type DocumentState =
  /** Формируется — PDF ещё не готов, `url` пуст. */
  | "generating"
  /** Ждёт вашей подписи. */
  | "awaiting_customer"
  /** Ждёт подписи фабрики. */
  | "awaiting_factory"
  /** Подписан обеими сторонами. */
  | "signed"
  /** Счёт выставлен, деньги не пришли. */
  | "awaiting_payment"
  /** Счёт оплачен. */
  | "paid"
  /** Отозван: заказ отменён или документ заменён новой версией. */
  | "cancelled";

/** Вид документа. Расширяет `OrderDocumentKind` документами, которые появляются после
    отгрузки: УПД заменяет пару «акт + счёт-фактура» и идёт через ЭДО. */
export type DocumentKind = OrderDocumentKind | "upd";

/** Документ со ссылкой на заказ — строка раздела «Документы и ЭДО».
 *
 * Расширяет `OrderDocument`, а не дублирует его: на экране заказа и в общем списке
 * это одна и та же бумага, и два несовпадающих представления одного документа —
 * прямой путь к расхождению статусов. */
export interface DocumentSummary extends Omit<OrderDocument, "kind"> {
  kind: DocumentKind;
  orderId: number;
  /** Номер без названия: «4812-С», «4790-У». По нему идёт поиск в строке фильтра. */
  number: string;
  state: DocumentState;
  /** Сумма документа — есть у счёта и УПД, у оферты `null`. */
  amount?: Kopecks | null;
  /** Когда документ подписан обеими сторонами; `null` — ещё нет. */
  signedAt?: string | null;
  /** Заголовок заказа для строки таблицы: «Футболки 180 г/м², 1 000 шт». */
  orderTitle?: string | null;
}

export interface DocumentList {
  items: DocumentSummary[];
  total: number;
  /** Сколько документов ждёт подписи заказчика — цифра в предупреждении и в сайдбаре. */
  awaitingSignature: number;
  page?: PageInfo;
}

export interface DocumentQuery {
  /** Только документы одного заказа. */
  orderId?: number;
  kind?: DocumentKind;
  state?: DocumentState;
  /** Номер заказа или документа строкой — поле «Номер заказа или документа». */
  q?: string;
  /** Период по дате создания, ISO `YYYY-MM-DD`. */
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

/** `POST /documents/{id}/sign` — отправить документ на подпись в ЭДО.
 *
 * Тела нет: подпись ставится в интерфейсе оператора ЭДО, платформа лишь инициирует
 * запрос и ждёт webhook. Ответ — тот же документ с новым состоянием. */
export interface SignDocumentResponse {
  document: DocumentSummary;
  /** Куда отправить человека, если оператор ЭДО требует подтверждения в своём окне. */
  redirectUrl?: string | null;
}

/** `GET /me/edo` — подключение организации к оператору ЭДО. */
export interface EdoConnection {
  connected: boolean;
  /** Название оператора: «Диадок», «СБИС». */
  operator: string | null;
  /** Идентификатор участника ЭДО: «2BM-7701234567-…». */
  participantId: string | null;
  connectedAt: string | null;
}

/** `GET /documents/export?from&to` — выгрузка пакета за период. */
export interface DocumentExportResponse {
  /** Ссылка на архив; `null` — готовится, придёт уведомлением. */
  url: string | null;
  /** Сколько документов попало в выгрузку. */
  count: number;
}

/** Коды problem+json домена «Документы». */
export type DocumentProblemType =
  /** 404 · документа нет или он от чужого заказа. */
  | "https://partiya.ru/problems/documents/not-found"
  /** 409 · документ ещё формируется — подписывать нечего. */
  | "https://partiya.ru/problems/documents/not-ready"
  /** 409 · документ уже подписан. */
  | "https://partiya.ru/problems/documents/already-signed"
  /** 409 · организация не подключена к ЭДО. */
  | "https://partiya.ru/problems/documents/edo-not-connected";
