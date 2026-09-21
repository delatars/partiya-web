import type { QuoteRequest } from "@partiya/api-contracts";

/* id котировки в моках.
 *
 * ⚠ Только для моков. У настоящего бэка `quoteId` — непрозрачная строка (UUID строки
 * таблицы `quotes`), и разбирать её на фронте нельзя. Здесь id самодостаточен: в него
 * упакован вход котировки и момент выдачи, поэтому мок заказов умеет восстановить из
 * него расчёт, не заводя общего хранилища с моком карточки, — а кросс-модульных
 * импортов правила слоёв не допускают.
 *
 * Формат: `q1.<offerId>.<qty>.<опции через +>.<доставка>.<r|_>.<промокод>.<issuedAtMs>`.
 * Разделители выбраны так, чтобы не встречаться в кодах опций (`extra-print-color`). */

const PREFIX = "q1";
const SEPARATOR = ".";
const EMPTY = "_";

/** Сколько живёт котировка мока. У бэка срок задаётся конфигом и приезжает в `validUntil`. */
export const MOCK_QUOTE_TTL_MS = 30 * 60_000;

export interface DecodedQuoteId {
  request: QuoteRequest;
  issuedAtMs: number;
  expiresAtMs: number;
}

function encodePart(value: string | undefined): string {
  return value === undefined || value === "" ? EMPTY : encodeURIComponent(value);
}

function decodePart(value: string | undefined): string | undefined {
  if (value === undefined || value === EMPTY || value === "") return undefined;
  return decodeURIComponent(value);
}

export function encodeQuoteId(request: QuoteRequest, issuedAtMs: number): string {
  return [
    PREFIX,
    String(request.offerId),
    String(request.qty),
    request.optionIds.length > 0 ? request.optionIds.map(encodeURIComponent).join("+") : EMPTY,
    encodePart(request.deliveryId),
    request.repeat === true ? "r" : EMPTY,
    encodePart(request.promo),
    String(issuedAtMs),
  ].join(SEPARATOR);
}

/** `undefined` — строка не наша: так выглядит и чужой id, и обрезанный при копировании. */
export function decodeQuoteId(quoteId: string): DecodedQuoteId | undefined {
  const parts = quoteId.split(SEPARATOR);
  if (parts.length !== 8 || parts[0] !== PREFIX) return undefined;

  const offerId = Number(parts[1]);
  const qty = Number(parts[2]);
  const issuedAtMs = Number(parts[7]);
  if (!Number.isInteger(offerId) || !Number.isInteger(qty) || !Number.isFinite(issuedAtMs)) {
    return undefined;
  }

  const rawOptions = parts[3];
  const optionIds =
    rawOptions === undefined || rawOptions === EMPTY
      ? []
      : rawOptions.split("+").map((item) => decodeURIComponent(item));

  return {
    request: {
      offerId,
      qty,
      optionIds,
      deliveryId: decodePart(parts[4]),
      repeat: parts[5] === "r" ? true : undefined,
      promo: decodePart(parts[6]),
    },
    issuedAtMs,
    expiresAtMs: issuedAtMs + MOCK_QUOTE_TTL_MS,
  };
}
