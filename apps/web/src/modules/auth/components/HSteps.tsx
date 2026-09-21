import { cn } from "@partiya/ui";

/* Макет: .hsteps и .hsteps.big — лента шагов мастера. */

export type StepState = "done" | "current" | "todo";

export interface StepItem {
  label: string;
  /** Вторая строка — только в крупном варианте (.hsteps.big). */
  hint?: string;
  state: StepState;
}

const STATE_CLASS: Record<StepState, string> = {
  done: "bg-success-soft text-success",
  current: "bg-action text-white",
  todo: "bg-subtle text-muted",
};

export function HSteps({
  steps,
  size = "sm",
  className,
}: {
  steps: readonly StepItem[];
  size?: "sm" | "lg";
  className?: string;
}) {
  const current = steps.findIndex((step) => step.state === "current");

  return (
    <ol
      className={cn("flex flex-wrap gap-1.5 text-[12.5px]", className)}
      aria-label={`Шаг ${String(current + 1)} из ${String(steps.length)}`}
    >
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className={cn(
            "rounded-control flex-1 font-medium",
            STATE_CLASS[step.state],
            size === "lg"
              ? "grid min-w-[9rem] grid-cols-[auto_1fr] items-center gap-x-2 px-3 py-2.5 text-[13.5px]"
              : // узкая карточка входа: три шага обязаны уместиться в одну строку
                "min-w-0 truncate px-2.5 py-1.5 text-center",
          )}
        >
          {size === "lg" ? (
            <>
              <b
                aria-hidden="true"
                className={cn(
                  "font-heading row-span-2 grid size-6 place-items-center rounded-full text-[12px] font-bold",
                  step.state === "current" ? "bg-white/25" : "bg-white/60",
                )}
              >
                {step.state === "done" ? "✓" : index + 1}
              </b>
              <span>{step.label}</span>
              {step.hint ? (
                <span className="text-[11.5px] font-normal opacity-75">{step.hint}</span>
              ) : null}
            </>
          ) : (
            <span>
              {step.state === "done" ? "✓" : index + 1} {step.label}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
