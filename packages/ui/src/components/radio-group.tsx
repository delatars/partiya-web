import { useId, type ReactNode } from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "../lib/utils";
import { mergeDescribedBy, useFieldControl } from "./field";

/* Макет: .pick / .filters label — кружок 16px, выбранный с синей точкой */

export type RadioGroupProps = RadioGroupPrimitive.RadioGroupProps;

export function RadioGroup({
  className,
  "aria-describedby": describedBy,
  ...props
}: RadioGroupProps) {
  const field = useFieldControl();

  return (
    <RadioGroupPrimitive.Root
      aria-describedby={mergeDescribedBy(describedBy, field?.describedBy)}
      className={cn(
        "flex gap-2 data-[orientation=vertical]:flex-col data-[orientation=vertical]:gap-1",
        className,
      )}
      {...props}
    />
  );
}

export type RadioProps = Omit<RadioGroupPrimitive.RadioGroupItemProps, "children"> & {
  label?: ReactNode;
  hint?: ReactNode;
  labelClassName?: string;
  rowClassName?: string;
};

export function Radio({
  className,
  label,
  hint,
  labelClassName,
  rowClassName,
  id,
  ...props
}: RadioProps) {
  const uid = useId();
  const controlId = id ?? uid;

  const control = (
    <RadioGroupPrimitive.Item
      id={controlId}
      className={cn(
        "border-border-strong bg-surface data-[state=checked]:border-action grid size-4 flex-none place-items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="bg-action block size-2 rounded-full" />
    </RadioGroupPrimitive.Item>
  );

  if (label === undefined || label === null) return control;

  return (
    <div className={cn("flex items-center gap-2 py-1", rowClassName)}>
      {control}
      <label htmlFor={controlId} className={cn("cursor-pointer text-[13.5px]", labelClassName)}>
        {label}
      </label>
      {hint !== undefined && hint !== null && (
        <span className="text-muted ml-auto text-xs">{hint}</span>
      )}
    </div>
  );
}
