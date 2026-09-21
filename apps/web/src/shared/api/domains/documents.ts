import type {
  DocumentList,
  DocumentQuery,
  EdoConnection,
  SignDocumentResponse,
} from "@partiya/api-contracts";

/** Домен «Документы и ЭДО» — модуль-крейт `documents` (ARCHITECTURE.md, 8.4).
 *
 * Создающих методов здесь нет намеренно: документы рождаются из заказа (оформление,
 * отгрузка, приёмка), а не из запроса браузера. Снаружи документ можно только прочитать
 * и отправить на подпись. */
export interface DocumentsApi {
  /** `GET /documents?order=&kind=&state=&q=` → 200. Раздел «Документы и ЭДО». */
  listDocuments(query?: DocumentQuery, signal?: AbortSignal): Promise<DocumentList>;

  /** `POST /documents/{id}/sign` → 200. Не готов — 409, нет ЭДО — 409. */
  signDocument(documentId: string): Promise<SignDocumentResponse>;

  /** `GET /me/edo` → 200. Подключение организации к оператору ЭДО. */
  getEdoConnection(signal?: AbortSignal): Promise<EdoConnection>;
}
