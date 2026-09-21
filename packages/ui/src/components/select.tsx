import { ChevronDown, ChevronUp, Check } from "lucide-react";
import type { ReactNode } from "react";
import { Select as SelectPrimitive } from "radix-ui";

import { cn } from "../lib/utils";
import { mergeDescribedBy, useFieldControl } from "./field";
import { controlVariants } from "./input";

/* Макет: .fld select / .buy select — вид как у input, поведение и клавиатура от radix */

export type SelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  invalid?: boolean;
  size?: "sm" | "md";
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  children: ReactNode;
};

export function Select({
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen,
  onOpenChange,
  placeholder,
  disabled,
  required,
  name,
  id,
  invalid,
  size,
  className,
  contentClassName,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
  children,
}: SelectProps) {
  const field = useFieldControl();
  const isInvalid = invalid ?? field?.invalid;

  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      disabled={disabled}
      required={required ?? field?.required}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id ?? field?.id}
        aria-label={ariaLabel}
        aria-describedby={mergeDescribedBy(describedBy, field?.describedBy)}
        aria-invalid={isInvalid || undefined}
        className={cn(
          controlVariants({ size, invalid: isInvalid }),
          "data-[placeholder]:text-muted flex items-center justify-between gap-2 text-left",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown aria-hidden="true" className="text-muted size-4 flex-none" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "bg-surface rounded-control border-border z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden border shadow-[0_12px_32px_-12px_rgba(20,26,36,0.35)]",
            contentClassName,
          )}
        >
          <SelectPrimitive.ScrollUpButton className="text-muted flex h-6 items-center justify-center">
            <ChevronUp aria-hidden="true" className="size-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="text-muted flex h-6 items-center justify-center">
            <ChevronDown aria-hidden="true" className="size-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export type SelectItemProps = SelectPrimitive.SelectItemProps;

export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "rounded-control data-[highlighted]:bg-subtle data-[state=checked]:text-action relative flex cursor-default items-center py-1.5 pr-2 pl-7 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 grid place-items-center">
        <SelectPrimitive.ItemIndicator>
          <Check aria-hidden="true" className="size-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export type SelectSeparatorProps = SelectPrimitive.SelectSeparatorProps;

export function SelectSeparator({ className, ...props }: SelectSeparatorProps) {
  return <SelectPrimitive.Separator className={cn("bg-border my-1 h-px", className)} {...props} />;
}
