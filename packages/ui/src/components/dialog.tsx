import { X } from "lucide-react";
import type { HTMLAttributes } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "../lib/utils";

/* В макете диалогов нет — берём язык .box: белая панель, радиус 10, подложка цвета ink.
   Фокус-ловушка, Esc и возврат фокуса — от radix. */

const sizeClass = {
  sm: "max-w-[420px]",
  md: "max-w-[560px]",
  lg: "max-w-[760px]",
} as const;

export type DialogProps = DialogPrimitive.DialogProps;

export function Dialog(props: DialogProps) {
  return <DialogPrimitive.Root {...props} />;
}

export type DialogTriggerProps = DialogPrimitive.DialogTriggerProps;

export function DialogTrigger(props: DialogTriggerProps) {
  return <DialogPrimitive.Trigger {...props} />;
}

export type DialogCloseProps = DialogPrimitive.DialogCloseProps;

export function DialogClose(props: DialogCloseProps) {
  return <DialogPrimitive.Close {...props} />;
}

export type DialogContentProps = DialogPrimitive.DialogContentProps & {
  size?: keyof typeof sizeClass;
  /** Крестик в правом верхнем углу */
  showClose?: boolean;
  closeLabel?: string;
  overlayClassName?: string;
};

export function DialogContent({
  className,
  overlayClassName,
  size = "md",
  showClose = true,
  closeLabel = "Закрыть",
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={cn("bg-text/45 fixed inset-0 z-50", overlayClassName)} />
      <DialogPrimitive.Content
        className={cn(
          "bg-surface rounded-card fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-5 shadow-[0_24px_60px_-20px_rgba(20,26,36,0.45)] outline-none",
          sizeClass[size],
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="text-muted hover:bg-subtle hover:text-text rounded-control absolute top-3 right-3 grid size-7 place-items-center transition-colors"
          >
            <X aria-hidden="true" className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export type DialogTitleProps = DialogPrimitive.DialogTitleProps;

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      className={cn("font-heading pr-8 text-lg font-bold", className)}
      {...props}
    />
  );
}

export type DialogDescriptionProps = DialogPrimitive.DialogDescriptionProps;

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return <DialogPrimitive.Description className={cn("text-muted mt-1", className)} {...props} />;
}

export type DialogFooterProps = HTMLAttributes<HTMLDivElement>;

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn("mt-4 flex flex-wrap items-center justify-end gap-2", className)}
      {...props}
    />
  );
}
