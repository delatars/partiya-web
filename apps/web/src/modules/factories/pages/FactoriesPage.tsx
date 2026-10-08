import {
  Box,
  BreadcrumbLink,
  BreadcrumbPage,
  Breadcrumbs,
  Button,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Select,
  SelectItem,
  Skeleton,
} from "@partiya/ui";
import { useQuery } from "@tanstack/react-query";

import { factoryListOptions } from "@/shared/api";
import { formatNumber } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import { AppLink } from "@/shared/ui";

import { FactoryCard } from "../components/FactoryCard";
import type { FactoriesSearch } from "../lib/search-params";
import { hasFactoryFilters, toFactoryQuery, withFactoriesPatch } from "../lib/search-params";

/* Список заводов: в макете «Ленты» отдельного экрана нет — собран из плиток .fac-tile
   главной и фильтров каталога. Фильтры (город, специализация, аудит, поиск) лежат в URL. */

/** Значение «любой» в Select: пустая строка радиксу не годится как value пункта. */
const ANY = "__any__";

export type FactoriesPageProps = {
  search: FactoriesSearch;
  onChange: (next: FactoriesSearch) => void;
};

export function FactoriesPage({ search, onChange }: FactoriesPageProps) {
  const query = useQuery(factoryListOptions(toFactoryQuery(search)));
  const data = query.data;
  const cityFacet = data?.facets.find((facet) => facet.key === "city");
  const specFacet = data?.facets.find((facet) => facet.key === "spec");
  const total = data?.total ?? 0;

  return (
    <>
      <Breadcrumbs>
        <BreadcrumbLink asChild>
          <AppLink to="/">Главная</AppLink>
        </BreadcrumbLink>
        <BreadcrumbPage>Заводы</BreadcrumbPage>
      </Breadcrumbs>

      <h1 className="font-heading mb-1.5 text-2xl leading-[1.2] font-bold">
        Заводы платформы{" "}
        <span className="text-muted font-sans text-sm font-normal">
          {formatNumber(total)} {plural(total, ["производство", "производства", "производств"])}
        </span>
      </h1>
      <p className="text-muted mb-3 text-[13.5px]">
        Аудит — выезд в цех, проверка юрлица, оборудования и контрольных образцов. Дата аудита видна
        в карточке завода.
      </p>

      <Box padding="sm" className="mb-3 grid gap-2.5 md:grid-cols-[1fr_190px_220px_auto]">
        <Field label="Название завода">
          <Input
            value={search.q ?? ""}
            placeholder="Волна, Кама…"
            onChange={(event) =>
              onChange(withFactoriesPatch(search, { q: event.target.value || undefined }))
            }
          />
        </Field>

        <Field label="Город">
          <Select
            value={search.city ?? ANY}
            onValueChange={(value) =>
              onChange(withFactoriesPatch(search, { city: value === ANY ? undefined : value }))
            }
            aria-label="Город завода"
          >
            <SelectItem value={ANY}>Любой</SelectItem>
            {(cityFacet?.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label} · {option.count}
              </SelectItem>
            ))}
          </Select>
        </Field>

        <Field label="Специализация">
          <Select
            value={search.spec ?? ANY}
            onValueChange={(value) =>
              onChange(withFactoriesPatch(search, { spec: value === ANY ? undefined : value }))
            }
            aria-label="Специализация завода"
          >
            <SelectItem value={ANY}>Любая</SelectItem>
            {(specFacet?.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label} · {option.count}
              </SelectItem>
            ))}
          </Select>
        </Field>

        <div className="flex items-end gap-2 pb-0.5">
          <Checkbox
            checked={search.audit === true}
            onCheckedChange={(next) =>
              onChange(withFactoriesPatch(search, { audit: next === true ? true : undefined }))
            }
            label="Только с аудитом"
            rowClassName="py-0"
          />
          {hasFactoryFilters(search) ? (
            <Button variant="ghost" size="sm" onClick={() => onChange({})}>
              Сбросить
            </Button>
          ) : null}
        </div>
      </Box>

      {query.isError ? (
        <Box>
          <EmptyState
            title="Не получилось загрузить список заводов"
            description="Проблема на нашей стороне, мы уже знаем. Фильтры сохранятся."
            action={
              <Button variant="cta" onClick={() => void query.refetch()}>
                Повторить
              </Button>
            }
          />
        </Box>
      ) : query.isPending ? (
        <div
          aria-label="Загружаем заводы"
          role="status"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-[104px] rounded-[10px]" />
          ))}
        </div>
      ) : total === 0 ? (
        <Box>
          <EmptyState
            title="Под такие условия заводов нет"
            description="Снимите часть фильтров — например, ограничение по городу."
            action={
              <>
                <Button variant="cta" onClick={() => onChange({})}>
                  Сбросить фильтры
                </Button>
                <Button asChild variant="ghost">
                  <AppLink to="/catalog">Искать по предложениям</AppLink>
                </Button>
              </>
            }
          />
        </Box>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(data?.items ?? []).map((factory) => (
            <FactoryCard key={factory.id} factory={factory} />
          ))}
        </div>
      )}
    </>
  );
}
