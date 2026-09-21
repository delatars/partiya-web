import type { FactoryDetail, FactoryListResult, FactoryQuery } from "@partiya/api-contracts";

import type { FactoriesApi } from "../domains/factories";
import type { HttpClient } from "../http-client";

/* Реальный бэк: GET /factories с фильтрами в query и GET /factories/{id}. */
export function createFactoriesHttpApi(client: HttpClient): FactoriesApi {
  return {
    listFactories: (query: FactoryQuery, signal?: AbortSignal) =>
      client.get<FactoryListResult>("/factories", {
        query: {
          q: query.q,
          city: query.city,
          specialization: query.specialization,
          // бэк ждёт флаг только когда он включён — иначе параметр не отправляем
          audit: query.auditOnly === true ? true : undefined,
          page: query.page,
          perPage: query.perPage,
        },
        signal,
      }),
    getFactory: (id: number, signal?: AbortSignal) =>
      client.get<FactoryDetail>(`/factories/${String(id)}`, { signal }),
  };
}
