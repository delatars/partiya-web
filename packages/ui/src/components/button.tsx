import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { Slot } from "radix-ui";

import { cn } from "../lib/utils";

/* Макет: .btn / .btn.cta / .btn.ghost / .sm / .lg / .wide */
const buttonVariants = cva(
  "rounded-control inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "bg-subtle text-text hover:bg-border",
        cta: "bg-action hover:bg-action-hover text-white",
        ghost: "border-border-strong text-text hover:bg-subtle border bg-transparent",
      },
      size: {
        sm: "px-2.5 py-1.5 text-[12.5px]",
        md: "px-3.5 py-2 text-sm",
        lg: "px-5 py-3 text-[15px] font-bold",
      },
      wide: { true: "w-full" },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Отдать вид кнопки ссылке — своей <a href> или ссылке роутера. Роутер в ui не тянем. */
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  wide,
  asChild,
  type = "button",
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot.Root className={cn(buttonVariants({ variant, size, wide }), className)} {...props} />
    );
  }

  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, wide }), className)}
      {...props}
    />
  );
}
