import type { SellerOfferStatus, SellerSampleStatus, SellerStage } from "@partiya/api-contracts";

/* Подписи и тона кабинета завода — те же значения `.tag`, что в макете (`statusColor`).

   Отдельным файлом, а не в компонентах: одни и те же ступени показывают и таблица
   заказов, и карточка заказа, и сводка. Разъехавшиеся подписи «Новый» и «Новые» —
   мелочь, которую видно сразу. */

export const SELLER_STAGE_TITLE: Record<SellerStage, string> = {
  new: "Новый",
  in_production: "В производстве",
  quality_control: "Контроль качества",
  shipped: "Отгружен",
  paid_out: "Выплачено",
};

export const SELLER_STAGE_TONE: Record<SellerStage, "new" | "work" | "qc" | "done"> = {
  new: "new",
  in_production: "work",
  quality_control: "qc",
  shipped: "qc",
  paid_out: "done",
};

/** Порядок вкладок очереди заказов — как в макете `factory`. */
export const SELLER_STAGE_ORDER: readonly SellerStage[] = [
  "new",
  "in_production",
  "quality_control",
  "shipped",
  "paid_out",
];

export const OFFER_STATUS_TITLE: Record<SellerOfferStatus, string> = {
  draft: "Черновик",
  moderation: "На модерации",
  published: "Опубликовано",
  archived: "В архиве",
};

export const OFFER_STATUS_TONE: Record<SellerOfferStatus, "ok" | "new" | "work" | "done"> = {
  draft: "done",
  moderation: "new",
  published: "ok",
  archived: "done",
};

export const SAMPLE_STATUS_TITLE: Record<SellerSampleStatus, string> = {
  new: "Новый",
  in_work: "В работе",
  shipped: "Отправлен",
  delivered: "Доставлен",
  declined: "Отклонён",
};

export const SAMPLE_STATUS_TONE: Record<SellerSampleStatus, "new" | "work" | "qc" | "done"> = {
  new: "new",
  in_work: "work",
  shipped: "qc",
  delivered: "done",
  declined: "done",
};

/** «до 18:00» + сколько осталось. `null` — дедлайна нет. */
export function deadlineNote(iso: string | null, nowMs: number = Date.now()): string | null {
  if (iso === null) return null;
  const left = Date.parse(iso) - nowMs;
  if (Number.isNaN(left)) return null;
  if (left <= 0) return "срок истёк";
  const hours = Math.floor(left / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  if (hours >= 24) return `осталось ${String(Math.floor(hours / 24))} дн.`;
  if (hours > 0) return `осталось ${String(hours)} ч ${String(minutes)} мин`;
  return `осталось ${String(minutes)} мин`;
}

/** Ключ идемпотентности команды завода: один на заказ и вид команды. */
export function sellerKey(kind: string, orderId: number): string {
  return `seller:${kind}:${String(orderId)}`;
}
