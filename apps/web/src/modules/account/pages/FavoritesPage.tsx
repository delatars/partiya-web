import { Box, Button, EmptyState, Skeleton, TabBar, TabBarItem } from "@partiya/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { catalogSearchOptions } from "@/shared/api";
import { useListsStore } from "@/shared/stores/lists-store";
import { AppLink, OfferCard } from "@/shared/ui";

/* Макет: экран `favorites` — «Избранное».
 *
 * Список id живёт у клиента (стор с persist), карточки приходят из той же выдачи, что и
 * каталог (`GET /catalog/search?ids=…`). Так избранное не устаревает: цена, мощность и
 * бейджи всегда свежие, а не такие, какими были в момент добавления.
 *
 * ⚠ После входа списки должны сливаться с аккаунтом через `POST /lists/merge`
 * (ARCHITECTURE.md, 7.6) — эндпоинта ещё нет, поэтому избранное пока только локальное. */

type Tab = "offers" | "searches";

export function FavoritesPage() {
  const favorites = useListsStore((state) => state.favorites);
  const clear = useListsStore((state) => state.clearFavorites);
  const [tab, setTab] = useState<Tab>("offers");

  const ids = favorites.map((item) => item.id);
  const query = useQuery({
    ...catalogSearchOptions({ ids }),
    enabled: ids.length > 0,
  });
  const offers = query.data?.items ?? [];

  return (
    <>
      <header className="mt-1 mb-3.5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Избранное</h1>
          <p className="text-muted mt-1">
            {favorites.length === 0
              ? "Пока пусто"
              : `${String(favorites.length)} предложений · цены и мощность обновляются автоматически`}
          </p>
        </div>
        {favorites.length > 0 && (
          <Button variant="ghost" onClick={clear}>
            Очистить список
          </Button>
        )}
      </header>

      <TabBar label="Разделы избранного" className="mb-3">
        <TabBarItem asChild active={tab === "offers"} count={favorites.length || undefined}>
          <button
            type="button"
            onClick={() => {
              setTab("offers");
            }}
          >
            Предложения
          </button>
        </TabBarItem>
        <TabBarItem asChild active={tab === "searches"}>
          <button
            type="button"
            onClick={() => {
              setTab("searches");
            }}
          >
            Сохранённые поиски
          </button>
        </TabBarItem>
      </TabBar>

      {tab === "offers" ? (
        favorites.length === 0 ? (
          <Box>
            <EmptyState
              title="В избранном пусто"
              description="Нажмите на сердце в карточке предложения — оно попадёт сюда и не потеряется."
              action={
                <Button asChild variant="cta">
                  <AppLink to="/catalog">Перейти в каталог</AppLink>
                </Button>
              }
            />
          </Box>
        ) : query.isPending ? (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {ids.map((id) => (
              <Skeleton key={id} className="h-80 w-full rounded-[10px]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )
      ) : (
        <Box>
          <EmptyState
            title="Сохранённых поисков пока нет"
            description="Сохранённый поиск будет присылать уведомление, когда появятся подходящие предложения. Эндпоинта для него ещё нет — раздел появится вместе с ним."
            action={
              <Button asChild>
                <AppLink to="/catalog">Настроить фильтры в каталоге</AppLink>
              </Button>
            }
          />
        </Box>
      )}
    </>
  );
}
