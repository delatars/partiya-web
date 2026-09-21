import { Button, Input, Tag } from "@partiya/ui";
import { useState } from "react";

import { AppLink, useAppNavigate } from "@/shared/ui";

/* Макет: .hero — тёмный блок с поиском и колонка «Как это работает» справа. */

const FACTS = [
  ["38", "фабрик с аудитом"],
  ["1 060", "предложений"],
  ["16 дней", "средний срок партии"],
  ["48,2 млн ₽", "прошло через эскроу"],
];

const STEPS = [
  ["Выберите предложение", "цена и MOQ — в выдаче"],
  ["Соберите партию", "объём, цвета, макет печати"],
  ["Оплатите в эскроу", "фабрика получит деньги после приёмки"],
  ["Следите за цехом", "проценты, фотоотчёты, чат с технологом"],
];

export function HeroSection() {
  const [query, setQuery] = useState("");
  const navigate = useAppNavigate();

  return (
    <section className="mt-3 grid gap-3 md:grid-cols-[1fr_320px]">
      <div className="rounded-card from-header to-header-hover bg-gradient-to-br px-5.5 py-5.5 text-white sm:px-9 sm:py-8">
        <Tag tone="disc">Свободная мощность −15 %</Tag>
        <h1 className="font-heading my-2.5 max-w-[20ch] text-2xl leading-[1.15] font-extrabold sm:text-[32px]">
          Произведите партию под своим брендом — от 200 штук
        </h1>
        <p className="max-w-[58ch] text-[15px] opacity-85">
          Ищите не завод, а продукт. Цена за штуку, минимальная партия и срок видны сразу. Деньги —
          в эскроу до приёмки.
        </p>

        <form
          role="search"
          className="my-5 flex max-w-[640px] flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ to: "/catalog", search: query.trim() ? { q: query.trim() } : {} });
          }}
        >
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Что произвести"
            placeholder="Например: худи оверсайз 300 шт с вышивкой"
            className="h-11 flex-1 border-0 text-[15px]"
          />
          <Button type="submit" variant="cta" size="lg">
            Найти производство
          </Button>
        </form>

        <dl className="flex flex-wrap gap-7">
          {FACTS.map(([value, label]) => (
            <div key={label}>
              <dt className="font-heading text-[22px] font-extrabold tracking-[-0.02em]">
                {value}
              </dt>
              <dd className="m-0 text-[12.5px] opacity-75">{label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <aside className="rounded-card bg-surface flex flex-col gap-3 p-5">
        <h2 className="font-heading text-sm font-bold">Как это работает</h2>
        <ol className="flex-1 list-none p-0">
          {STEPS.map(([title, note], index) => (
            <li key={title} className="relative pb-3 pl-8">
              <span
                aria-hidden="true"
                className="bg-action-soft text-action font-heading absolute top-0 left-0 grid size-5.5 place-items-center rounded-full text-xs font-bold"
              >
                {index + 1}
              </span>
              <b className="block text-[13.5px]">{title}</b>
              <span className="text-muted text-[12.5px]">{note}</span>
            </li>
          ))}
        </ol>
        <Button asChild wide>
          <AppLink to="/how-it-works">Подробнее</AppLink>
        </Button>
      </aside>
    </section>
  );
}
