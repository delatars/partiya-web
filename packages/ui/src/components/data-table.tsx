import type { ReactNode } from "react";

import { cn } from "../lib/utils";

/* Макет: table.tb — шапка капсом 11.5px, ховер строки, выделенная строка hot,
   числа по правому краю. Сортировок и виртуализации здесь намеренно нет. */

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  /** Числовые колонки по макету прижаты вправо */
  align?: "left" | "right";
  headClassName?: string;
  cellClassName?: string;
};

export type DataTableProps<T> = {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T, index: number) => string | number;
  /** Строка, на которую надо смотреть в первую очередь (tr.hot макета) */
  rowHighlighted?: (row: T, index: number) => boolean;
  caption?: ReactNode;
  /** Что показать вместо строк, когда данных нет */
  empty?: ReactNode;
  /** Обёртка с горизонтальной прокруткой (.tblw макета) для узких экранов */
  scrollable?: boolean;
  minWidth?: number;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHighlighted,
  caption,
  empty,
  scrollable = true,
  minWidth = 700,
  className,
}: DataTableProps<T>) {
  const table = (
    <table
      className={cn("w-full border-collapse text-[13.5px]", className)}
      style={scrollable ? { minWidth } : undefined}
    >
      {caption !== undefined && caption !== null && (
        <caption className="text-muted mb-2 text-left text-xs">{caption}</caption>
      )}
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={cn(
                "text-muted border-border border-b px-2.5 py-2 text-left text-[11.5px] font-medium tracking-[0.03em] uppercase",
                column.align === "right" && "text-right",
                column.headClassName,
              )}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-2.5 py-6">
              {empty}
            </td>
          </tr>
        ) : (
          rows.map((row, index) => {
            const highlighted = rowHighlighted?.(row, index) === true;

            return (
              <tr key={rowKey(row, index)} className="group">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "border-border border-b px-2.5 py-[11px] align-middle group-last:border-b-0",
                      column.align === "right" && "num text-right",
                      highlighted ? "bg-action-soft" : "group-hover:bg-row-hover",
                      column.cellClassName,
                    )}
                  >
                    {column.cell(row, index)}
                  </td>
                ))}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );

  return scrollable ? <div className="overflow-x-auto">{table}</div> : table;
}
