import { useQuery } from "@tanstack/react-query";

import { catalogSearchOptions } from "@/shared/api";
import { CATEGORIES } from "@/shared/lib/categories";
import { CategoryGrid, OfferCard } from "@/shared/ui";

import { FactoryTiles } from "../components/FactoryTiles";
import { HeroSection } from "../components/HeroSection";
import { PromoBand } from "../components/PromoBand";
import { SectionHeader } from "../components/SectionHeader";
import { TrustRow } from "../components/TrustRow";

/* Макет: экран home. Подборка «Популярное в текстиле» берётся из той же выдачи каталога,
   что и сам каталог, — отдельного эндпойнта для неё нет. */

const POPULAR = { category: "tekstil", sort: "popular", page: 1, perPage: 6 } as const;

export function HomePage() {
  const popular = useQuery(catalogSearchOptions(POPULAR));

  return (
    <>
      <HeroSection />

      <SectionHeader title="Категории" linkLabel="Весь каталог" linkTo="/catalog" />
      <CategoryGrid categories={CATEGORIES} />

      <PromoBand />

      <SectionHeader
        title="Популярное в текстиле"
        linkLabel={`Все ${String(popular.data?.total ?? 0)}`}
        linkTo="/catalog/tekstil"
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {(popular.data?.items ?? []).map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>

      <SectionHeader title="Фабрики с аудитом" linkLabel="Все заводы" linkTo="/factories" />
      <FactoryTiles />

      <TrustRow />
    </>
  );
}
