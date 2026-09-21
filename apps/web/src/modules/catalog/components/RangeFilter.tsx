import { RangeInputs } from "@partiya/ui";
import { useEffect, useState } from "react";

/* Макет: .range — два поля «от … до …». В URL значение уезжает по Enter или по потере
   фокуса: навигация на каждое нажатие клавиши перезапускала бы запрос. */

export type RangeFilterProps = {
  label: string;
  from: number | undefined;
  to: number | undefined;
  onCommit: (from: number | undefined, to: number | undefined) => void;
  fromPlaceholder?: string;
  toPlaceholder?: string;
};

const toText = (value: number | undefined): string => (value === undefined ? "" : String(value));
const toNumber = (value: string): number | undefined => {
  const digits = value.replace(/[^\d]/g, "");
  return digits === "" ? undefined : Number(digits);
};

export function RangeFilter({
  label,
  from,
  to,
  onCommit,
  fromPlaceholder,
  toPlaceholder,
}: RangeFilterProps) {
  const [draft, setDraft] = useState({ from: toText(from), to: toText(to) });

  // внешнее изменение (сброс фильтров, «назад») должно переписать черновик
  useEffect(() => setDraft({ from: toText(from), to: toText(to) }), [from, to]);

  const commit = () => {
    const next = { from: toNumber(draft.from), to: toNumber(draft.to) };
    if (next.from === from && next.to === to) return;
    onCommit(next.from, next.to);
  };

  return (
    <div
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
      }}
    >
      <RangeInputs
        label={label}
        from={draft.from}
        to={draft.to}
        onFromChange={(value) => setDraft((prev) => ({ ...prev, from: value }))}
        onToChange={(value) => setDraft((prev) => ({ ...prev, to: value }))}
        fromLabel={`${label}, от`}
        toLabel={`${label}, до`}
        fromPlaceholder={fromPlaceholder}
        toPlaceholder={toPlaceholder}
      />
    </div>
  );
}
