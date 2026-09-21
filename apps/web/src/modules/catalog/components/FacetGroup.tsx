import type { Facet, FacetOption } from "@partiya/api-contracts";
import { Checkbox, Radio, RadioGroup } from "@partiya/ui";

import { formatNumber } from "@/shared/lib/format";

/* Макет: .filters — группа фасета: заголовок, строки со счётчиком справа.
   Чекбоксы — «или» внутри группы, радио — единственный выбор («Срок»). */

export type FacetGroupProps = {
  facet: Facet;
  onToggle: (value: string, on: boolean) => void;
  /** false — группа встроена в чужой заголовок (диапазон + варианты одной партии). */
  withLegend?: boolean;
  /** Показать не все варианты: часть группы вынесена в переключатели. */
  options?: readonly FacetOption[];
};

export function FacetGroup({ facet, onToggle, withLegend = true, options }: FacetGroupProps) {
  const list = options ?? facet.options;
  if (list.length === 0) return null;

  const selected = list.find((option) => option.selected)?.value;

  return (
    <fieldset className={withLegend ? "mt-4 first:mt-0" : "mt-1.5"}>
      {withLegend ? (
        <legend className="font-heading mb-2 text-[13px] font-bold">{facet.label}</legend>
      ) : null}

      {facet.kind === "radio" ? (
        <RadioGroup
          orientation="vertical"
          value={selected ?? ""}
          onValueChange={(value) => onToggle(value, true)}
        >
          {list.map((option) => (
            <Radio
              key={option.value}
              value={option.value}
              label={option.label}
              hint={option.count > 0 ? formatNumber(option.count) : undefined}
            />
          ))}
        </RadioGroup>
      ) : (
        list.map((option) => (
          <Checkbox
            key={option.value}
            checked={option.selected}
            onCheckedChange={(state) => onToggle(option.value, state === true)}
            label={option.label}
            hint={formatNumber(option.count)}
            disabled={option.count === 0 && !option.selected}
          />
        ))
      )}
    </fieldset>
  );
}
