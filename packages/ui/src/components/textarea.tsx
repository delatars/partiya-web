import type { VariantProps } from "class-variance-authority";
import type { TextareaHTMLAttributes } from "react";

import { cn } from "../lib/utils";
import { mergeDescribedBy, useFieldControl } from "./field";
import { controlVariants, readOnlyVariants } from "./input";

/* Макет: .fld textarea / textarea.inp — та же рамка, тянется только по высоте */
export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  Pick<VariantProps<typeof controlVariants>, "size" | "invalid">;

export function Textarea({
  className,
  size,
  invalid,
  id,
  rows = 3,
  "aria-describedby": describedBy,
  ...props
}: TextareaProps) {
  const field = useFieldControl();
  const isInvalid = invalid ?? field?.invalid;

  return (
    <textarea
      id={id ?? field?.id}
      rows={rows}
      aria-describedby={mergeDescribedBy(describedBy, field?.describedBy)}
      aria-invalid={isInvalid || undefined}
      aria-required={field?.required || undefined}
      className={cn(
        controlVariants({ size, invalid: isInvalid }),
        readOnlyVariants,
        "resize-y",
        className,
      )}
      {...props}
    />
  );
}
