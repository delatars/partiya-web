import { createContext, useContext, useId, type ReactNode } from "react";

import { cn } from "../lib/utils";

/* Макет: .fld — label сверху, подпись снизу (зелёная hint / красная err) */

export type FieldControl = {
  /** id, который должен встать на контрол */
  id: string;
  /** id подписи под полем — в aria-describedby контрола */
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
};

const FieldContext = createContext<FieldControl | null>(null);

/** Контролы внутри Field подхватывают id/aria отсюда; явный проп всегда сильнее. */
export function useFieldControl(): FieldControl | null {
  return useContext(FieldContext);
}

/** Сливает aria-describedby контрола с id подписи поля. */
export function mergeDescribedBy(...ids: (string | undefined)[]): string | undefined {
  const list = ids.filter(Boolean);
  return list.length > 0 ? list.join(" ") : undefined;
}

export type FieldProps = {
  label?: ReactNode;
  /** Подпись под полем. По макету она зелёная — это подсказка, а не ошибка. */
  hint?: ReactNode;
  /** Текст ошибки; `true` — только красная рамка, текстом остаётся hint. */
  error?: ReactNode;
  required?: boolean;
  /** Растянуть на всю ширину сетки .fgrid */
  wide?: boolean;
  /** Явный id контрола, если он не читает контекст */
  id?: string;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
};

export function Field({
  label,
  hint,
  error,
  required,
  wide,
  id,
  children,
  className,
  labelClassName,
}: FieldProps) {
  const uid = useId();
  const controlId = id ?? `${uid}f`;
  const messageId = `${uid}m`;

  const invalid = error !== undefined && error !== null && error !== false;
  const message = invalid && error !== true ? error : hint;
  const hasMessage = message !== undefined && message !== null && message !== false;

  return (
    <div className={cn("flex flex-col gap-1", wide && "col-span-full", className)}>
      {label !== undefined && label !== null && (
        <label htmlFor={controlId} className={cn("text-muted text-xs", labelClassName)}>
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              {" *"}
            </span>
          )}
        </label>
      )}
      <FieldContext.Provider
        value={{
          id: controlId,
          describedBy: hasMessage ? messageId : undefined,
          invalid,
          required: required === true,
        }}
      >
        {children}
      </FieldContext.Provider>
      {hasMessage && (
        <span id={messageId} className={cn("text-xs", invalid ? "text-danger" : "text-success")}>
          {message}
        </span>
      )}
    </div>
  );
}
