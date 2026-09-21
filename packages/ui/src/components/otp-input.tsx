import { unstable_OneTimePasswordField as OneTimePasswordField } from "radix-ui";

import { cn } from "../lib/utils";
import { useFieldControl } from "./field";

/* Макет: .otp — клетки 48×56, Montserrat 700 22px, фокус синей рамкой с гало.
   Вставка кода из СМС, стрелки и Backspace между клетками — от radix.

   ⚠ autoFocus в @radix-ui/react-one-time-password-field 0.1.16 не работает: Root кладёт
   проп в контекст, но ни одной клетке его не отдаёт. Чинить снаружи нельзя — проверено:
   любой программный input.focus() до первого нажатия ломает переход фокуса в SET_CHAR,
   и первая цифра остаётся в нулевой клетке («123456» набирается как «23456_»). Экран
   ввода кода поэтому ждёт, пока человек коснётся первой клетки; проп оставлен, чтобы
   его можно было включить, когда radix починит своё поведение. */

export type OtpInputProps = {
  /** Сколько клеток. По макету — 6 */
  length?: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Отправить форму, когда код заполнен целиком */
  autoSubmit?: boolean;
  onAutoSubmit?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  name?: string;
  form?: string;
  label?: string;
  className?: string;
  inputClassName?: string;
};

export function OtpInput({
  length = 6,
  value,
  defaultValue,
  onValueChange,
  autoSubmit,
  onAutoSubmit,
  disabled,
  autoFocus,
  name,
  form,
  label = "Код из СМС",
  className,
  inputClassName,
}: OtpInputProps) {
  const field = useFieldControl();

  return (
    <OneTimePasswordField.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      autoSubmit={autoSubmit}
      onAutoSubmit={onAutoSubmit}
      disabled={disabled}
      autoFocus={autoFocus}
      name={name}
      form={form}
      aria-label={label}
      aria-describedby={field?.describedBy}
      className={cn("flex gap-2", className)}
    >
      {Array.from({ length }, (_, index) => (
        <OneTimePasswordField.Input
          key={index}
          index={index}
          /* radix 0.1.16 зашивает клетке английский `aria-label="Character 1 of 6"`
             (dist/index.js: строка стоит ДО `...domProps`, поэтому свой проп её
             перекрывает). Скринридер в русском интерфейсе не должен переходить
             на английский посреди ввода кода. */
          aria-label={`Цифра ${String(index + 1)} из ${String(length)}`}
          className={cn(
            "rounded-control border-border-strong bg-surface text-text font-heading focus:border-action focus:ring-action-soft h-14 w-12 border-[1.5px] text-center text-[22px] font-bold outline-none focus:ring-[3px] disabled:opacity-45",
            field?.invalid && "border-danger bg-danger-soft",
            inputClassName,
          )}
        />
      ))}
      <OneTimePasswordField.HiddenInput />
    </OneTimePasswordField.Root>
  );
}
