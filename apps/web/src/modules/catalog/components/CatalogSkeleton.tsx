import { Skeleton } from "@partiya/ui";

/* Макет: экран state-loading — скелетоны панели фильтров и карточек выдачи. */

export function FiltersSkeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2].map((group) => (
        <div key={group} className="mb-4.5">
          <Skeleton className="mb-2.5 h-3.5 w-1/2" />
          <Skeleton className="mb-1.5 h-3 w-full" />
          <Skeleton className="mb-1.5 h-3 w-4/5" />
          <Skeleton className="h-3 w-[90%]" />
        </div>
      ))}
    </div>
  );
}

export function OfferGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Загружаем предложения"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-card bg-surface overflow-hidden">
          <Skeleton square />
          <div className="flex flex-col gap-1.5 p-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-[90%]" />
            <Skeleton className="h-3 w-[70%]" />
            <Skeleton className="h-3 w-[60%]" />
            <Skeleton className="mt-2 h-8.5 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
