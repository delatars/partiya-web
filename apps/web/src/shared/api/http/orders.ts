import type {
  AcceptOrderBody,
  ArtworkUploadRequest,
  ArtworkUploadResponse,
  CreateOrderDraftBody,
  CreateSampleBody,
  Order,
  OrderArtwork,
  OrderList,
  OrderListQuery,
  RepeatOrderResponse,
  SampleArtworkUploadRequest,
  SampleArtworkUploadResponse,
  SampleList,
  SampleOptions,
  SampleOrder,
  SubmitOrderResponse,
  UpdateOrderDraftBody,
} from "@partiya/api-contracts";

import type { OrdersApi } from "../domains/orders";
import type { HttpClient } from "../http-client";

/* Реальный бэк: крейты `orders` и `samples`, маршруты под /api/v1.

   `Idempotency-Key` ставится только там, где запрос меняет деньги или статус
   (ARCHITECTURE.md, 8.4). На PATCH черновика его нет намеренно: PATCH идемпотентен
   сам по себе — повтор с тем же телом даёт то же состояние. */
export function createOrdersHttpApi(client: HttpClient): OrdersApi {
  const path = (id: number) => `/orders/${String(id)}`;

  return {
    createOrderDraft(
      body: CreateOrderDraftBody,
      idempotencyKey: string,
      signal?: AbortSignal,
    ): Promise<Order> {
      return client.post<Order>("/orders", { body, idempotencyKey, signal });
    },

    getOrder(id: number, signal?: AbortSignal): Promise<Order> {
      return client.get<Order>(path(id), { signal });
    },

    listOrders(query: OrderListQuery = {}, signal?: AbortSignal): Promise<OrderList> {
      return client.get<OrderList>("/orders", {
        query: { bucket: query.bucket, page: query.page, perPage: query.perPage },
        signal,
      });
    },

    updateOrderDraft(id: number, body: UpdateOrderDraftBody): Promise<Order> {
      return client.patch<Order>(path(id), { body });
    },

    requestArtworkUpload(id: number, body: ArtworkUploadRequest): Promise<ArtworkUploadResponse> {
      return client.post<ArtworkUploadResponse>(`${path(id)}/artwork`, { body });
    },

    completeArtworkUpload(id: number, fileId: string): Promise<OrderArtwork> {
      return client.post<OrderArtwork>(
        `${path(id)}/artwork/${encodeURIComponent(fileId)}/complete`,
      );
    },

    deleteArtwork(id: number, fileId: string): Promise<void> {
      return client.request<void>("DELETE", `${path(id)}/artwork/${encodeURIComponent(fileId)}`);
    },

    submitOrder(id: number, idempotencyKey: string): Promise<SubmitOrderResponse> {
      return client.post<SubmitOrderResponse>(`${path(id)}/submit`, { idempotencyKey });
    },

    approveArtwork(id: number): Promise<Order> {
      return client.post<Order>(`${path(id)}/artwork/approve`);
    },

    acceptOrder(id: number, body: AcceptOrderBody, idempotencyKey: string): Promise<Order> {
      return client.post<Order>(`${path(id)}/accept`, { body, idempotencyKey });
    },

    repeatOrder(id: number, idempotencyKey: string): Promise<RepeatOrderResponse> {
      return client.post<RepeatOrderResponse>(`${path(id)}/repeat`, { idempotencyKey });
    },

    getSampleOptions(offerId: number, signal?: AbortSignal): Promise<SampleOptions> {
      return client.get<SampleOptions>(`/offers/${String(offerId)}/sample-options`, { signal });
    },

    requestSampleArtworkUpload(
      body: SampleArtworkUploadRequest,
    ): Promise<SampleArtworkUploadResponse> {
      return client.post<SampleArtworkUploadResponse>("/samples/artwork", { body });
    },

    createSample(body: CreateSampleBody, idempotencyKey: string): Promise<SampleOrder> {
      return client.post<SampleOrder>("/samples", { body, idempotencyKey });
    },

    listSamples(signal?: AbortSignal): Promise<SampleList> {
      return client.get<SampleList>("/samples", { signal });
    },
  };
}
