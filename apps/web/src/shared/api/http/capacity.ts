import type {
  CapacityPlan,
  CapacityQuery,
  CopyCapacityBody,
  UpdateCapacityBody,
} from "@partiya/api-contracts";

import type { CapacityApi } from "../domains/capacity";
import type { HttpClient } from "../http-client";

/* Реальный бэк: крейт `capacity`, маршруты `/seller/capacity` (ARCHITECTURE.md, 5.3, 8.4). */
export function createCapacityHttpApi(client: HttpClient): CapacityApi {
  return {
    getCapacityPlan(query: CapacityQuery = {}, signal?: AbortSignal): Promise<CapacityPlan> {
      return client.get<CapacityPlan>("/seller/capacity", {
        query: { from: query.from, to: query.to },
        signal,
      });
    },

    updateCapacityPlan(body: UpdateCapacityBody): Promise<CapacityPlan> {
      return client.request<CapacityPlan>("PUT", "/seller/capacity", { body });
    },

    copyCapacityPlan(body: CopyCapacityBody): Promise<CapacityPlan> {
      return client.post<CapacityPlan>("/seller/capacity/copy", { body });
    },
  };
}
