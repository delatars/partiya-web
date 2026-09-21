const numberFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const ratingFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const NBSP = String.fromCharCode(0xa0);

/** Копейки → строка вида "183 400 ₽"; пробелы в результате неразрывные */
export function formatRub(kopecks: number): string {
  return `${formatNumber(Math.round(kopecks / 100))}${NBSP}₽`;
}

/** Копейки → рубли числом, без знака валюты (для мест, где ₽ рисуется отдельно) */
export function toRubles(kopecks: number): number {
  return Math.round(kopecks / 100);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value).replace(/\s/g, NBSP);
}

/** Рейтинг всегда с одним знаком: 4,8 */
export function formatRating(value: number): string {
  return ratingFormatter.format(value);
}
