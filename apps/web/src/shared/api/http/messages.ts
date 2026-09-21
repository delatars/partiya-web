import type {
  MarkMessagesReadBody,
  MessageAttachmentUploadRequest,
  MessageAttachmentUploadResponse,
  OrderMessage,
  OrderMessageList,
  OrderMessageQuery,
  SendOrderMessageBody,
} from "@partiya/api-contracts";

import type { MessagesApi } from "../domains/messages";
import type { HttpClient } from "../http-client";

/* Реальный бэк: крейт `messaging`, маршруты под /api/v1. */
export function createMessagesHttpApi(client: HttpClient): MessagesApi {
  const path = (orderId: number) => `/orders/${String(orderId)}/messages`;

  return {
    getOrderMessages(
      orderId: number,
      query: OrderMessageQuery = {},
      signal?: AbortSignal,
    ): Promise<OrderMessageList> {
      return client.get<OrderMessageList>(path(orderId), {
        query: { channel: query.channel, after: query.after, limit: query.limit },
        signal,
      });
    },

    sendOrderMessage(
      orderId: number,
      body: SendOrderMessageBody,
      idempotencyKey: string,
    ): Promise<OrderMessage> {
      return client.post<OrderMessage>(path(orderId), { body, idempotencyKey });
    },

    markOrderMessagesRead(orderId: number, body: MarkMessagesReadBody): Promise<OrderMessageList> {
      return client.post<OrderMessageList>(`${path(orderId)}/read`, { body });
    },

    requestMessageAttachmentUpload(
      orderId: number,
      body: MessageAttachmentUploadRequest,
    ): Promise<MessageAttachmentUploadResponse> {
      return client.post<MessageAttachmentUploadResponse>(`${path(orderId)}/attachments`, {
        body,
      });
    },
  };
}
