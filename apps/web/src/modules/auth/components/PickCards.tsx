import { cn, Radio, RadioGroup } from "@partiya/ui";
import { useId } from "react";

/* Макет: .pick — две карточки-переключателя «Что будете делать на платформе».
   Кружок радио лежит в углу карточки, кликабельна вся карточка: <label for> работает
   и с кнопкой radix, потому что button — labelable-элемент. */

export interface PickOption<T extends string> {
  value: T;
  title: string;
  hint: string;
}

export function PickCards<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T | undefined;
  onChange: (value: T) => void;
  options: readonly PickOption<T>[];
  label: string;
  className?: string;
}) {
  const uid = useId();

  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        onChange(next as T);
      }}
      className={cn("grid gap-2 sm:grid-cols-2", className)}
    >
      {options.map((option) => {
        const id = `${uid}-${option.value}`;
        const active = option.value === value;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              "rounded-control relative grid cursor-pointer gap-0.5 border-[1.5px] p-3 transition-colors",
              active ? "border-action bg-action-soft" : "border-border hover:border-border-strong",
            )}
          >
            <Radio id={id} value={option.value} className="absolute top-2.5 right-2.5" />
            <b className="pr-6">{option.title}</b>
            <span className="text-muted text-[12.5px]">{option.hint}</span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
