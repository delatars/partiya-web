import { cn } from "@partiya/ui";

/* Макет: .pipe — полоска этапов сделки. Четыре сегмента с подписью и датой под ними.
   Используется на экране счёта; трекинг заказа возьмёт её же, когда появится. */

export interface PipeStep {
  name: string;
  note?: string;
  state: "done" | "active" | "todo";
}

export function PipeSteps({ steps, className }: { steps: PipeStep[]; className?: string }) {
  return (
    <ol className={cn("flex gap-1", className)}>
      {steps.map((step) => (
        <li
          key={step.name}
          aria-current={step.state === "active" ? "step" : undefined}
          className={cn(
            "flex-1 text-xs",
            step.state === "todo" ? "text-muted" : "text-text font-medium",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "mb-1.5 block h-1.5 rounded-[3px]",
              step.state === "done" && "bg-success",
              step.state === "active" &&
                "bg-[linear-gradient(90deg,var(--color-action)_65%,var(--color-subtle)_65%)]",
              step.state === "todo" && "bg-subtle",
            )}
          />
          {step.name}
          {step.note !== undefined && <span className="text-muted block">{step.note}</span>}
        </li>
      ))}
    </ol>
  );
}
