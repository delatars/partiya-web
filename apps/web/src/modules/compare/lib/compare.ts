import type { OfferDetail } from "@partiya/api-contracts";

import { formatNumber, formatRub } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import { calculateQuote, isQuoteCalcError, tierFor } from "@/shared/lib/quote";

/* Строки таблицы сравнения — данные, а не разметка: на них же считаются «лучшее
   значение в строке» и режим «только различия», и всё это проверяется тестами без DOM.

   Цены сравниваются на ОДИНАКОВОМ объёме (500 / 1 000 / 3 000 шт), а не «по ступеням»:
   у офферов разный MOQ, и сравнивать первую ступень одного со первой ступенью другого
   значит сравнивать разные партии. Там, где объём ниже MOQ, цены нет — так и пишем. */

export interface CompareRow {
  key: string;
  label: string;
  /** Текст ячейки; он же признак «значения в строке различаются». */
  value: (offer: OfferDetail) => string;
  /** Чем меньше — тем лучше. `undefined` — строка несравнимая (материал, город). */
  score?: (offer: OfferDetail) => number | undefined;
}

/** Объёмы, на которых сравниваются цены. */
export const COMPARE_QUANTITIES = [500, 1000, 3000] as const;

/** Объём, на котором сравнивается итог партии с доставкой. */
export const COMPARE_BATCH_QTY = 1000;

/** Цена за штуку на заданном объёме; `undefined` — объём ниже MOQ оффера. */
export function unitPriceAt(offer: OfferDetail, qty: number): number | undefined {
  if (qty < offer.moq) return undefined;
  return tierFor(offer.tiers, qty)?.unitPrice;
}

/** Итог партии с доставкой по умолчанию — считает то же зеркало движка, что и карточка. */
export function batchTotal(offer: OfferDetail, qty: number): number | undefined {
  if (qty < offer.moq) return undefined;
  const delivery = offer.delivery[0];
  try {
    return calculateQuote({
      offer: { moq: offer.moq, tiers: offer.tiers, options: offer.options },
      qty,
      delivery: delivery ? { title: delivery.title, amount: delivery.price } : undefined,
    }).total;
  } catch (error) {
    // битый оффер не должен ронять всю таблицу — в ячейке будет прочерк
    if (isQuoteCalcError(error)) return undefined;
    throw error;
  }
}

const priceRow = (qty: number): CompareRow => ({
  key: `price-${String(qty)}`,
  label: `Цена за шт при ${formatNumber(qty)}`,
  value: (offer) => {
    const price = unitPriceAt(offer, qty);
    return price === undefined ? `MOQ от ${formatNumber(offer.moq)} шт` : formatRub(price);
  },
  // объём ниже MOQ — это не «дорого», а «нельзя»: такая ячейка уходит в конец сравнения
  score: (offer) => unitPriceAt(offer, qty) ?? Number.POSITIVE_INFINITY,
});

export const COMPARE_ROWS: CompareRow[] = [
  ...COMPARE_QUANTITIES.map(priceRow),
  {
    key: "batch",
    label: `Партия ${formatNumber(COMPARE_BATCH_QTY)} шт с доставкой`,
    value: (offer) => {
      const total = batchTotal(offer, COMPARE_BATCH_QTY);
      return total === undefined ? "—" : formatRub(total);
    },
    score: (offer) => batchTotal(offer, COMPARE_BATCH_QTY) ?? Number.POSITIVE_INFINITY,
  },
  {
    key: "moq",
    label: "Минимальная партия",
    value: (offer) => `${formatNumber(offer.moq)} шт`,
    score: (offer) => offer.moq,
  },
  {
    key: "lead",
    label: "Срок производства",
    value: (offer) =>
      `от ${String(offer.leadDaysMin)} раб. ${plural(offer.leadDaysMin, ["дня", "дней", "дней"])}`,
    score: (offer) => offer.leadDaysMin,
  },
  {
    key: "free",
    label: "Свободно в сентябре",
    value: (offer) => `${String(offer.freeCapacityPct)} %`,
    // больше свободной мощности — лучше, поэтому знак переворачивается
    score: (offer) => -offer.freeCapacityPct,
  },
  {
    key: "material",
    label: "Материал",
    value: (offer) => offer.material ?? "—",
  },
  {
    key: "rating",
    label: "Рейтинг фабрики",
    value: (offer) =>
      `${offer.factory.rating.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · ${formatNumber(offer.factory.reviews)} ${plural(offer.factory.reviews, ["отзыв", "отзыва", "отзывов"])}`,
    score: (offer) => -offer.factory.rating,
  },
  {
    key: "audit",
    label: "Аудит платформы",
    value: (offer) => (offer.badges.includes("audit") ? "пройден" : "нет"),
    score: (offer) => (offer.badges.includes("audit") ? 0 : 1),
  },
  {
    key: "sample",
    label: "Образец",
    value: (offer) =>
      offer.sample
        ? `${formatRub(offer.sample.price)} · ${String(offer.sample.days)} ${plural(offer.sample.days, ["день", "дня", "дней"])}`
        : "недоступен",
    score: (offer) => (offer.sample ? offer.sample.price : Number.POSITIVE_INFINITY),
  },
  {
    key: "city",
    label: "Регион",
    value: (offer) => offer.factory.city,
  },
];

/** Значения в строке различаются — иначе строку прячет режим «только различия». */
export function rowDiffers(row: CompareRow, offers: readonly OfferDetail[]): boolean {
  if (offers.length < 2) return true;
  const first = row.value(offers[0] as OfferDetail);
  return offers.some((offer) => row.value(offer) !== first);
}

/** Офферы с лучшим значением строки.
 *
 * Пусто, когда сравнивать нечего: строка несравнимая, оффер один или значения
 * совпали — подсвечивать всю строку зелёным значило бы «лучшее» там, где выбора нет. */
export function bestOfferIds(row: CompareRow, offers: readonly OfferDetail[]): Set<number> {
  const { score } = row;
  if (!score || offers.length < 2) return new Set();

  const scored = offers.map((offer) => ({ id: offer.id, value: score(offer) }));
  const known = scored.filter(
    (item): item is { id: number; value: number } =>
      item.value !== undefined && Number.isFinite(item.value),
  );
  if (known.length === 0) return new Set();

  const best = Math.min(...known.map((item) => item.value));
  const winners = known.filter((item) => item.value === best);
  // все значения одинаковые — лучшего нет
  if (winners.length === scored.length) return new Set();
  return new Set(winners.map((item) => item.id));
}

/** Строки к показу: все либо только те, где офферы расходятся. */
export function visibleRows(
  offers: readonly OfferDetail[],
  onlyDifferences: boolean,
): CompareRow[] {
  if (!onlyDifferences) return COMPARE_ROWS;
  return COMPARE_ROWS.filter((row) => rowDiffers(row, offers));
}
