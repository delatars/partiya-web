import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../lib/utils";

/* Макет: .tag — статусы (ok/new/work/qc/done) и промо-бейджи (hot/disc/smp) */
const tagVariants = cva(
  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11.5px] leading-snug font-bold",
  {
    variants: {
      tone: {
        ok: "bg-success-soft text-success",
        new: "bg-action-soft text-action",
        work: "bg-warning-soft text-warning-text",
        qc: "bg-discount-soft text-discount",
        done: "bg-subtle text-muted",
        hot: "bg-danger text-white",
        disc: "bg-discount text-white",
        smp: "bg-warning text-white",
      },
    },
    defaultVariants: { tone: "done" },
  },
);

export type TagProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof tagVariants>;

export function Tag({ className, tone, ...props }: TagProps) {
  return <span className={cn(tagVariants({ tone }), className)} {...props} />;
}
