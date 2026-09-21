import type { DocumentQuery } from "@partiya/api-contracts";
import { queryOptions } from "@tanstack/react-query";

import { getApiService } from "../service";

/* Фабрика ключей домена «Документы». */
export const DOCUMENT_KEYS = {
  all: ["documents"] as const,
  lists: () => [...DOCUMENT_KEYS.all, "list"] as const,
  list: (query: DocumentQuery) => [...DOCUMENT_KEYS.lists(), query] as const,
  edo: () => [...DOCUMENT_KEYS.all, "edo"] as const,
};

export const documentListOptions = (query: DocumentQuery = {}) =>
  queryOptions({
    queryKey: DOCUMENT_KEYS.list(query),
    queryFn: ({ signal }) => getApiService().listDocuments(query, signal),
    staleTime: 30_000,
  });

/** Подключение ЭДО меняется раз в жизни организации — кэшируем надолго. */
export const edoConnectionOptions = () =>
  queryOptions({
    queryKey: DOCUMENT_KEYS.edo(),
    queryFn: ({ signal }) => getApiService().getEdoConnection(signal),
    staleTime: 5 * 60_000,
  });
