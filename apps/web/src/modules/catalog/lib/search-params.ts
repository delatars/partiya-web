import type { CatalogQuery, CatalogSort } from "@partiya/api-contracts";
import { z } from "zod";

/* Состояние выдачи живёт ТОЛЬКО в URL: шаринг, «назад» и SEO-слепок получают его бесплатно.
   Значения по умолчанию (popular, сетка, первая страница) в URL не пишутся — они выражены
   отсутствием параметра. Поэтому все поля необязательные, а дефолты подставляются здесь. */

export const CATALOG_SORTS = [
  "popular",
  "price_asc",
  "lead_asc",
  "rating_desc",
  "free_capacity_desc",
] as const;

export const DEFAULT_SORT: CatalogSort = "popular";
export const PER_PAGE = 12;

/** Фасеты-списки: в URL лежат значения через запятую (?region=cfo,pfo). */
export const LIST_FACETS = ["moq", "region", "trust", "material"] as const;
export type ListFacetKey = (typeof LIST_FACETS)[number];

/** Роутер приводит «14» к числу — строковые поля принимают и то и другое. */
const text = z
  .preprocess((value) => (typeof value === "number" ? String(value) : value), z.string().min(1))
  .optional()
  .catch(undefined);

const count = z.coerce.number().int().positive().optional().catch(undefined);

export const catalogSearchSchema = z.object({
  q: text,
  sort: z.enum(CATALOG_SORTS).optional().catch(undefined),
  /** Сетка — режим по умолчанию, поэтому в URL попадает только list. */
  view: z.enum(["grid", "list"]).optional().catch(undefined),
  /** Первая страница в URL не пишется. */
  page: z.coerce.number().int().min(2).optional().catch(undefined),
  moq: text,
  region: text,
  trust: text,
  material: text,
  /** Радио «Срок»: максимум рабочих дней. Пусто — «любой». */
  lead: count,
  /** Рубли за штуку — так их вводит пользователь; в контракт уходят копейки. */
  priceMin: count,
  priceMax: count,
  moqMin: count,
  moqMax: count,
});

export type CatalogSearch = z.infer<typeof catalogSearchSchema>;

export function parseCatalogSearch(input: Record<string, unknown>): CatalogSearch {
  return catalogSearchSchema.parse(input);
}

export function facetValues(search: CatalogSearch, key: ListFacetKey): string[] {
  return (search[key] ?? "").split(",").filter(Boolean);
}

/** Включить или выключить значение фасета. Смена фильтра всегда возвращает на первую страницу. */
export function withFacetValue(
  search: CatalogSearch,
  key: ListFacetKey,
  value: string,
  on: boolean,
): CatalogSearch {
  const current = facetValues(search, key);
  const next = on ? [...new Set([...current, value])] : current.filter((item) => item !== value);
  return { ...search, [key]: next.length > 0 ? next.join(",") : undefined, page: undefined };
}

export function withPatch(search: CatalogSearch, patch: Partial<CatalogSearch>): CatalogSearch {
  return { ...search, ...patch, page: undefined };
}

/** Сброс фильтров: запрос, сортировка и режим показа — не фильтры и остаются. */
export function clearFilters(search: CatalogSearch): CatalogSearch {
  return { q: search.q, sort: search.sort, view: search.view };
}

/** Сколько фильтров выбрано — число на кнопке «Фильтры» в мобильной шапке. */
export function activeFilterCount(search: CatalogSearch): number {
  const facets = LIST_FACETS.reduce((sum, key) => sum + facetValues(search, key).length, 0);
  const lead = search.lead === undefined ? 0 : 1;
  const price = search.priceMin === undefined && search.priceMax === undefined ? 0 : 1;
  const moq = search.moqMin === undefined && search.moqMax === undefined ? 0 : 1;
  return facets + lead + price + moq;
}

export function hasActiveFilters(search: CatalogSearch): boolean {
  return activeFilterCount(search) > 0;
}

/** URL-состояние + путь категории → запрос к API. */
export function toCatalogQuery(
  search: CatalogSearch,
  categoryPath: readonly string[],
): CatalogQuery {
  const filters: Record<string, string[]> = {};
  for (const key of LIST_FACETS) {
    const values = facetValues(search, key);
    if (values.length > 0) filters[key] = values;
  }
  if (search.lead !== undefined) filters.lead = [String(search.lead)];

  return {
    category: categoryPath.length > 0 ? categoryPath.join("/") : undefined,
    q: search.q,
    sort: search.sort ?? DEFAULT_SORT,
    page: search.page ?? 1,
    perPage: PER_PAGE,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    priceMin: search.priceMin === undefined ? undefined : search.priceMin * 100,
    priceMax: search.priceMax === undefined ? undefined : search.priceMax * 100,
    moqMin: search.moqMin,
    moqMax: search.moqMax,
  };
}

/** Запрос одной страницы: «Показать ещё» догружает следующие, не теряя предыдущие. */
export function pageQuery(query: CatalogQuery, page: number): CatalogQuery {
  return { ...query, page };
}
