import { z } from "zod";

/* Что сравнивать — помнит лоток сравнения (`shared/stores/lists-store`), а не URL:
   набор меняется из каталога и с карточки, и второй источник правды тут же разъехался бы
   с первым. В URL лежит только режим показа — чтобы ссылка «смотри, чем они отличаются»
   открывалась в том же виде. */

export const compareSearchSchema = z.object({
  /** Показывать только строки, где офферы расходятся. */
  only: z
    .union([z.boolean(), z.literal("1"), z.literal("true")])
    .transform((value) => value === true || value === "1" || value === "true")
    .optional()
    .catch(undefined),
});

export type CompareSearch = z.infer<typeof compareSearchSchema>;

export function parseCompareSearch(input: Record<string, unknown>): CompareSearch {
  return compareSearchSchema.parse(input);
}

/** Выключённый режим в URL не пишется — он и так по умолчанию. */
export function withCompareOnly(search: CompareSearch, only: boolean): CompareSearch {
  return { ...search, only: only ? true : undefined };
}
