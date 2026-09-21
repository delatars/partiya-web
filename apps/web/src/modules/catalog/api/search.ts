import type {
  CatalogQuery,
  CatalogSearchResult,
  Facet,
  OfferSummary,
} from "@partiya/api-contracts";

import { resolveCategoryPath } from "@/shared/lib/categories";
import { MATERIAL_BY_OFFER } from "@/shared/mocks";

/* Поисковый движок мок-сервиса: те же правила, что обещает бэк (ARCHITECTURE.md, 6).
   Счётчики фасетов считаются «с исключением собственного фасета» — как на маркетплейсах:
   выбор ЦФО не обнуляет счётчики остальных регионов. */

export const DEFAULT_PER_PAGE = 12;

type Predicate = (offer: OfferSummary) => boolean;

interface FacetOptionDef {
  value: string;
  label: string;
  match: Predicate;
}

interface FacetDef {
  key: string;
  label: string;
  kind: "checkbox" | "radio";
  options: FacetOptionDef[];
  /** Для радио: значение, выбранное когда в URL ничего нет («любой»). */
  defaultValue?: string;
}

const material =
  (key: string): Predicate =>
  (offer) =>
    MATERIAL_BY_OFFER.get(offer.id) === key;

export const FACET_DEFS: FacetDef[] = [
  {
    key: "moq",
    label: "Минимальная партия",
    kind: "checkbox",
    options: [
      { value: "to500", label: "до 500 шт", match: (o) => o.moq <= 500 },
      { value: "500to1000", label: "500–1 000", match: (o) => o.moq > 500 && o.moq <= 1000 },
      { value: "1000to5000", label: "1 000–5 000", match: (o) => o.moq > 1000 && o.moq <= 5000 },
    ],
  },
  {
    key: "region",
    label: "Регион фабрики",
    kind: "checkbox",
    options: [
      { value: "cfo", label: "ЦФО", match: (o) => o.factory.region === "cfo" },
      { value: "pfo", label: "ПФО", match: (o) => o.factory.region === "pfo" },
      { value: "szfo", label: "СЗФО", match: (o) => o.factory.region === "szfo" },
      { value: "ufo", label: "УФО", match: (o) => o.factory.region === "ufo" },
    ],
  },
  {
    key: "lead",
    label: "Срок",
    kind: "radio",
    defaultValue: "any",
    options: [
      { value: "14", label: "до 14 дней", match: (o) => o.leadDaysMin <= 14 },
      { value: "21", label: "до 21 дня", match: (o) => o.leadDaysMin <= 21 },
      { value: "any", label: "любой", match: () => true },
    ],
  },
  {
    key: "trust",
    label: "Надёжность",
    kind: "checkbox",
    options: [
      { value: "audit", label: "Аудит платформы", match: (o) => o.badges.includes("audit") },
      { value: "rating", label: "Рейтинг 4,7+", match: (o) => o.factory.rating >= 4.7 },
      { value: "sample", label: "Есть образец", match: (o) => o.sampleAvailable },
      { value: "free", label: "Свободно в сентябре", match: (o) => o.freeCapacityPct >= 30 },
    ],
  },
  {
    key: "material",
    label: "Материал",
    kind: "checkbox",
    options: [
      { value: "cotton", label: "Хлопок 100 %", match: material("cotton") },
      { value: "futer", label: "Футер", match: material("futer") },
      { value: "pique", label: "Пике", match: material("pique") },
      { value: "dvunitka", label: "Двунитка", match: material("dvunitka") },
    ],
  },
];

const SORTERS: Record<string, (a: OfferSummary, b: OfferSummary) => number> = {
  price_asc: (a, b) => a.priceFrom - b.priceFrom,
  lead_asc: (a, b) => a.leadDaysMin - b.leadDaysMin,
  rating_desc: (a, b) => b.factory.rating - a.factory.rating,
  free_capacity_desc: (a, b) => b.freeCapacityPct - a.freeCapacityPct,
};

function byCategory(category: string | undefined): Predicate {
  const path = (category ?? "").split("/").filter(Boolean);
  if (path.length === 0) return () => true;
  return (offer) => path.every((slug, index) => offer.categoryPath?.[index] === slug);
}

function byText(q: string | undefined): Predicate {
  const needle = q?.trim().toLowerCase();
  if (!needle) return () => true;
  return (offer) =>
    offer.title.toLowerCase().includes(needle) ||
    offer.factory.name.toLowerCase().includes(needle) ||
    (offer.material ?? "").toLowerCase().includes(needle);
}

function byRanges(query: CatalogQuery): Predicate {
  return (offer) => {
    if (query.priceMin !== undefined && offer.priceFrom < query.priceMin) return false;
    if (query.priceMax !== undefined && offer.priceFrom > query.priceMax) return false;
    if (query.moqMin !== undefined && offer.moq < query.moqMin) return false;
    if (query.moqMax !== undefined && offer.moq > query.moqMax) return false;
    return true;
  };
}

function facetPredicate(def: FacetDef, selected: readonly string[]): Predicate {
  const options = def.options.filter((option) => selected.includes(option.value));
  // ничего не выбрано либо выбрано «любой» — фасет не ограничивает выдачу
  if (options.length === 0 || options.some((option) => option.value === def.defaultValue)) {
    return () => true;
  }
  return (offer) => options.some((option) => option.match(offer));
}

export function searchOffers(
  all: readonly OfferSummary[],
  query: CatalogQuery,
): CatalogSearchResult {
  const selected = query.filters ?? {};
  // выборка по id — это «Избранное»: список хранится у клиента, карточки приходят отсюда.
  // Порядок сохраняем тот, в котором пришли id: он задан человеком, а не релевантностью
  if (query.ids !== undefined) {
    const items = query.ids
      .map((id) => all.find((offer) => offer.id === id))
      .filter((offer) => offer !== undefined);
    return { items, facets: [], total: items.length, page: 1, perPage: items.length, pageCount: 1 };
  }
  const base = all.filter(byCategory(query.category)).filter(byText(query.q));
  const ranges = byRanges(query);

  const predicates = new Map(
    FACET_DEFS.map((def) => [def.key, facetPredicate(def, selected[def.key] ?? [])]),
  );

  const matches = (offer: OfferSummary, skipKey?: string): boolean => {
    if (!ranges(offer)) return false;
    for (const def of FACET_DEFS) {
      if (def.key === skipKey) continue;
      if (!predicates.get(def.key)?.(offer)) return false;
    }
    return true;
  };

  const found = base.filter((offer) => matches(offer));

  const facets: Facet[] = FACET_DEFS.map((def) => {
    const pool = base.filter((offer) => matches(offer, def.key));
    const chosen = selected[def.key] ?? [];
    return {
      key: def.key,
      label: def.label,
      kind: def.kind,
      options: def.options.map((option) => ({
        value: option.value,
        label: option.label,
        count: pool.filter(option.match).length,
        selected:
          chosen.length > 0 ? chosen.includes(option.value) : option.value === def.defaultValue,
      })),
    };
  });

  const sorter = query.sort ? SORTERS[query.sort] : undefined;
  const items = sorter ? [...found].sort(sorter) : found;

  const perPage = query.perPage ?? DEFAULT_PER_PAGE;
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const page = Math.min(Math.max(query.page ?? 1, 1), pageCount);
  const chain = resolveCategoryPath((query.category ?? "").split("/").filter(Boolean));

  return {
    items: items.slice((page - 1) * perPage, page * perPage),
    facets,
    total: items.length,
    page,
    perPage,
    pageCount,
    category:
      chain.length > 0
        ? { path: chain.map((node) => node.slug), title: chain[chain.length - 1]?.title ?? "" }
        : undefined,
  };
}
