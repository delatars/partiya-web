import { Box, Skeleton } from "@partiya/ui";

/* Макет: экран state-loading в раскладке карточки — те же три колонки, что у готовой
   страницы, чтобы после загрузки ничего не прыгало. */

export function OfferSkeleton() {
  return (
    <Box padding="lg" className="mt-3" aria-busy="true" aria-label="Загружаем предложение">
      <div className="grid items-start gap-5 md:grid-cols-2 lg:grid-cols-[70px_1fr_1.1fr_330px]">
        <div className="hidden w-[70px] flex-col gap-1.5 lg:flex">
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} square />
          ))}
        </div>

        <Skeleton square className="w-full rounded-[10px]" />

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-7 w-[90%]" />
          <Skeleton className="h-3 w-2/3" />
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-3.5 w-full" />
          ))}
        </div>

        <div className="border-border rounded-card flex flex-col gap-2 border p-4">
          <Skeleton className="h-8 w-2/5" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-2 h-11 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </Box>
  );
}
