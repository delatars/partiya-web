import type {
  Dispute,
  DisputeEvidenceUploadRequest,
  DisputeEvidenceUploadResponse,
  DisputeOptions,
  OpenDisputeBody,
} from "@partiya/api-contracts";

/** Домен «Споры» — модуль-крейт `disputes` (ARCHITECTURE.md, 8.4).
 *
 * Открытие спора блокирует деньги в эскроу, поэтому у него есть `Idempotency-Key`:
 * повторный запрос после обрыва сети обязан вернуть тот же спор, а не открыть второй. */
export interface DisputesApi {
  /** `GET /orders/{id}/dispute-options` → 200: причины, варианты требований, лимиты файлов. */
  getDisputeOptions(orderId: number, signal?: AbortSignal): Promise<DisputeOptions>;

  /** `GET /orders/{id}/dispute` → 200; спора нет — 404. */
  getDispute(orderId: number, signal?: AbortSignal): Promise<Dispute>;

  /** `POST /orders/{id}/dispute` → 201. Не тот статус — 409, форма неполна — 422. */
  openDispute(orderId: number, body: OpenDisputeBody, idempotencyKey: string): Promise<Dispute>;

  /** `POST /orders/{id}/dispute/withdraw` → 200. Решение уже принято — 409. */
  withdrawDispute(orderId: number): Promise<Dispute>;

  /** `POST /orders/{id}/dispute/evidence` → 200 с presigned-ссылкой. */
  requestDisputeEvidenceUpload(
    orderId: number,
    body: DisputeEvidenceUploadRequest,
  ): Promise<DisputeEvidenceUploadResponse>;
}
