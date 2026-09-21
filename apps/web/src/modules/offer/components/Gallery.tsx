import type { OfferImage } from "@partiya/api-contracts";
import { cn, Placeholder } from "@partiya/ui";
import { useState } from "react";

/* Макет: .thumbs + .main-ph — колонка миниатюр слева и главное фото.
   Фотографий пока нет: и миниатюры, и главное фото — градиентные заглушки .ph A–D.
   Колонка миниатюр в макете прячется ниже 1100 px, поэтому под ней дублируется
   горизонтальная лента — иначе на планшете к остальным ракурсам не добраться. */

export function Gallery({ images }: { images: readonly OfferImage[] }) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];

  if (!main) {
    return <Placeholder square radius="card" label="фото" className="w-full" />;
  }

  const thumbs = images.map((image, index) => (
    <button
      key={image.id}
      type="button"
      onClick={() => setActive(index)}
      aria-label={image.label}
      aria-current={index === active ? "true" : undefined}
      className={cn(
        "rounded-control block overflow-hidden border-2 border-transparent",
        index === active && "border-action",
      )}
    >
      <Placeholder tone={image.tone} square className="w-full" />
    </button>
  ));

  return (
    <>
      <div className="hidden w-[70px] flex-col gap-1.5 lg:flex">{thumbs}</div>

      <div className="min-w-0">
        <Placeholder tone={main.tone} square radius="card" label={main.label} className="w-full" />
        {/* лента миниатюр вместо колонки — на экранах, где колонка спрятана */}
        <div className="mt-1.5 grid grid-cols-5 gap-1.5 lg:hidden">{thumbs}</div>
      </div>
    </>
  );
}
