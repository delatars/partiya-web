import type { FactoryQuery } from "@partiya/api-contracts";
import { z } from "zod";

/* Фильтры списка заводов живут в URL — как и фильтры каталога: ссылка на «заводы
   с аудитом в Иванове» должна открываться у коллеги такой же. */

const text = z
  .preprocess((value) => (typeof value === "number" ? String(value) : value), z.string().min(1))
  .optional()
  .catch(undefined);

export const factoriesSearchSchema = z.object({
  /** Поиск по названию завода. */
  q: text,
  /** Город: «Иваново». */
  city: text,
  /** Ключ специализации: shveinoe, trikotazh, svechi, sumki. */
  spec: text,
  /** Только заводы с аудитом платформы; выключено — параметра нет. */
  audit: z
    .union([z.boolean(), z.literal("1"), z.literal("true")])
    .transform((value) => value === true || value === "1" || value === "true")
    .optional()
    .catch(undefined),
});

export type FactoriesSearch = z.infer<typeof factoriesSearchSchema>;

export function parseFactoriesSearch(input: Record<string, unknown>): FactoriesSearch {
  return factoriesSearchSchema.parse(input);
}

export function withFactoriesPatch(
  search: FactoriesSearch,
  patch: Partial<FactoriesSearch>,
): FactoriesSearch {
  return { ...search, ...patch };
}

export function hasFactoryFilters(search: FactoriesSearch): boolean {
  return (
    search.q !== undefined ||
    search.city !== undefined ||
    search.spec !== undefined ||
    search.audit === true
  );
}

export function toFactoryQuery(search: FactoriesSearch): FactoryQuery {
  return {
    q: search.q,
    city: search.city,
    specialization: search.spec,
    auditOnly: search.audit === true ? true : undefined,
  };
}
