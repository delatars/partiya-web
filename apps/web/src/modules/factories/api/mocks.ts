import type {
  Facet,
  FacetOption,
  FactoryDetail,
  FactoryListResult,
  FactoryQuery,
} from "@partiya/api-contracts";

import { ApiError } from "@/shared/api";
import { createDelegatingApiService } from "@/shared/api";
import type { ApiService } from "@/shared/api";
import type { FactoryFixture } from "@/shared/mocks";
import {
  FACTORIES,
  FACTORY_KEYS,
  factoryById,
  factoryReviews,
  offersOfFactory,
  SPECIALIZATIONS,
  toFactoryDetail,
  toFactorySummary,
} from "@/shared/mocks";

/* Мок домена «Заводы». Фасеты считаются «с исключением собственного фасета», как
   в каталоге: выбор Иванова не обнуляет счётчики остальных городов. */

const LATENCY_MS = 200;

const ALL: FactoryFixture[] = FACTORY_KEYS.map((key) => FACTORIES[key]);

type Predicate = (factory: FactoryFixture) => boolean;

function predicates(query: FactoryQuery): Record<"q" | "city" | "spec" | "audit", Predicate> {
  const needle = query.q?.trim().toLowerCase();
  return {
    q: (factory) => !needle || factory.name.toLowerCase().includes(needle),
    city: (factory) => !query.city || factory.city === query.city,
    spec: (factory) => !query.specialization || factory.specialization === query.specialization,
    audit: (factory) => query.auditOnly !== true || factory.audit,
  };
}

/** Выборка без одного фасета — на ней считаются его счётчики. */
function matching(query: FactoryQuery, except?: "city" | "spec"): FactoryFixture[] {
  const rules = predicates(query);
  return ALL.filter(
    (factory) =>
      rules.q(factory) &&
      rules.audit(factory) &&
      (except === "city" || rules.city(factory)) &&
      (except === "spec" || rules.spec(factory)),
  );
}

function cityFacet(query: FactoryQuery): Facet {
  const pool = matching(query, "city");
  const cities = [...new Set(ALL.map((factory) => factory.city))].sort((a, b) =>
    a.localeCompare(b, "ru"),
  );
  const options: FacetOption[] = cities.map((city) => ({
    value: city,
    label: city,
    count: pool.filter((factory) => factory.city === city).length,
    selected: query.city === city,
  }));
  return { key: "city", label: "Город", options };
}

function specFacet(query: FactoryQuery): Facet {
  const pool = matching(query, "spec");
  const options: FacetOption[] = Object.entries(SPECIALIZATIONS).map(([value, label]) => ({
    value,
    label,
    count: pool.filter((factory) => factory.specialization === value).length,
    selected: query.specialization === value,
  }));
  return { key: "spec", label: "Специализация", options };
}

function list(query: FactoryQuery): FactoryListResult {
  const items = matching(query)
    // аудит вперёд, дальше по рейтингу: так выдача заводов полезнее алфавита
    .sort((a, b) => Number(b.audit) - Number(a.audit) || b.rating - a.rating)
    .map((factory) => toFactorySummary(factory, offersOfFactory(factory.id).length));

  return {
    items,
    total: items.length,
    facets: [cityFacet(query), specFacet(query)],
    page: 1,
    perPage: items.length,
    pageCount: 1,
  };
}

function detail(id: number): FactoryDetail {
  const fixture = factoryById(id);
  if (!fixture) {
    throw new ApiError({
      status: 404,
      message: "Такого завода нет",
      problem: { status: 404, title: "Завод не найден" },
    });
  }
  const offers = offersOfFactory(id);
  return {
    ...toFactoryDetail(fixture, offers.length),
    offers,
    recentReviews: factoryReviews(id),
  };
}

function delayed<T>(produce: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(produce());
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    }, LATENCY_MS);
  });
}

export const installFactoryMocks = (inner: ApiService): ApiService =>
  createDelegatingApiService(inner, {
    listFactories: (query: FactoryQuery): Promise<FactoryListResult> => delayed(() => list(query)),
    getFactory: (id: number): Promise<FactoryDetail> => delayed(() => detail(id)),
  });
