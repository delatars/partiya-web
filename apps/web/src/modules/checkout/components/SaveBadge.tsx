import { cn, Spinner } from "@partiya/ui";
import { Check } from "lucide-react";

/* Индикатор автосохранения шага.

   Нужен ровно по одной причине: черновик живёт на сервере, и человек должен видеть,
   что закрыть вкладку уже безопасно. Молчащий экран этого не сообщает. */

export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveBadge({ state, className }: { state: SaveState; className?: string }) {
  if (state === "idle") return null;

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1 text-[12.5px]",
        state === "error" ? "text-danger" : "text-muted",
        className,
      )}
    >
      {state === "saving" && (
        <>
          <Spinner size="sm" label="Сохраняем" />
          Сохраняем…
        </>
      )}
      {state === "saved" && (
        <>
          <Check aria-hidden="true" className="text-success size-3.5" strokeWidth={3} />
          Сохранено
        </>
      )}
      {state === "error" && "Не сохранилось — проверим ещё раз"}
    </span>
  );
}
