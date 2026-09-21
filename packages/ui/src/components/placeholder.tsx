import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/utils";

/* Макет: .ph.A–D — градиентная заглушка вместо фото. Поверх неё кладут бейджи
   и кнопки действий, поэтому дети рендерятся абсолютным слоем поверх подписи. */
const placeholderVariants = cva(
  "text-black/35 relative grid place-items-center text-[10px] font-bold tracking-[0.06em] uppercase",
  {
    variants: {
      tone: { a: "ph-a", b: "ph-b", c: "ph-c", d: "ph-d" },
      square: { true: "aspect-square" },
      radius: { none: "", control: "rounded-control", card: "rounded-card" },
    },
    defaultVariants: { tone: "a", radius: "none" },
  },
);

export type PlaceholderProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof placeholderVariants> & {
    /** Подпись по центру заглушки — «фото», «схема» */
    label?: ReactNode;
  };

export function Placeholder({
  className,
  tone,
  square,
  radius,
  label,
  children,
  ...props
}: PlaceholderProps) {
  return (
    <div
      className={cn(placeholderVariants({ tone, square, radius }), "overflow-hidden", className)}
      {...props}
    >
      {label}
      {children}
    </div>
  );
}
