import { Search } from "lucide-react";
import type { FormEvent, Ref } from "react";

import { cn } from "../lib/utils";

/* Макет: .search — поле + селект категории + кнопка, одной плашкой */
export type SearchCategoryOption = {
  value: string;
  label: string;
};

export type SearchSubmitPayload = {
  value: string;
  category?: string;
};

export type SearchBarProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: (payload: SearchSubmitPayload) => void;
  placeholder?: string;
  /** aria-label поля; если нет — берётся placeholder. */
  inputLabel?: string;
  /** Текст кнопки; в compact остаётся только aria-label. */
  submitLabel: string;
  /** Селект категории: пусто — селекта нет. Ниже 560 px он скрыт, как в макете. */
  categories?: readonly SearchCategoryOption[];
  category?: string;
  onCategoryChange?: (value: string) => void;
  categoryLabel?: string;
  /** Компактный вариант для мобильной шапки: без селекта, кнопка-иконка. */
  compact?: boolean;
  name?: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  ref?: Ref<HTMLFormElement>;
};

export function SearchBar({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  inputLabel,
  submitLabel,
  categories,
  category,
  onCategoryChange,
  categoryLabel,
  compact = false,
  name = "q",
  className,
  inputRef,
  ref,
}: SearchBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.({ value, category });
  };

  const withCategories = !compact && categories !== undefined && categories.length > 0;

  return (
    <form
      ref={ref}
      role="search"
      onSubmit={handleSubmit}
      className={cn(
        "rounded-control flex w-full overflow-hidden bg-white",
        compact ? "h-9" : "h-10",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="search"
        name={name}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        aria-label={inputLabel ?? placeholder}
        className="text-text min-w-0 flex-1 border-0 bg-transparent px-3.5 outline-none"
      />
      {withCategories ? (
        <select
          value={category}
          onChange={(event) => onCategoryChange?.(event.target.value)}
          aria-label={categoryLabel}
          className="border-border bg-subtle text-muted hidden border-0 border-l px-2.5 outline-none sm:block"
        >
          {categories.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      <button
        type="submit"
        aria-label={compact ? submitLabel : undefined}
        className={cn(
          "bg-action hover:bg-action-hover flex items-center justify-center font-medium text-white",
          compact ? "w-10" : "px-4.5",
        )}
      >
        {compact ? <Search className="size-4" aria-hidden="true" /> : submitLabel}
      </button>
    </form>
  );
}
