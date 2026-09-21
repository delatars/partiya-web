import type { OfferDetail, QuoteRequest } from "@partiya/api-contracts";
import { z } from "zod";

import { buildQuoteRequest, isOptionAvailable } from "@/shared/lib/quote";

export { isOptionAvailable };

/* Состояние калькулятора живёт ТОЛЬКО в URL: ссылкой на расчёт можно поделиться,
   «назад» и перезагрузка его не теряют, а черновик не надо нигде хранить.
   Значения по умолчанию (объём = MOQ, первый вариант доставки, вкладка «Характеристики»)
   в URL не пишутся — они выражены отсутствием параметра. */

export const OFFER_TABS = ["specs", "questions", "reviews"] as const;
export type OfferTab = (typeof OFFER_TABS)[number];
export const DEFAULT_OFFER_TAB: OfferTab = "specs";

/** Роутер приводит «1000» к числу — строковые поля принимают и то и другое. */
const text = z
  .preprocess((value) => (typeof value === "number" ? String(value) : value), z.string().min(1))
  .optional()
  .catch(undefined);

export const offerSearchSchema = z.object({
  /** Объём партии, шт. Пусто — считаем по MOQ оффера. */
  qty: z.coerce.number().int().positive().optional().catch(undefined),
  /** Коды выбранных опций через запятую: ?options=extra-print-color,embroidery */
  options: text,
  /** Код варианта доставки. Пусто — первый вариант оффера. */
  delivery: text,
  /** Считать как повторную партию у той же фабрики. */
  repeat: z
    .union([z.boolean(), z.literal("1"), z.literal("true")])
    .transform((value) => value === true || value === "1" || value === "true")
    .optional()
    .catch(undefined),
  tab: z.enum(OFFER_TABS).optional().catch(undefined),
});

export type OfferSearch = z.infer<typeof offerSearchSchema>;

export function parseOfferSearch(input: Record<string, unknown>): OfferSearch {
  return offerSearchSchema.parse(input);
}

/** Выбранные опции в порядке, в котором они попали в URL, — он же порядок строк котировки. */
export function selectedOptionIds(search: OfferSearch): string[] {
  return (search.options ?? "").split(",").filter(Boolean);
}

/** Включить или выключить опцию. Порядок выбора сохраняется. */
export function withOption(search: OfferSearch, id: string, on: boolean): OfferSearch {
  const current = selectedOptionIds(search);
  const next = on ? [...new Set([...current, id])] : current.filter((item) => item !== id);
  return { ...search, options: next.length > 0 ? next.join(",") : undefined };
}

export function withPatch(search: OfferSearch, patch: Partial<OfferSearch>): OfferSearch {
  return { ...search, ...patch };
}

/** Шаг кнопок «−/+»: чем крупнее минимальная партия, тем крупнее шаг. */
export function qtyStep(moq: number): number {
  if (moq >= 1000) return 500;
  if (moq >= 300) return 100;
  return 50;
}

/** Объём не опускается ниже MOQ — оффер ниже него просто не считается. */
export function normalizeQty(qty: number | undefined, moq: number): number {
  if (qty === undefined || !Number.isFinite(qty)) return moq;
  return Math.max(moq, Math.trunc(qty));
}

/** Объём, по которому считается котировка: из URL либо MOQ. */
export function effectiveQty(search: OfferSearch, moq: number): number {
  return normalizeQty(search.qty, moq);
}

/** Выбранный вариант доставки; пусто в URL — первый вариант оффера. */
export function effectiveDeliveryId(
  search: OfferSearch,
  offer: Pick<OfferDetail, "delivery">,
): string | undefined {
  const fromUrl = search.delivery;
  if (fromUrl && offer.delivery.some((option) => option.id === fromUrl)) return fromUrl;
  return offer.delivery[0]?.id;
}

/** URL-состояние + оффер → тело `POST /quotes`. Сборку тела делает shared: то же самое
    нужно экрану оформления, а кросс-модульных импортов правила слоёв не допускают. */
export function toQuoteRequest(offer: OfferDetail, search: OfferSearch): QuoteRequest {
  return buildQuoteRequest(offer, {
    qty: effectiveQty(search, offer.moq),
    optionIds: selectedOptionIds(search),
    deliveryId: effectiveDeliveryId(search, offer),
    repeat: search.repeat === true,
  });
}

/** Ссылка на оформление партии с текущим расчётом. */
export function checkoutSearch(offer: OfferDetail, search: OfferSearch): Record<string, unknown> {
  const request = toQuoteRequest(offer, search);
  return {
    offer: request.offerId,
    qty: request.qty,
    options: request.optionIds.length > 0 ? request.optionIds.join(",") : undefined,
    delivery: request.deliveryId,
    // скидку за повтор человек включил на карточке — в оформлении она не должна исчезнуть
    repeat: request.repeat === true ? true : undefined,
  };
}
