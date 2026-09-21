import type { OrderPipelineStage } from "@partiya/api-contracts";
import { cn } from "@partiya/ui";

/* Макет: .pipe — укрупнённая лента заказа. Пройденные этапы зелёные, текущий залит
   на свою долю, будущие серые.

   Доля заливки приходит с сервера (`stage.pct`), а не рисуется фиксированным градиентом
   из CSS макета: 65 % в макете — это настоящая готовность партии, и подменять её
   константой значит врать на каждом заказе. */

export function PipelineBar({
  stages,
  className,
  compact,
}: {
  stages: OrderPipelineStage[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <ol className={cn("flex gap-1", className)}>
      {stages.map((stage) => (
        <li
          key={stage.stage}
          aria-current={stage.state === "active" ? "step" : undefined}
          className={cn(
            "min-w-0 flex-1 text-xs",
            stage.state === "todo" ? "text-muted" : "text-text font-medium",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "mb-1.5 block h-1.5 rounded-[3px]",
              stage.state === "done" && "bg-success",
              stage.state === "todo" && "bg-subtle",
              stage.state === "active" && "bg-subtle",
            )}
            style={
              stage.state === "active"
                ? {
                    background: `linear-gradient(90deg, var(--color-action) ${String(fill(stage))}%, var(--color-subtle) ${String(fill(stage))}%)`,
                  }
                : undefined
            }
          />
          {compact === true ? (
            <span className="sr-only">{stage.title}</span>
          ) : (
            <>
              <span className="block truncate">
                {stage.title}
                {showPercent(stage) ? ` ${String(stage.pct ?? 0)} %` : ""}
              </span>
              {stage.note != null && stage.note !== "" && (
                <span className="text-muted block text-[11.5px]">{stage.note}</span>
              )}
            </>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Процент подписывается только там, где он что-то значит: «Отгрузка 99 %» — это шум,
    а «Производство 65 %» — факт, на который человек смотрит каждый день. */
function showPercent(stage: OrderPipelineStage): boolean {
  return stage.state === "active" && stage.pct != null && stage.pct > 0 && stage.pct < 99;
}

/** Доля заливки активного этапа. Нет числа — половина: этап идёт, но насколько — неизвестно. */
function fill(stage: OrderPipelineStage): number {
  if (stage.pct == null) return 50;
  return Math.min(100, Math.max(0, Math.round(stage.pct)));
}
