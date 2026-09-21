import { LoaderCircle } from "lucide-react";
import type { HTMLAttributes } from "react";

import { cn } from "../lib/utils";

/* В макете спиннера нет — состояния загрузки там скелетонами. Нужен для кнопок и подгрузки. */

const sizeClass = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-6",
} as const;

export type SpinnerProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  size?: keyof typeof sizeClass;
  /** Читается скринридером; на экране не видно */
  label?: string;
};

export function Spinner({ className, size = "md", label = "Загрузка", ...props }: SpinnerProps) {
  return (
    <span role="status" className={cn("inline-flex items-center", className)} {...props}>
      <LoaderCircle
        aria-hidden="true"
        className={cn("animate-spin motion-reduce:animate-none", sizeClass[size])}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
