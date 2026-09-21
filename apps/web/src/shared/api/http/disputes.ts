import type {
  Dispute,
  DisputeEvidenceUploadRequest,
  DisputeEvidenceUploadResponse,
  DisputeOptions,
  OpenDisputeBody,
} from "@partiya/api-contracts";

import type { DisputesApi } from "../domains/disputes";
import type { HttpClient } from "../http-client";

/* Реальный бэк: крейт `disputes`, маршруты под /api/v1. */
export function createDisputesHttpApi(client: HttpClient): DisputesApi {
  const path = (orderId: number) => `/orders/${String(orderId)}/dispute`;

  return {
    getDisputeOptions(orderId: number, signal?: AbortSignal): Promise<DisputeOptions> {
      return client.get<DisputeOptions>(`/orders/${String(orderId)}/dispute-options`, { signal });
    },

    getDispute(orderId: number, signal?: AbortSignal): Promise<Dispute> {
      return client.get<Dispute>(path(orderId), { signal });
    },

    openDispute(orderId: number, body: OpenDisputeBody, idempotencyKey: string): Promise<Dispute> {
      return client.post<Dispute>(path(orderId), { body, idempotencyKey });
    },

    withdrawDispute(orderId: number): Promise<Dispute> {
      return client.post<Dispute>(`${path(orderId)}/withdraw`);
    },

    requestDisputeEvidenceUpload(
      orderId: number,
      body: DisputeEvidenceUploadRequest,
    ): Promise<DisputeEvidenceUploadResponse> {
      return client.post<DisputeEvidenceUploadResponse>(`${path(orderId)}/evidence`, { body });
    },
  };
}
