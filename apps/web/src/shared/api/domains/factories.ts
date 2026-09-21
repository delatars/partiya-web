import type { FactoryDetail, FactoryListResult, FactoryQuery } from "@partiya/api-contracts";

/** Домен «Заводы»: список с фильтрами и витрина одного завода. */
export interface FactoriesApi {
  /** `GET /factories?city&specialization&audit&page` → список с фасетами. */
  listFactories(query: FactoryQuery, signal?: AbortSignal): Promise<FactoryListResult>;
  /** `GET /factories/{id}` → профиль, аудит, показатели, мощность и предложения. */
  getFactory(id: number, signal?: AbortSignal): Promise<FactoryDetail>;
}
