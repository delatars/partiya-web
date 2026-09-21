import type { OfferSummary } from "@partiya/api-contracts";
import { Button, cn, MiniBar, Placeholder, Rating } from "@partiya/ui";
import { ArrowLeftRight, Heart } from "lucide-react";

import { formatNumber, formatRub } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import { OfferBadges } from "@/shared/ui/offer-badges";
import { useOfferListActions } from "@/shared/ui/offer-actions";
import { AppLink } from "@/shared/ui/router-link";

/* Макет: .rowc — строка выдачи в режиме списка (экран catalog-list).
   Ступени цены прячутся ниже 1100 px, метаданные и действия переносятся — как в макете. */

export function OfferRow({ offer }: { offer: OfferSummary }) {
  const actions = useOfferListActions(offer);
  const href = `/offer/${String(offer.id)}`;
  const tiers = offer.tiers ?? [];

  return (
    <article className="rounded-card bg-surface grid grid-cols-[72px_1fr] items-center gap-4 p-3 md:grid-cols-[100px_1fr_190px] lg:grid-cols-[120px_1.5fr_240px_190px_140px]">
      <AppLink to={href} aria-label={offer.title}>
        <Placeholder
          tone={offer.tone ?? "a"}
          radius="control"
          label="фото"
          className="size-18 md:size-25 lg:size-30"
        />
      </AppLink>

      <div className="flex min-w-0 flex-col gap-1">
        <OfferBadges badges={offer.badges} className="flex flex-wrap gap-1.5" />
        <AppLink to={href} className="text-[15px] font-medium">
          {offer.title}
        </AppLink>
        {offer.material ? <p className="text-muted text-[12.5px]">{offer.material}</p> : null}
        <p className="text-muted text-xs">
          <AppLink
            to={`/factory/${String(offer.factory.id)}`}
            className="text-text font-medium hover:underline"
          >
            «{offer.factory.name}»
          </AppLink>
          , {offer.factory.city} ·{" "}
          <Rating
            value={offer.factory.rating}
            meta={`· ${formatNumber(offer.factory.reviews)} ${plural(offer.factory.reviews, ["отзыв", "отзыва", "отзывов"])}`}
          />
        </p>
      </div>

      <div className="hidden grid-cols-3 gap-1 lg:grid">
        {tiers.map((tier, index) => (
          <div
            // ступени могут начинаться с одного объёма (MOQ 1 000 и ступень «от 1 000»)
            key={index}
            className={cn(
              "border-border rounded-control text-muted border px-2 py-1.5 text-[11.5px]",
              index === tiers.length - 1 && "border-action bg-action-soft",
            )}
          >
            <b className="font-heading text-text block text-[15px] font-extrabold">
              {formatRub(tier.unitPrice)}
            </b>
            от {formatNumber(tier.fromQty)}
          </div>
        ))}
      </div>

      <div className="col-span-2 flex flex-col gap-0.75 text-[12.5px] md:col-span-1">
        <div>
          MOQ <b className="num font-medium whitespace-nowrap">{formatNumber(offer.moq)} шт</b>
        </div>
        <div>
          Срок <b className="font-medium whitespace-nowrap">от {offer.leadDaysMin} дн.</b>
        </div>
        <div>
          {/* «38» и «%» — одно значение, переносить между ними нечего */}
          Свободно <b className="font-medium whitespace-nowrap">{offer.freeCapacityPct} %</b>
          <MiniBar className="ml-1.5" value={offer.freeCapacityPct} />
        </div>
        <div className={offer.sample ? "text-warning font-medium" : "text-muted"}>
          {offer.sample ? `Образец ${formatRub(offer.sample.price)}` : "Образец недоступен"}
        </div>
      </div>

      <div className="col-span-2 flex flex-col gap-1.5 md:col-start-2 md:flex-row md:justify-end lg:col-span-1 lg:col-start-auto lg:flex-col">
        <Button asChild variant="cta">
          <AppLink to={href}>Рассчитать</AppLink>
        </Button>
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.toggleCompare}
            aria-pressed={actions.compared}
            aria-label={actions.compared ? "Убрать из сравнения" : "Добавить в сравнение"}
            disabled={actions.compareFull}
            className={cn(actions.compared && "border-action bg-action-soft text-action")}
          >
            <ArrowLeftRight aria-hidden="true" className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.toggleFavorite}
            aria-pressed={actions.favorite}
            aria-label={actions.favorite ? "Убрать из избранного" : "В избранное"}
            className={cn(actions.favorite && "border-danger bg-danger-soft text-danger")}
          >
            <Heart
              aria-hidden="true"
              className={cn("size-4", actions.favorite && "fill-current")}
            />
          </Button>
        </div>
      </div>
    </article>
  );
}
