import { useId, type ReactNode } from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "../lib/utils";

/* Макет: .toggle — дорожка 30×16, включённая зелёная (успех, а не акцент) */

export type ToggleProps = Omit<SwitchPrimitive.SwitchProps, "children"> & {
  label?: ReactNode;
  labelClassName?: string;
  rowClassName?: string;
};

export function Toggle({
  className,
  label,
  labelClassName,
  rowClassName,
  id,
  ...props
}: ToggleProps) {
  const uid = useId();
  const controlId = id ?? uid;

  const control = (
    <SwitchPrimitive.Root
      id={controlId}
      className={cn(
        "bg-border-strong data-[state=checked]:bg-success relative inline-flex h-4 w-[30px] flex-none items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-3 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-4" />
    </SwitchPrimitive.Root>
  );

  if (label === undefined || label === null) return control;

  return (
    <div className={cn("flex items-center gap-2", rowClassName)}>
      {control}
      <label htmlFor={controlId} className={cn("cursor-pointer text-[13.5px]", labelClassName)}>
        {label}
      </label>
    </div>
  );
}
