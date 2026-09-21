const rules = new Intl.PluralRules("ru-RU");

const INDEX = { one: 0, few: 1, many: 2, other: 2, two: 1, zero: 2 } as const;

/**
 * Русская форма слова по числу: plural(5, ["отзыв", "отзыва", "отзывов"]) → "отзывов".
 * Само число не подставляется — его форматирует formatNumber.
 */
export function plural(count: number, forms: readonly [string, string, string]): string {
  const rule = rules.select(Math.abs(count));
  return forms[INDEX[rule]];
}

/** Число и слово вместе: «126 отзывов». */
export function pluralize(
  count: number,
  forms: readonly [string, string, string],
  formatCount: (value: number) => string = String,
): string {
  return `${formatCount(count)} ${plural(count, forms)}`;
}
