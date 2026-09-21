import { Button, Tag } from "@partiya/ui";

import { AppLink } from "@/shared/ui";

/* Макет: .promo-band — сиреневая полоса со скидкой на недозагруженные линии. */
export function PromoBand() {
  return (
    <section className="rounded-card bg-discount-soft mt-5 flex flex-wrap items-center justify-between gap-5 px-6.5 py-5.5">
      <div>
        <Tag tone="disc">−15 %</Tag>
        <h2 className="font-heading mt-2 mb-1 text-lg font-bold">
          Недозагруженные линии на октябрь
        </h2>
        <p className="text-muted max-w-[60ch]">
          Фабрики дают скидку на свободные недели. Срок тот же, аудит пройден, эскроу работает.
        </p>
      </div>
      <Button asChild variant="cta" size="lg">
        <AppLink to="/catalog" search={{ trust: "free" }}>
          Смотреть 112 предложений
        </AppLink>
      </Button>
    </section>
  );
}
