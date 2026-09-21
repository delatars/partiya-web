import type { OfferSummary } from "@partiya/api-contracts";
import { Skeleton } from "@partiya/ui";

import { OfferCard } from "@/shared/ui";

/* Макет: .similar — «Похожие предложения», шесть карточек в ряд на широком экране. */

export function SimilarRow({
  offers,
  pending,
}: {
  offers: readonly OfferSummary[];
  pending?: boolean;
}) {
  if (!pending && offers.length === 0) return null;

  return (
    <>
      <h2 className="font-heading mt-5 mb-2.5 text-lg font-bold">Похожие предложения</h2>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6">
        {pending
          ? Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="rounded-card bg-surface overflow-hidden">
                <Skeleton square />
                <div className="flex flex-col gap-1.5 p-3">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-3 w-[90%]" />
                  <Skeleton className="h-3 w-[60%]" />
                </div>
              </div>
            ))
          : offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
      </div>
    </>
  );
}
