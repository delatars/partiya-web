import { cn } from "@partiya/ui";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

import type { StepState } from "../lib/steps";

/* Макет: .acc — шаг оформления. Кружок с номером или галочкой, заголовок, сводка
   справа у свёрнутого шага, ссылка «Изменить», раскрытое тело у открытого.

   Это не набор независимых «раскрывашек», а один мастер: открыт ровно один шаг.
   Поэтому заголовок — кнопка, а тело открытого шага просто рисуется следом; возиться
   с анимацией высоты незачем, в макете её тоже нет. */

export interface StepAccordionItemProps {
  /** Номер шага для кружка: 1–4. */
  index: number;
  title: string;
  state: StepState;
  /** Сводка у свёрнутого заполненного шага: «1 000 шт · белый 600 / чёрный 400 · S–XL». */
  summary?: ReactNode;
  /** Тело шага — рисуется, только когда шаг открыт. */
  children: ReactNode;
  onOpen: () => void;
}

export function StepAccordionItem({
  index,
  title,
  state,
  summary,
  children,
  onOpen,
}: StepAccordionItemProps) {
  const open = state === "on";
  const done = state === "done";
  const bodyId = `checkout-step-${String(index)}`;

  return (
    <section className="bg-surface rounded-card mb-2.5 overflow-hidden">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onOpen}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        >
          <span
            aria-hidden="true"
            className={cn(
              "font-heading grid size-6 flex-none place-items-center rounded-full text-[12px] font-bold",
              done && "bg-success text-white",
              open && "bg-action text-white",
              !done && !open && "bg-subtle text-muted",
            )}
          >
            {done ? <Check className="size-3.5" strokeWidth={3} /> : index}
          </span>
          <span className="font-heading flex-1 text-[15px] font-bold">{title}</span>
          {!open && summary !== undefined && summary !== null && (
            <span className="text-muted hidden text-[13px] sm:block">{summary}</span>
          )}
          {!open && (
            <span className="text-action flex-none text-[13px]">
              {done ? "Изменить" : "Заполнить"}
            </span>
          )}
        </button>
      </h2>
      {open && (
        <div id={bodyId} className="border-border border-t px-4 pt-3.5 pb-4">
          {children}
        </div>
      )}
      {!open && summary !== undefined && summary !== null && (
        <p className="text-muted px-4 pb-3 text-[13px] sm:hidden">{summary}</p>
      )}
    </section>
  );
}
