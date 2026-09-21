import { Check, Minus } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "../lib/utils";

/* Макет: .filters label — квадрат 16px, отмеченный заливается акцентом; справа счётчик */

export type CheckedState = CheckboxPrimitive.CheckedState;

export type CheckboxProps = Omit<CheckboxPrimitive.CheckboxProps, "children"> & {
  label?: ReactNode;
  /** Правая подпись строки фильтра — счётчик найденного */
  hint?: ReactNode;
  labelClassName?: string;
  rowClassName?: string;
};

export function Checkbox({
  className,
  label,
  hint,
  labelClassName,
  rowClassName,
  id,
  checked,
  ...props
}: CheckboxProps) {
  const uid = useId();
  const controlId = id ?? uid;

  const control = (
    <CheckboxPrimitive.Root
      id={controlId}
      checked={checked}
      className={cn(
        "border-border-strong bg-surface data-[state=checked]:border-action data-[state=checked]:bg-action data-[state=indeterminate]:border-action data-[state=indeterminate]:bg-action grid size-4 flex-none place-items-center rounded-[4px] border transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-items-center text-white">
        {checked === "indeterminate" ? (
          <Minus aria-hidden="true" className="size-3" strokeWidth={3} />
        ) : (
          <Check aria-hidden="true" className="size-3" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
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
