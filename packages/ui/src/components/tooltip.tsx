import type { ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "../lib/utils";

/* В макете подсказок нет — тёмная плашка цвета ink, как у тоста.
   Подсказка не заменяет подпись: у триггера должно быть своё доступное имя. */

export type TooltipProviderProps = TooltipPrimitive.TooltipProviderProps;

export function TooltipProvider({ delayDuration = 200, ...props }: TooltipProviderProps) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

export type TooltipProps = Omit<TooltipPrimitive.TooltipProps, "children"> & {
  content: ReactNode;
  side?: TooltipPrimitive.TooltipContentProps["side"];
  align?: TooltipPrimitive.TooltipContentProps["align"];
  sideOffset?: number;
  className?: string;
  children: ReactNode;
};

export function Tooltip({
  content,
  side = "top",
  align = "center",
  sideOffset = 6,
  className,
  children,
  ...props
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            "rounded-control bg-text z-50 max-w-[280px] px-2.5 py-1.5 text-[12.5px] text-white",
            className,
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-text" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
