import type { OfferSummary } from "@partiya/api-contracts";
import { Button, cn, Placeholder, Price, Rating } from "@partiya/ui";
import { ArrowLeftRight, Heart } from "lucide-react";

import { formatNumber, formatRub, toRubles } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import { OfferBadges } from "@/shared/ui/offer-badges";
import { useOfferListActions } from "@/shared/ui/offer-actions";
import { AppLink } from "@/shared/ui/router-link";

/* Макет: .card — карточка оффера в сетке каталога и в подборках главной. */

const actionClass =
  "grid size-7 place-items-center rounded-control bg-white/92 text-muted transition-colors hover:text-text";

export function OfferCard({ offer }: { offer: OfferSummary }) {
  const actions = useOfferListActions(offer);
  const href = `/offer/${String(offer.id)}`;
  // число заказов — факт с сервера (`completedOrders`), а не догадка по отзывам (Q-165):
  // нет поля — не показываем, «88 заказов» при настоящих 87 хуже пустоты
  const orders = offer.factory.completedOrders;

  return (
    <article className="rounded-card bg-surface hover:shadow-card-hover flex flex-col overflow-hidden transition-shadow">
      <Placeholder tone={offer.tone ?? "a"} square label="фото">
        <OfferBadges
          badges={offer.badges}
          className="absolute top-2 left-2 flex flex-col items-start gap-1"
        />
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={actions.toggleCompare}
            aria-pressed={actions.compared}
            aria-label={actions.compared ? "Убрать из сравнения" : "Добавить в сравнение"}
            title={actions.compareFull ? "В сравнении уже 4 позиции" : undefined}
            disabled={actions.compareFull}
            className={cn(actionClass, actions.compared && "bg-action-soft text-action")}
          >
            <ArrowLeftRight aria-hidden="true" className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={actions.toggleFavorite}
            aria-pressed={actions.favorite}
            aria-label={actions.favorite ? "Убрать из избранного" : "В избранное"}
            className={cn(actionClass, actions.favorite && "bg-danger-soft text-danger")}
          >
            <Heart
              aria-hidden="true"
              className={cn("size-3.5", actions.favorite && "fill-current")}
            />
          </button>
        </div>
      </Placeholder>

      <div className="flex flex-1 flex-col gap-[5px] px-3 pt-2.5 pb-3">
        <div className="flex items-baseline gap-1.5">
          <Price className="text-[19px]" value={toRubles(offer.priceFrom)} />
          {offer.priceOld === undefined ? null : <Price old value={toRubles(offer.priceOld)} />}
          <span className="text-muted text-[12.5px]">/шт от {formatNumber(offer.moq)}</span>
        </div>

        <AppLink to={href} className="line-clamp-2 h-[2.7em] text-[13.5px] leading-[1.35]">
          {offer.title}
        </AppLink>

        <Rating
          className="flex-wrap"
          value={offer.factory.rating}
          meta={[
            `· ${formatNumber(offer.factory.reviews)} ${plural(offer.factory.reviews, ["отзыв", "отзыва", "отзывов"])}`,
            orders === undefined
              ? undefined
              : `· ${formatNumber(orders)} ${plural(orders, ["заказ", "заказа", "заказов"])}`,
          ]
            .filter(Boolean)
            .join(" ")}
        />

        {/* whitespace-nowrap: «38» и «%» — одно значение, перенос между ними читается как обрыв */}
        <p className="text-muted text-xs">
          MOQ <b className="text-text font-medium">{formatNumber(offer.moq)}</b> · срок{" "}
          <b className="text-text font-medium whitespace-nowrap">от {offer.leadDaysMin} дн.</b> ·
          свободно{" "}
          <b className="text-text font-medium whitespace-nowrap">{offer.freeCapacityPct} %</b>
        </p>

        <p className="text-muted text-xs">
          <AppLink
            to={`/factory/${String(offer.factory.id)}`}
            className="text-text font-medium hover:underline"
          >
            «{offer.factory.name}»
          </AppLink>
          , {offer.factory.city}
        </p>

        <p className={cn("text-xs font-medium", offer.sample ? "text-warning" : "text-muted")}>
          {offer.sample
            ? `Образец за ${formatRub(offer.sample.price)} · ${String(offer.sample.days)} ${plural(offer.sample.days, ["день", "дня", "дней"])}`
            : "Образец недоступен"}
        </p>

        <Button asChild variant="cta" className="mt-auto">
          <AppLink to={href}>Рассчитать партию</AppLink>
        </Button>
      </div>
    </article>
  );
}
