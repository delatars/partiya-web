import type { EscrowDeal, EscrowOverview } from "@partiya/api-contracts";

/** Домен «Деньги» — модуль-крейт `payments` (ARCHITECTURE.md, 5.4, 8.4).
 *
 * Только чтение: платежи заводит банк (webhook), а выплату запускает приёмка или
 * решение спора. Метода «выплатить» у браузера нет и быть не должно. */
export interface PaymentsApi {
  /** `GET /me/escrow` → 200: KPI раздела, активные резервы, история, счета. */
  getEscrowOverview(signal?: AbortSignal): Promise<EscrowOverview>;

  /** `GET /orders/{id}/escrow` → 200; заказ не оплачен — 404. */
  getOrderEscrow(orderId: number, signal?: AbortSignal): Promise<EscrowDeal>;
}
