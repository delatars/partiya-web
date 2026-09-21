import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";

import { cn } from "../lib/utils";

/* Макет: .toast — тёмная плашка с цветной полосой слева; .toasts — стопка справа внизу */
const toastVariants = cva(
  "rounded-control bg-text flex items-start justify-between gap-3 border-l-4 px-3.5 py-2.5 text-[13.5px] text-white",
  {
    variants: {
      tone: {
        info: "border-l-action",
        ok: "border-l-success",
        bad: "border-l-danger",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

export type ToastProviderProps = ToastPrimitive.ToastProviderProps;

export function ToastProvider({ swipeDirection = "right", ...props }: ToastProviderProps) {
  return <ToastPrimitive.Provider swipeDirection={swipeDirection} {...props} />;
}

export type ToastViewportProps = ToastPrimitive.ToastViewportProps;

export function ToastViewport({ className, ...props }: ToastViewportProps) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        "fixed right-4 bottom-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-1.5 outline-none",
        className,
      )}
      {...props}
    />
  );
}

export type ToastProps = ToastPrimitive.ToastProps & VariantProps<typeof toastVariants>;

export function Toast({ className, tone, ...props }: ToastProps) {
  return <ToastPrimitive.Root className={cn(toastVariants({ tone }), className)} {...props} />;
}

export type ToastTitleProps = ToastPrimitive.ToastTitleProps;

export function ToastTitle({ className, ...props }: ToastTitleProps) {
  return <ToastPrimitive.Title className={cn("font-medium", className)} {...props} />;
}

export type ToastDescriptionProps = ToastPrimitive.ToastDescriptionProps;

export function ToastDescription({ className, ...props }: ToastDescriptionProps) {
  return (
    <ToastPrimitive.Description className={cn("mt-0.5 text-white/75", className)} {...props} />
  );
}

export type ToastActionProps = ToastPrimitive.ToastActionProps;

export function ToastAction({ className, ...props }: ToastActionProps) {
  return (
    <ToastPrimitive.Action
      className={cn(
        "text-action-on-dark flex-none font-medium underline-offset-2 hover:underline",
        className,
      )}
      {...props}
    />
  );
}

export type ToastCloseProps = ToastPrimitive.ToastCloseProps;

export function ToastClose({ className, children, ...props }: ToastCloseProps) {
  return (
    <ToastPrimitive.Close
      aria-label="Закрыть"
      className={cn("flex-none text-white/60 transition-colors hover:text-white", className)}
      {...props}
    >
      {children ?? <X aria-hidden="true" className="size-4" />}
    </ToastPrimitive.Close>
  );
}
