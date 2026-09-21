import type {
  DocumentList,
  DocumentQuery,
  EdoConnection,
  SignDocumentResponse,
} from "@partiya/api-contracts";

import type { DocumentsApi } from "../domains/documents";
import type { HttpClient } from "../http-client";

/* Реальный бэк: крейт `documents`, маршруты под /api/v1. */
export function createDocumentsHttpApi(client: HttpClient): DocumentsApi {
  return {
    listDocuments(query: DocumentQuery = {}, signal?: AbortSignal): Promise<DocumentList> {
      return client.get<DocumentList>("/documents", {
        query: {
          order: query.orderId,
          kind: query.kind,
          state: query.state,
          q: query.q,
          from: query.from,
          to: query.to,
          page: query.page,
          perPage: query.perPage,
        },
        signal,
      });
    },

    signDocument(documentId: string): Promise<SignDocumentResponse> {
      return client.post<SignDocumentResponse>(`/documents/${encodeURIComponent(documentId)}/sign`);
    },

    getEdoConnection(signal?: AbortSignal): Promise<EdoConnection> {
      return client.get<EdoConnection>("/me/edo", { signal });
    },
  };
}
