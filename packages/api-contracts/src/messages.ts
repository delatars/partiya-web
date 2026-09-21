import type { ArtworkLimits, ArtworkUploadRequest, ArtworkUploadResponse } from "./orders";
import type { OrderActor } from "./tracking";

/* Домен «Сообщения» — крейт `messaging` (ARCHITECTURE.md, 8.4):

     GET  /orders/{id}/messages?channel=&after=
     POST /orders/{id}/messages
     POST /orders/{id}/messages/read
     POST /orders/{id}/messages/attachments   → presigned-загрузка

   Чат привязан к заказу, а не к людям: переписка — это доказательство в споре, и она
   обязана жить ровно столько же, сколько заказ. Отсюда два следствия:

   * у сообщения есть `seq` из того же журнала, что и у событий, — чат и лента
     упорядочены одной шкалой и не спорят о порядке;
   * каналов два (`order` — технолог, `dispute` — переписка по претензии), но хранилище
     одно: оператор в споре должен видеть обе ветки.

   Вложения уходят в S3 presigned-ссылкой, как макет печати (8.2): через API файлы
   не ходят. */

/** Ветка переписки. `dispute` появляется вместе со спором и пишется в журнал заказа. */
export type OrderMessageChannel = "order" | "dispute";

export interface OrderMessageAttachment {
  /** Он же `fileId` из ответа на запрос загрузки. */
  id: string;
  fileName: string;
  /** Размер, байты. */
  size: number;
  contentType: string;
  /** Ссылка на скачивание; `null`, пока файл не долетел до хранилища. */
  url: string | null;
}

export interface OrderMessage {
  id: string;
  /** Номер в журнале заказа: тот же `seq`, что у событий ленты. */
  seq: number;
  orderId: number;
  channel: OrderMessageChannel;
  author: OrderActor;
  /** Текст; пустой допустим, если есть вложения. */
  text: string;
  attachments: OrderMessageAttachment[];
  createdAt: string;
  /** Когда сообщение прочитано другой стороной (для своих) или вами (для чужих);
      `null` — не прочитано. Признак «своё» считает сервер: он знает активную организацию. */
  readAt: string | null;
  /** Своё сообщение — рисуется справа (`.msg.me`). */
  own: boolean;
}

export interface OrderMessageList {
  /** По возрастанию `seq`: чат читается сверху вниз. */
  items: OrderMessage[];
  total: number;
  /** Непрочитанных в этой ветке. */
  unread: number;
}

export interface OrderMessageQuery {
  /** Пусто — только чат с технологом (`order`). */
  channel?: OrderMessageChannel;
  /** Отдать сообщения новее этого `seq` — дочитывание после обрыва SSE. */
  after?: number;
  /** По умолчанию 100. */
  limit?: number;
}

/** `POST /orders/{id}/messages`. Требует `Idempotency-Key`: повторная отправка после
    обрыва сети не должна класть в чат два одинаковых сообщения. */
export interface SendOrderMessageBody {
  text: string;
  /** `fileId` из `POST /orders/{id}/messages/attachments`. */
  attachmentIds?: string[];
  /** По умолчанию `order`. */
  channel?: OrderMessageChannel;
}

/** `POST /orders/{id}/messages/read` — отметить прочитанными всё до `upToSeq`.
    Курсором, а не списком id: иначе экран, открытый на сутки, прислал бы сотню id. */
export interface MarkMessagesReadBody {
  upToSeq: number;
  channel?: OrderMessageChannel;
}

/** `POST /orders/{id}/messages/attachments` — presigned-ссылка на вложение.
    Форма та же, что у макета печати: одна реализация хранилища на все загрузки. */
export type MessageAttachmentUploadRequest = ArtworkUploadRequest;
export type MessageAttachmentUploadResponse = ArtworkUploadResponse;

/** Ограничения вложений чата. Их присылает сервер в ответе на запрос загрузки. */
export type MessageAttachmentLimits = ArtworkLimits;

/** Коды problem+json домена «Сообщения». */
export type MessageProblemType =
  /** 422 · пустое сообщение без вложений. */
  | "https://partiya.ru/problems/messages/empty"
  /** 409 · заказ закрыт: в завершённый заказ писать нельзя. */
  | "https://partiya.ru/problems/messages/order-closed"
  /** 409 · ветка спора ещё не открыта. */
  | "https://partiya.ru/problems/messages/no-dispute"
  /** 413 · вложение больше лимита. */
  | "https://partiya.ru/problems/messages/attachment-too-large"
  /** 415 · неподдерживаемый тип вложения. */
  | "https://partiya.ru/problems/messages/attachment-unsupported-type";
