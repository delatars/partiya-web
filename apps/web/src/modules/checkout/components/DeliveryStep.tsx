import type { OfferDetail, Order, UpdateOrderDraftBody } from "@partiya/api-contracts";
import { Button, cn, Field, Input, Textarea } from "@partiya/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { formatRub } from "@/shared/lib/format";

import { deliveryStepSchema, type DeliveryStepForm } from "../lib/schemas";
import { useDebouncedCallback } from "../lib/use-debounced";
import { SaveBadge, type SaveState } from "./SaveBadge";

/* Макет: шаг «Доставка» — список .pay с радиокнопками и пояснениями.

   Выбор варианта меняет цену (доставка — строка котировки), поэтому он уходит не сюда,
   а в пересчёт: `onOptionChange` правит URL, а PATCH прилетает уже с новым `quoteId`.
   Адрес и получатель — обычные поля с автосохранением. */

/** Адрес нужен только доставке до двери: склад маркетплейса платформа знает сама. */
function kindOf(optionId: string): DeliveryStepForm["kind"] {
  if (optionId === "pickup") return "pickup";
  if (optionId === "address") return "address";
  return "marketplace_warehouse";
}

const NOTES: Record<string, string> = {
  wb: "Фабрика маркирует «Честный знак» и оформляет поставку. Приёмка на складе 2–3 рабочих дня.",
  address: "До дверей. Разгрузка оплачивается отдельно на месте.",
  pickup: "После приёмки на фабрике, своим транспортом.",
};

export interface DeliveryStepProps {
  order: Order;
  offer: OfferDetail;
  selectedId: string | undefined;
  saveState: SaveState;
  onPatch: (body: UpdateOrderDraftBody) => void;
  onOptionChange: (optionId: string) => void;
  onDone: () => void;
  nextLabel: string;
}

export function DeliveryStep({
  order,
  offer,
  selectedId,
  saveState,
  onPatch,
  onOptionChange,
  onDone,
  nextLabel,
}: DeliveryStepProps) {
  const current = selectedId ?? offer.delivery[0]?.id ?? "";
  const kind = kindOf(current);

  const form = useForm<DeliveryStepForm>({
    resolver: zodResolver(deliveryStepSchema),
    mode: "onChange",
    defaultValues: {
      optionId: current,
      kind,
      address: order.delivery?.address ?? "",
      recipientName: order.delivery?.recipientName ?? "",
      recipientPhone: order.delivery?.recipientPhone ?? "",
      comment: order.delivery?.comment ?? "",
    },
  });

  const save = useDebouncedCallback((values: DeliveryStepForm) => {
    onPatch({
      delivery: {
        optionId: values.optionId,
        address: values.address.length > 0 ? values.address : null,
        recipientName: values.recipientName.length > 0 ? values.recipientName : null,
        recipientPhone: values.recipientPhone.length > 0 ? values.recipientPhone : null,
        comment: values.comment.length > 0 ? values.comment : null,
      },
    });
  });

  useEffect(() => {
    const subscription = form.watch((_values, { name }) => {
      if (name === undefined) return;
      void form.trigger().then((valid) => {
        if (valid) save.run(form.getValues());
      });
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [form, save]);

  // вариант доставки сменили снаружи (через пересчёт) — форма должна знать новый вид
  useEffect(() => {
    form.setValue("optionId", current);
    form.setValue("kind", kindOf(current));
    void form.trigger();
  }, [current, form]);

  const errors = form.formState.errors;

  return (
    <div>
      <div role="radiogroup" aria-label="Вариант доставки" className="flex flex-col gap-2">
        {offer.delivery.map((option) => {
          const active = option.id === current;
          return (
            <label
              key={option.id}
              className={cn(
                "rounded-control flex cursor-pointer items-start gap-2.5 border px-3 py-2.5 text-[13.5px]",
                active ? "border-action bg-action-soft" : "border-border",
              )}
            >
              <input
                type="radio"
                name="delivery"
                className="accent-action mt-0.5 size-4 flex-none"
                checked={active}
                onChange={() => {
                  onOptionChange(option.id);
                }}
              />
              <span className="min-w-0">
                <b className="font-medium">
                  {option.title} · {formatRub(option.price)}
                </b>
                <span className="text-muted block text-[12.5px]">
                  {NOTES[option.id] ?? option.note ?? ""}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {kind === "address" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Адрес доставки" wide error={errors.address?.message} required>
            <Input placeholder="Москва, ул. Лесная, 9, склад 2" {...form.register("address")} />
          </Field>
          <Field label="Получатель" error={errors.recipientName?.message} required>
            <Input placeholder="Анна Кораблёва" {...form.register("recipientName")} />
          </Field>
          <Field label="Телефон получателя" error={errors.recipientPhone?.message} required>
            <Input
              inputMode="tel"
              placeholder="+7 916 000-12-34"
              {...form.register("recipientPhone")}
            />
          </Field>
        </div>
      )}

      {kind === "marketplace_warehouse" && order.delivery?.address !== null && (
        <p className="text-muted mt-2.5 text-[12.5px]">
          Склад: {order.delivery?.address ?? "уточняется"}. Реквизиты поставки фабрика оформит сама.
        </p>
      )}

      <Field label="Комментарий к доставке" className="mt-3" error={errors.comment?.message}>
        <Textarea rows={2} {...form.register("comment")} />
      </Field>

      <div className="mt-4 flex items-center justify-between gap-3">
        <SaveBadge state={saveState} />
        <Button variant="cta" onClick={onDone}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
