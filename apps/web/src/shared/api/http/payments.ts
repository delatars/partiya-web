import type { EscrowDeal, EscrowOverview } from "@partiya/api-contracts";

import type { PaymentsApi } from "../domains/payments";
import type { HttpClient } from "../http-client";

/* Реальный бэк: крейт `payments`, маршруты под /api/v1. */
export function createPaymentsHttpApi(client: HttpClient): PaymentsApi {
  return {
    getEscrowOverview(signal?: AbortSignal): Promise<EscrowOverview> {
      return client.get<EscrowOverview>("/me/escrow", { signal });
    },

    getOrderEscrow(orderId: number, signal?: AbortSignal): Promise<EscrowDeal> {
      return client.get<EscrowDeal>(`/orders/${String(orderId)}/escrow`, { signal });
    },
  };
}
