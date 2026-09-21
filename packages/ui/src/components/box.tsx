import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../lib/utils";

/* Макет: .box — белая панель 10px радиуса; .buy — то же, но с рамкой */
const boxVariants = cva("bg-surface rounded-card", {
  variants: {
    padding: { none: "", sm: "p-3", md: "p-4", lg: "p-5" },
    bordered: { true: "border-border border" },
  },
  defaultVariants: { padding: "md" },
});

export type BoxProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof boxVariants>;

export function Box({ className, padding, bordered, ...props }: BoxProps) {
  return <div className={cn(boxVariants({ padding, bordered }), className)} {...props} />;
}
