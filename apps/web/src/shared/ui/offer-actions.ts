import type { OfferSummary } from "@partiya/api-contracts";

import { COMPARE_LIMIT, useListsStore } from "@/shared/stores/lists-store";
import type { ListEntry } from "@/shared/stores/lists-store";

/* Кнопки «сравнить» и «в избранное» повторяются в карточке, строке списка и на карточке
   оффера — общая логика лежит здесь, а не дублируется в каждом компоненте. */

export function toListEntry(offer: OfferSummary): ListEntry {
  return {
    id: offer.id,
    title: offer.title,
    priceFrom: offer.priceFrom,
    moq: offer.moq,
    tone: offer.tone,
  };
}

export interface OfferListActions {
  compared: boolean;
  favorite: boolean;
  /** Добавить нельзя: в сравнении уже COMPARE_LIMIT позиций. */
  compareFull: boolean;
  toggleCompare: () => void;
  toggleFavorite: () => void;
}

export function useOfferListActions(offer: OfferSummary): OfferListActions {
  const compared = useListsStore((state) => state.compare.some((item) => item.id === offer.id));
  const favorite = useListsStore((state) => state.favorites.some((item) => item.id === offer.id));
  const compareSize = useListsStore((state) => state.compare.length);
  const toggleCompareEntry = useListsStore((state) => state.toggleCompare);
  const toggleFavoriteEntry = useListsStore((state) => state.toggleFavorite);

  return {
    compared,
    favorite,
    compareFull: !compared && compareSize >= COMPARE_LIMIT,
    toggleCompare: () => void toggleCompareEntry(toListEntry(offer)),
    toggleFavorite: () => toggleFavoriteEntry(toListEntry(offer)),
  };
}
