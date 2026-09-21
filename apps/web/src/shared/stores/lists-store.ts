import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/* Лоток сравнения и избранное анонима. После входа списки сливаются с аккаунтом
   через POST /lists/merge — ARCHITECTURE.md, 7.6. */

/** Больше четырёх колонок таблица сравнения не выдерживает — ограничение из макета. */
export const COMPARE_LIMIT = 4;

/** Минимум об оффере, чтобы нарисовать лоток и не ходить в сеть за уже виденным. */
export interface ListEntry {
  id: number;
  title: string;
  priceFrom: number;
  moq: number;
  tone?: "a" | "b" | "c" | "d";
}

export interface ListsState {
  compare: ListEntry[];
  favorites: ListEntry[];
  /** true — добавлено, false — уже было четыре и добавления не случилось. */
  toggleCompare: (entry: ListEntry) => boolean;
  removeFromCompare: (id: number) => void;
  clearCompare: () => void;
  toggleFavorite: (entry: ListEntry) => void;
  clearFavorites: () => void;
}

/** localStorage может быть недоступен (приватный режим, запрет cookie) — тогда работаем в памяти. */
const safeStorage = createJSONStorage(() => {
  try {
    const probe = "__partiya_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return memoryStorage();
  }
});

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
}

export const useListsStore = create<ListsState>()(
  persist(
    (set, get) => ({
      compare: [],
      favorites: [],

      toggleCompare: (entry) => {
        const current = get().compare;
        const existing = current.some((item) => item.id === entry.id);
        if (existing) {
          set({ compare: current.filter((item) => item.id !== entry.id) });
          return false;
        }
        if (current.length >= COMPARE_LIMIT) return false;
        set({ compare: [...current, entry] });
        return true;
      },

      removeFromCompare: (id) =>
        set((state) => ({ compare: state.compare.filter((item) => item.id !== id) })),

      clearCompare: () => set({ compare: [] }),

      toggleFavorite: (entry) =>
        set((state) => ({
          favorites: state.favorites.some((item) => item.id === entry.id)
            ? state.favorites.filter((item) => item.id !== entry.id)
            : [...state.favorites, entry],
        })),

      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: "partiya.lists",
      version: 1,
      storage: safeStorage,
      partialize: (state) => ({ compare: state.compare, favorites: state.favorites }),
    },
  ),
);

export const useCompareCount = (): number => useListsStore((state) => state.compare.length);
export const useFavoritesCount = (): number => useListsStore((state) => state.favorites.length);

export function useIsCompared(id: number): boolean {
  return useListsStore((state) => state.compare.some((item) => item.id === id));
}

export function useIsFavorite(id: number): boolean {
  return useListsStore((state) => state.favorites.some((item) => item.id === id));
}
