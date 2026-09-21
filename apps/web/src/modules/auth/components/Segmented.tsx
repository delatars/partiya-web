import { cn } from "@partiya/ui";

/* Макет: .seg.wide — переключатель на всю ширину карточки входа.
   Роль radiogroup, а не tablist: выбор меняет данные формы, а не показанную панель. */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  label: string;
  className?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "border-border-strong rounded-control flex overflow-hidden border text-[12.5px]",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              onChange(option.value);
            }}
            className={cn(
              "text-muted hover:bg-subtle flex-1 px-2.5 py-2.5 text-center font-medium transition-colors",
              active && "bg-header hover:bg-header text-white",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
