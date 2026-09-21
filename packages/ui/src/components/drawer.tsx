import { X } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { Dialog as DialogPrimitive, VisuallyHidden } from "radix-ui";

import { cn } from "../lib/utils";

/* Макет: .sheet — шторка снизу с «хваталкой» (мобильные фильтры).
   Боковые варианты нужны на планшете; всё на radix Dialog. */

const sideClass = {
  bottom:
    "inset-x-0 bottom-0 max-h-[85vh] rounded-t-[18px] px-4 pt-2 pb-4 shadow-[0_-10px_30px_rgba(0,0,0,0.25)]",
  left: "inset-y-0 left-0 w-[min(360px,90vw)] p-4 shadow-[10px_0_30px_rgba(0,0,0,0.25)]",
  right: "inset-y-0 right-0 w-[min(360px,90vw)] p-4 shadow-[-10px_0_30px_rgba(0,0,0,0.25)]",
} as const;

export type DrawerProps = DialogPrimitive.DialogProps;

export function Drawer(props: DrawerProps) {
  return <DialogPrimitive.Root {...props} />;
}

export type DrawerTriggerProps = DialogPrimitive.DialogTriggerProps;

export function DrawerTrigger(props: DrawerTriggerProps) {
  return <DialogPrimitive.Trigger {...props} />;
}

export type DrawerCloseProps = DialogPrimitive.DialogCloseProps;

export function DrawerClose(props: DrawerCloseProps) {
  return <DialogPrimitive.Close {...props} />;
}

export type DrawerTitleProps = DialogPrimitive.DialogTitleProps;

export function DrawerTitle({ className, ...props }: DrawerTitleProps) {
  return (
    <DialogPrimitive.Title
      className={cn("font-heading text-base font-bold", className)}
      {...props}
    />
  );
}

export type DrawerDescriptionProps = DialogPrimitive.DialogDescriptionProps;

export function DrawerDescription({ className, ...props }: DrawerDescriptionProps) {
  return <DialogPrimitive.Description className={cn("text-muted", className)} {...props} />;
}

export type DrawerContentProps = DialogPrimitive.DialogContentProps & {
  side?: keyof typeof sideClass;
  /** Заголовок шторки. Обязателен для скринридера: скрыть — titleHidden */
  title: ReactNode;
  titleHidden?: boolean;
  /** Закреплённая снизу строка действий: «Показать 128» */
  footer?: ReactNode;
  closeLabel?: string;
  overlayClassName?: string;
};

export function DrawerContent({
  className,
  overlayClassName,
  side = "bottom",
  title,
  titleHidden,
  footer,
  closeLabel = "Закрыть",
  children,
  ...props
}: DrawerContentProps) {
  const heading = <DrawerTitle>{title}</DrawerTitle>;

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={cn("bg-text/45 fixed inset-0 z-50", overlayClassName)} />
      <DialogPrimitive.Content
        className={cn(
          "bg-surface fixed z-50 flex flex-col outline-none",
          sideClass[side],
          className,
        )}
        {...props}
      >
        {side === "bottom" && (
          <div aria-hidden="true" className="bg-border-strong mx-auto mb-2.5 h-1 w-9 rounded-sm" />
        )}
        <div className="flex flex-none items-center gap-3">
          {titleHidden ? <VisuallyHidden.Root>{heading}</VisuallyHidden.Root> : heading}
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="text-muted hover:bg-subtle hover:text-text rounded-control ml-auto grid size-7 flex-none place-items-center transition-colors"
          >
            <X aria-hidden="true" className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer !== undefined && footer !== null && (
          <div className="border-border mt-3 flex-none border-t pt-3">{footer}</div>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export type DrawerFooterProps = HTMLAttributes<HTMLDivElement>;

export function DrawerFooter({ className, ...props }: DrawerFooterProps) {
  return <div className={cn("flex items-center gap-2", className)} {...props} />;
}
