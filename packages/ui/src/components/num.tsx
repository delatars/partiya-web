import type { HTMLAttributes } from "react";

import { cn } from "../lib/utils";

/* Макет: .num — табличные цифры; .price — Montserrat 800 с поджатым трекингом.
   Разряды разделяем неразрывным пробелом, чтобы число не рвалось переносом. */

const NBSP = " ";

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("ru-RU", options).format(value).replace(/\s/g, NBSP);
}

export type NumProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  value: number;
  options?: Intl.NumberFormatOptions;
  /** Единица после числа: «шт», «дн.», «%» */
  unit?: string;
};

export function Num({ className, value, options, unit, ...props }: NumProps) {
  return (
    <span className={cn("num", className)} {...props}>
      {formatNumber(value, options)}
      {unit ? `${NBSP}${unit}` : null}
    </span>
  );
}

export type PriceProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  value: number;
  currency?: string;
  options?: Intl.NumberFormatOptions;
  /** Зачёркнутая цена до скидки */
  old?: boolean;
};

export function Price({ className, value, currency = "₽", options, old, ...props }: PriceProps) {
  return (
    <span
      className={cn(old ? "num text-muted text-xs line-through" : "price", className)}
      {...props}
    >
      {formatNumber(value, options)}
      {NBSP}
      {currency}
    </span>
  );
}
