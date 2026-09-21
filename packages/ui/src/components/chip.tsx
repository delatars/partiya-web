import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../lib/utils";

/* Макет: .chip — пилюля-фильтр; .chip.on — выбранный, акцентная заливка.
   Активные фильтры в макете заканчиваются «×»: клик по чипу снимает фильтр. */
const chipVariants = cva(
  "rounded-full border-border-strong bg-surface hover:border-action-hover inline-flex items-center gap-1 border px-[11px] py-[5px] text-[12.5px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-45",
  {
    variants: {
      on: { true: "bg-action-soft border-action text-action" },
    },
  },
);

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof chipVariants> & {
    /** Чип-фильтр: клик снимает фильтр, рядом с текстом появляется «×» */
    onRemove?: () => void;
    /** Доступное имя такого чипа, например «Убрать фильтр: MOQ до 500» */
    removeLabel?: string;
  };

export function Chip({
  className,
  on,
  onRemove,
  removeLabel,
  onClick,
  children,
  type = "button",
  ...props
}: ChipProps) {
  // aria-pressed только у переключателей: у чипа-фильтра нажатого состояния нет
  const pressed = onRemove === undefined && on !== undefined ? on === true : undefined;

  return (
    <button
      type={type}
      aria-pressed={pressed}
      aria-label={onRemove ? removeLabel : undefined}
      onClick={onRemove ? () => onRemove() : onClick}
      className={cn(chipVariants({ on }), className)}
      {...props}
    >
      {children}
      {onRemove && <X aria-hidden="true" className="size-3.5 opacity-70" />}
    </button>
  );
}
