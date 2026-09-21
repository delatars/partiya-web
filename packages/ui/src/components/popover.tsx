import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "../lib/utils";

/* В макете поповера нет — язык .box с рамкой: сортировки, доп. фильтры, меню профиля */

export type PopoverProps = PopoverPrimitive.PopoverProps;

export function Popover(props: PopoverProps) {
  return <PopoverPrimitive.Root {...props} />;
}

export type PopoverTriggerProps = PopoverPrimitive.PopoverTriggerProps;

export function PopoverTrigger(props: PopoverTriggerProps) {
  return <PopoverPrimitive.Trigger {...props} />;
}

export type PopoverCloseProps = PopoverPrimitive.PopoverCloseProps;

export function PopoverClose(props: PopoverCloseProps) {
  return <PopoverPrimitive.Close {...props} />;
}

export type PopoverContentProps = PopoverPrimitive.PopoverContentProps & {
  /** Уголок-указатель на триггер */
  arrow?: boolean;
};

export function PopoverContent({
  className,
  arrow,
  sideOffset = 6,
  children,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "bg-surface rounded-card border-border z-50 max-w-[calc(100vw-2rem)] border p-3.5 text-[13.5px] shadow-[0_12px_32px_-12px_rgba(20,26,36,0.35)] outline-none",
          className,
        )}
        {...props}
      >
        {children}
        {arrow && <PopoverPrimitive.Arrow className="fill-surface" />}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}
