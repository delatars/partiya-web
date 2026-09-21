import { cn } from "@partiya/ui";

import type { StreamState } from "@/shared/api";

/* Индикатор канала заказа. Экран не должен молча показывать устаревшие данные: если
   канал оборвался, человек обязан видеть, что обновления идут по запросу, — и уметь
   обновить руками. */

export function ConnectionBadge({
  state,
  isCatchingUp,
  onRefresh,
  updatedAt,
}: {
  state: StreamState;
  isCatchingUp: boolean;
  onRefresh: () => void;
  updatedAt?: string | null;
}) {
  const live = state === "open";

  return (
    <span className="text-muted flex flex-wrap items-center gap-1.5 text-[12px]">
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-1.5 rounded-full",
          live ? "bg-success" : state === "connecting" ? "bg-warning" : "bg-border-strong",
        )}
      />
      {live
        ? updatedAt != null && updatedAt !== ""
          ? "обновляется в реальном времени"
          : "канал на связи"
        : state === "connecting"
          ? "подключаемся…"
          : "нет связи — обновляем по запросу"}
      {!live && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isCatchingUp}
          className="text-action disabled:opacity-45"
        >
          {isCatchingUp ? "обновляем…" : "обновить"}
        </button>
      )}
    </span>
  );
}
