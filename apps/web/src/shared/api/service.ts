import { getConfig } from "@partiya/shared";

import type { ApiService } from "./domains";
import { createHttpApiService } from "./http";

/* Единственная дверь наружу. Моки навешиваются декораторами поверх реального сервиса. */

export type ApiDecorator = (inner: ApiService) => ApiService;

let service: ApiService | undefined;

export function getApiService(): ApiService {
  service ??= createHttpApiService(getConfig().apiBaseUrl);
  return service;
}

/** Мок-декоратор домена: подменяет свои методы, остальные оставляет внутреннему сервису. */
export function decorateApiService(decorate: ApiDecorator): void {
  service = decorate(getApiService());
}

/** Только для тестов: подставить готовый сервис и не ходить в сеть. */
export function setApiService(next: ApiService | undefined): void {
  service = next;
}

/* Основа мок-декоратора. Домены, которых нет в overrides, делегируются внутрь как есть,
   поэтому появление нового домена не требует правок здесь. */
export function createDelegatingApiService(
  inner: ApiService,
  overrides: Partial<ApiService>,
): ApiService {
  return { ...inner, ...overrides };
}
