import { Rating, Tag } from "@partiya/ui";

import { plural } from "@/shared/lib/plural";
import { AppLink } from "@/shared/ui";

/* Макет: .fac-row / .fac-tile — фабрики с аудитом. Данные придут из /factories,
   пока — список из макета. */

const FACTORIES = [
  { id: 17, name: "Волна", city: "Иваново", rating: 4.8, orders: 87, about: "швейное · с 2014" },
  {
    id: 52,
    name: "Невская нить",
    city: "Санкт-Петербург",
    rating: 4.7,
    orders: 52,
    about: "швейное · с 2015",
  },
  {
    id: 29,
    name: "Пошив37",
    city: "Иваново",
    rating: 4.7,
    orders: 64,
    about: "сумки, шоперы · с 2019",
  },
  { id: 21, name: "Ткань+", city: "Кострома", rating: 4.6, orders: 41, about: "трикотаж · с 2011" },
];

export function FactoryTiles() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {FACTORIES.map((factory) => (
        <AppLink
          key={factory.id}
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
              {factory.city} · {factory.about}
            </span>
            <Rating
              value={factory.rating}
              meta={`· ${String(factory.orders)} ${plural(factory.orders, ["заказ", "заказа", "заказов"])}`}
            />
          </span>
          <Tag tone="ok" className="absolute top-2.5 right-2.5">
            аудит
          </Tag>
        </AppLink>
      ))}
    </div>
  );
}
