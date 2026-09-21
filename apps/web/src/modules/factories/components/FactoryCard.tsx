import type { FactorySummary } from "@partiya/api-contracts";
import { Rating, Tag } from "@partiya/ui";

import { formatNumber } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import { AppLink } from "@/shared/ui";

/* Макет: .fac-tile — плитка завода из главной, она же карточка списка заводов. */

export function FactoryCard({ factory }: { factory: FactorySummary }) {
  const offers = factory.offersCount;

  return (
    <AppLink
      to={`/factory/${String(factory.id)}`}
      className="rounded-card bg-surface hover:shadow-card-hover relative flex items-center gap-2.5 p-3.5 transition-shadow"
    >
      <span
        aria-hidden="true"
        className="bg-header font-heading grid size-11 shrink-0 place-items-center rounded-full text-[17px] font-bold text-white"
      >
        {factory.name.slice(0, 1)}
      </span>
      <span className="flex min-w-0 flex-col gap-0.25">
        <b>«{factory.name}»</b>
        <span className="text-muted text-[12.5px]">
          {factory.city}
          {factory.specialization ? ` · ${factory.specialization.toLowerCase()}` : ""}
          {factory.since === undefined ? "" : ` · с ${String(factory.since)}`}
        </span>
        <Rating
          value={factory.rating}
          meta={`· ${formatNumber(factory.completedOrders ?? 0)} ${plural(factory.completedOrders ?? 0, ["заказ", "заказа", "заказов"])}`}
        />
        <span className="text-muted text-[12.5px]">
          {formatNumber(offers)} {plural(offers, ["предложение", "предложения", "предложений"])} ·
          свободно{" "}
          <b className="text-text font-medium whitespace-nowrap">{factory.freeCapacityPct} %</b>
        </span>
      </span>
      {factory.auditedAt ? (
        <Tag tone="ok" className="absolute top-2.5 right-2.5">
          аудит
        </Tag>
      ) : null}
    </AppLink>
  );
}
