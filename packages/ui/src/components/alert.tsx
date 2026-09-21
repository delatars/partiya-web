import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/utils";

/* Макет: alertBox — кружок-глиф, заголовок, текст под ним, действие справа */
const alertVariants = cva("rounded-card flex items-start gap-2.5 p-3 text-[13.5px]", {
  variants: {
    kind: {
      info: "bg-action-soft",
      warn: "bg-warning-soft",
      danger: "bg-danger-soft",
    },
  },
  defaultVariants: { kind: "info" },
});

const markVariants = cva(
  "font-heading mt-px grid size-[18px] flex-none place-items-center rounded-full text-[11px] font-bold text-white",
  {
    variants: {
      kind: { info: "bg-action", warn: "bg-warning", danger: "bg-danger" },
    },
    defaultVariants: { kind: "info" },
  },
);

export type AlertProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    title?: ReactNode;
    /** Кнопка или ссылка справа */
    action?: ReactNode;
  };

export function Alert({
  className,
  kind = "info",
  title,
  action,
  children,
  role,
  ...props
}: AlertProps) {
  return (
    <div
      role={role ?? (kind === "danger" ? "alert" : "status")}
      className={cn(alertVariants({ kind }), className)}
      {...props}
    >
      <span aria-hidden="true" className={markVariants({ kind })}>
        {kind === "info" ? "i" : "!"}
      </span>
      <div className="flex-1">
        {title !== undefined && title !== null && <b>{title}</b>}
        {children !== undefined && children !== null && (
          <div className="text-text/80 mt-0.5">{children}</div>
        )}
      </div>
      {action !== undefined && action !== null && <div className="flex-none">{action}</div>}
    </div>
  );
}
