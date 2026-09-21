import { useId } from "react";

import { cn } from "../lib/utils";
import { useFieldControl } from "./field";
import { Input } from "./input";

/* Макет: .range — два узких поля «от … до …» в панели фильтров */

export type RangeInputsProps = {
  from?: string;
  to?: string;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  /** Доступные имена полей: «Цена, от» / «Цена, до» */
  fromLabel?: string;
  toLabel?: string;
  /** Общая подпись группы (aria-label), если поле не обёрнуто во Field */
  label?: string;
  name?: string;
  disabled?: boolean;
  inputMode?: "numeric" | "decimal" | "text";
  className?: string;
};

export function RangeInputs({
  from,
  to,
  onFromChange,
  onToChange,
  fromPlaceholder = "от",
  toPlaceholder = "до",
  fromLabel = "от",
  toLabel = "до",
  label,
  name,
  disabled,
  inputMode = "numeric",
  className,
}: RangeInputsProps) {
  const field = useFieldControl();
  const uid = useId();

  // id поля отдаём первому инпуту: клик по label из Field фокусирует «от»
  return (
    <div role="group" aria-label={label} className={cn("flex gap-1.5", className)}>
      <Input
        id={field?.id ?? `${uid}a`}
        size="sm"
        numeric
        inputMode={inputMode}
        name={name ? `${name}From` : undefined}
        aria-label={fromLabel}
        placeholder={fromPlaceholder}
        value={from}
        disabled={disabled}
        onChange={(event) => onFromChange?.(event.target.value)}
      />
      <Input
        id={`${uid}b`}
        size="sm"
        numeric
        inputMode={inputMode}
        name={name ? `${name}To` : undefined}
        aria-label={toLabel}
        placeholder={toPlaceholder}
        value={to}
        disabled={disabled}
        onChange={(event) => onToChange?.(event.target.value)}
      />
    </div>
  );
}
