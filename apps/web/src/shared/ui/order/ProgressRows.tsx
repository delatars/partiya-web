import type { OrderStageProgress } from "@partiya/api-contracts";
import { ProgressBar } from "@partiya/ui";

import { formatNumber } from "@/shared/lib/format";

/* Макет: .prog — строка «Отшито ▬▬▬▬ 650 / 1 000». Три колонки: название, полоса, число. */

export function ProgressRows({ rows }: { rows: OrderStageProgress[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted my-2 text-[13px]">
        Фабрика ещё не отчиталась о выработке — первые строки появятся после запуска партии.
      </p>
    );
  }

  return (
    <div className="my-2.5 flex flex-col">
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[minmax(70px,90px)_1fr_minmax(80px,100px)] items-center gap-2.5 py-[5px] text-[13px]"
        >
          <span className="truncate">{row.title}</span>
          <ProgressBar
            label={`${row.title}: ${String(row.done)} из ${String(row.total)}`}
            value={row.done}
            max={row.total}
            tone={row.done >= row.total ? "success" : "action"}
          />
          <span className="num text-muted text-right text-[12.5px] whitespace-nowrap">
            {row.note != null && row.note !== ""
              ? row.note
              : `${formatNumber(row.done)} / ${formatNumber(row.total)}`}
          </span>
        </div>
      ))}
    </div>
  );
}
