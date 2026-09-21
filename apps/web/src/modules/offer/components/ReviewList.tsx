import type { OfferReview } from "@partiya/api-contracts";
import { EmptyState, Rating, Skeleton } from "@partiya/ui";

/* Макет: .qa с рейтингом справа — отзывы под характеристиками. */

export function ReviewList({
  reviews,
  pending,
}: {
  reviews: readonly OfferReview[];
  pending?: boolean;
}) {
  if (pending) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-3">
        {[0, 1].map((index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        title="Отзывов пока нет"
        description="Отзыв можно оставить после приёмки партии — так его нельзя купить."
      />
    );
  }

  return (
    <div>
      {reviews.map((review) => (
        <article
          key={review.id}
          className="border-border border-b border-dashed py-2.5 text-[13.5px]"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <b>{review.author}</b>
            <Rating value={review.rating} meta={`· ${review.when}`} />
          </div>
          <p className="mt-1">{review.text}</p>
        </article>
      ))}
    </div>
  );
}
