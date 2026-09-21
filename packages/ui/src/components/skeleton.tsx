import type { HTMLAttributes } from "react";

import { cn } from "../lib/utils";

/* Макет: .skel — бегущий блик 1.4 с; .skel.sq — квадрат на месте фото */

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /** Квадрат во всю ширину — заглушка фото в сетке */
  square?: boolean;
};

export function Skeleton({ className, square, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton-bg animate-shimmer block rounded motion-reduce:animate-none",
        square && "aspect-square w-full rounded-none",
        className,
      )}
      {...props}
    />
  );
}
