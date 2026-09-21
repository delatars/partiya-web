import type {
  MarkMessagesReadBody,
  MessageAttachmentUploadRequest,
  MessageAttachmentUploadResponse,
  OrderMessage,
  OrderMessageList,
  OrderMessageQuery,
  SendOrderMessageBody,
} from "@partiya/api-contracts";

/** Домен «Сообщения» — модуль-крейт `messaging` (ARCHITECTURE.md, 8.4).
 *
 * `Idempotency-Key` у отправки передаётся явным аргументом по той же причине, что и у
 * заказов: повтор после обрыва сети обязан вернуть первое сообщение, а не положить в
 * чат второе такое же. */
export interface MessagesApi {
  /** `GET /orders/{id}/messages?channel=&after=` → 200. */
  getOrderMessages(
    orderId: number,
    query?: OrderMessageQuery,
    signal?: AbortSignal,
  ): Promise<OrderMessageList>;

  /** `POST /orders/{id}/messages` → 201. Пустое сообщение без вложений — 422. */
  sendOrderMessage(
    orderId: number,
    body: SendOrderMessageBody,
    idempotencyKey: string,
  ): Promise<OrderMessage>;

  /** `POST /orders/{id}/messages/read` → 200 с обновлёнными счётчиками. */
  markOrderMessagesRead(orderId: number, body: MarkMessagesReadBody): Promise<OrderMessageList>;

  /** `POST /orders/{id}/messages/attachments` → 200 с presigned-ссылкой. */
  requestMessageAttachmentUpload(
    orderId: number,
    body: MessageAttachmentUploadRequest,
  ): Promise<MessageAttachmentUploadResponse>;
}
