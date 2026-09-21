import { cva, type VariantProps } from "class-variance-authority";
import type { InputHTMLAttributes } from "react";

import { cn } from "../lib/utils";
import { mergeDescribedBy, useFieldControl } from "./field";

/* Макет: .inp / .fld input / .buy input — рамка line-2, фокус: синяя рамка + мягкий контур

   Про `:read-only`. Этой псевдоклассом нельзя пользоваться в общей базе: по спецификации
   он матчит ЛЮБОЙ нередактируемый элемент, включая `<button>`, а на кнопке построен
   триггер Select. Из-за этого каждый селект приложения выглядел серым, как отключённый.
   Поэтому «только для чтения» живёт в `readOnlyVariants` и навешивается на те контролы,
   у которых атрибут `readonly` вообще бывает: Input и Textarea. */
export const controlVariants = cva(
  "rounded-control border-border-strong bg-surface text-text placeholder:text-muted focus:border-action focus:outline-action-soft w-full border transition-colors focus:outline-2 disabled:cursor-not-allowed disabled:opacity-45",
  {
    variants: {
      size: {
        sm: "px-2 py-[5px] text-[13px]",
        md: "px-2.5 py-2 text-sm",
      },
      invalid: {
        true: "border-danger bg-danger-soft focus:border-danger focus:outline-danger-soft",
      },
      numeric: { true: "num" },
    },
    defaultVariants: { size: "md" },
  },
);

/** Поле только для чтения: приглушённая заливка. Применимо к input и textarea. */
export const readOnlyVariants = "read-only:bg-subtle read-only:text-muted";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> &
  VariantProps<typeof controlVariants>;

export function Input({
  className,
  size,
  invalid,
  numeric,
  id,
  "aria-describedby": describedBy,
  ...props
}: InputProps) {
  const field = useFieldControl();
  const isInvalid = invalid ?? field?.invalid;

  return (
    <input
      id={id ?? field?.id}
      aria-describedby={mergeDescribedBy(describedBy, field?.describedBy)}
      aria-invalid={isInvalid || undefined}
      aria-required={field?.required || undefined}
      className={cn(
        controlVariants({ size, invalid: isInvalid, numeric }),
        readOnlyVariants,
        className,
      )}
      {...props}
    />
  );
}
