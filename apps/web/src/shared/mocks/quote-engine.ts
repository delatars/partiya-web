import type { OfferDetail, Quote, QuoteRequest } from "@partiya/api-contracts";

import { ApiError } from "@/shared/api";
import { addWorkingDays, toIsoDate } from "@/shared/lib/dates";
import { calculateQuote, isQuoteCalcError } from "@/shared/lib/quote";
import { encodeQuoteId, MOCK_QUOTE_TTL_MS } from "@/shared/lib/quote-id";

import { offerDetail } from "./offer-details";
import { mockPromoCodesEnabled, resolvePromo } from "./orders";

/* Мок `POST /quotes` — один на всех.

   Котировку спрашивает карточка (калькулятор) и пересчитывает оформление (объём, опции,
   доставка, промокод). Считать её в двух местах нельзя: разойдутся — и заказ поедет
   с ценой, отличной от показанной. Поэтому расчёт живёт здесь, внизу иерархии, а моки
   модулей его только зовут.

   Правила — из `shared/lib/quote.ts`, зеркала крейта `pricing`. Ошибки — problem+json
   с теми же статусами, что у настоящего бэка. */

export function offerNotFound(): ApiError {
  return new ApiError({
    status: 404,
    message: "Такого предложения нет",
    problem: { status: 404, title: "Предложение не найдено" },
  });
}

export function requireMockOffer(id: number): OfferDetail {
  const offer = offerDetail(id);
  if (!offer) throw offerNotFound();
  return offer;
}

/** Срок производства: на объёме выше первой ступени фабрика ставит партию в общий поток. */
function leadDaysFor(offer: OfferDetail, qty: number): number {
  const secondTier = offer.tiers[1];
  return secondTier && qty >= secondTier.fromQty ? offer.leadDaysMax : offer.leadDaysMin;
}

/** Считает котировку и выдаёт ей id. Бросает `ApiError` — 404, 422 как у бэка. */
export function mockQuote(request: QuoteRequest, nowMs: number = Date.now()): Quote {
  const offer = requireMockOffer(request.offerId);
  const delivery = offer.delivery.find((option) => option.id === request.deliveryId);

  // промокод проверяется до расчёта: неизвестный код — ошибка ввода, а не нулевая скидка
  const typedPromo = request.promo?.trim() ?? "";
  // п. 10: флаг выключен — любой непустой код отклоняется тем же 422, что и у бэка
  if (typedPromo.length > 0 && !mockPromoCodesEnabled()) {
    throw new ApiError({
      status: 422,
      message: "Промокоды сейчас не принимаются",
      problem: {
        status: 422,
        type: "https://partiya.ru/problems/quote/unknown_promo",
        title: "Промокод не принят",
        detail: "промокоды сейчас не принимаются",
        errors: { promo: ["промокоды сейчас не принимаются"] },
      },
    });
  }
  const promo = typedPromo.length > 0 ? resolvePromo(typedPromo) : undefined;
  if (typedPromo.length > 0 && !promo) {
    throw new ApiError({
      status: 422,
      message: `Промокод «${typedPromo}» не найден`,
      problem: {
        status: 422,
        type: "https://partiya.ru/problems/quote/unknown_promo",
        title: "Промокод не найден",
        detail: `Промокод «${typedPromo}» не найден или не применим к этой партии`,
      },
    });
  }

  try {
    const quote = calculateQuote({
      offer: { moq: offer.moq, tiers: offer.tiers, options: offer.options },
      qty: request.qty,
      optionIds: request.optionIds,
      repeatDiscountPercent: request.repeat === true ? offer.repeatDiscountPercent : undefined,
      // скидка на недозагруз уже заложена в ступени (в выдаче она видна как priceOld),
      // второй раз её применять нельзя — иначе партия подешевеет дважды
      promo: promo ? { code: promo.code, percent: promo.percent } : undefined,
      delivery: delivery ? { title: delivery.title, amount: delivery.price } : undefined,
    });

    const leadDays = leadDaysFor(offer, request.qty);
    const shipDate = addWorkingDays(new Date(nowMs), leadDays + (delivery?.days ?? 0));

    return {
      ...quote,
      // id самодостаточен: по нему мок оформления восстановит расчёт (shared/lib/quote-id.ts)
      id: encodeQuoteId(request, nowMs),
      leadDays,
      shipDate: toIsoDate(shipDate),
      validUntil: new Date(nowMs + MOCK_QUOTE_TTL_MS).toISOString(),
    };
  } catch (error) {
    if (!isQuoteCalcError(error)) throw error;
    throw new ApiError({
      status: 422,
      message: error.message,
      problem: {
        status: 422,
        type: `https://partiya.ru/problems/quote/${error.code}`,
        title: "Партию с такими параметрами посчитать нельзя",
        detail: error.message,
      },
      cause: error,
    });
  }
}
