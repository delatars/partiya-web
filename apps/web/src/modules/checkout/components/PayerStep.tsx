import type { Organization, Order, UpdateOrderDraftBody } from "@partiya/api-contracts";
import { Button, Checkbox, Field, Input, Select, SelectItem } from "@partiya/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { OFFER_VERSION_TITLE } from "@/shared/lib/offer-terms";

import { payerPatchOf, payerStepSchema, type PayerStepForm } from "../lib/schemas";
import { useDebouncedCallback } from "../lib/use-debounced";
import { SaveBadge, type SaveState } from "./SaveBadge";

/* Макет: блок «Плательщик» из шага «Оплата» плюс строка про договор-оферту.

   Здесь это отдельный шаг: реквизиты уходят в счёт и в договор, и смешивать их с
   выбором схемы эскроу — значит прятать юридически значимый выбор под радиокнопкой.

   Галочка принятия оферты уходит в тело `POST /orders/{id}/submit` вместе с редакцией
   оферты (`OFFER_VERSION`, DECISIONS.md, п. 12); без неё сервер отвечает 422
   `orders/offer-not-accepted`. До отправки она живёт только в браузере. */

export interface PayerStepProps {
  order: Order;
  /** Организации-заказчики пользователя: платить может только своя компания. */
  organizations: Organization[];
  accepted: boolean;
  saveState: SaveState;
  onPatch: (body: UpdateOrderDraftBody) => void;
  onAcceptedChange: (accepted: boolean) => void;
  onDone: () => void;
  nextLabel: string;
}

export function PayerStep({
  order,
  organizations,
  accepted,
  saveState,
  onPatch,
  onAcceptedChange,
  onDone,
  nextLabel,
}: PayerStepProps) {
  const form = useForm<PayerStepForm>({
    resolver: zodResolver(payerStepSchema),
    mode: "onChange",
    defaultValues: {
      orgId: order.payer?.orgId ?? organizations[0]?.id ?? "",
      legalAddress: order.payer?.legalAddress ?? "",
      accountantEmail: order.payer?.accountantEmail ?? "",
      accepted,
    },
  });

  const save = useDebouncedCallback((payer: NonNullable<ReturnType<typeof payerPatchOf>>) => {
    onPatch({ payer });
  });

  /* Автосохранение реквизитов не зависит от галочки оферты (Q-230): она на сервер не
     уходит, и порядок действий не должен решать, сохранится ли адрес. Проверяются
     только поля плательщика — иначе «Без принятия оферты заказ оформить нельзя»
     блокировало бы PATCH, а кнопка «Оплатить» никогда бы не разблокировалась. */
  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      if (name === undefined) return;
      if (name === "accepted") onAcceptedChange(values.accepted === true);
      void form.trigger(["orgId", "legalAddress", "accountantEmail"]).then(() => {
        const payer = payerPatchOf(form.getValues());
        if (payer) save.run(payer);
      });
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [form, save, onAcceptedChange]);

  const errors = form.formState.errors;
  const chosen = organizations.find((org) => org.id === form.watch("orgId"));

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Плательщик" wide error={errors.orgId?.message} required>
          <Select
            value={form.watch("orgId")}
            onValueChange={(value) => {
              form.setValue("orgId", value, { shouldDirty: true, shouldValidate: true });
            }}
            aria-label="Плательщик"
          >
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name} · ИНН {org.inn}
              </SelectItem>
            ))}
          </Select>
        </Field>

        <Field label="Юридический адрес" wide error={errors.legalAddress?.message} required>
          <Input
            placeholder="125047, Москва, ул. Лесная, д. 9, офис 412"
            {...form.register("legalAddress")}
          />
        </Field>

        <Field
          label="Почта бухгалтера"
          hint="Пришлём счёт и закрывающие документы"
          error={errors.accountantEmail?.message}
        >
          <Input
            inputMode="email"
            placeholder="buh@kora.ru"
            {...form.register("accountantEmail")}
          />
        </Field>

        {chosen && (
          <Field label="Реквизиты">
            <p className="text-muted num pt-1.5 text-[13px]">
              ИНН {chosen.inn}
              {chosen.kpp === null ? "" : ` · КПП ${chosen.kpp}`}
            </p>
          </Field>
        )}
      </div>

      <div className="bg-subtle rounded-control mt-3 px-3 py-2.5 text-[13px]">
        <b className="font-medium">Документы сформируются автоматически</b>
        <p className="text-muted mt-0.5">
          Договор-оферта и спецификация — после оформления заказа, подписание по ЭДО. Счёт на оплату
          придёт на следующем шаге.
        </p>
      </div>

      <div className="mt-2.5">
        <Checkbox
          checked={form.watch("accepted")}
          onCheckedChange={(next) => {
            form.setValue("accepted", next === true, {
              shouldDirty: true,
              shouldValidate: true,
            });
            onAcceptedChange(next === true);
          }}
          rowClassName="items-start"
          label="Принимаю договор-оферту платформы и согласен со спецификацией заказа"
        />
        <p className="text-muted mt-0.5 ps-6 text-xs">
          Договор-оферта, {OFFER_VERSION_TITLE} Время принятия фиксирует платформа.
        </p>
        {errors.accepted?.message !== undefined && (
          <p className="text-danger mt-0.5 text-xs">{errors.accepted.message}</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <SaveBadge state={saveState} />
        <Button variant="cta" onClick={onDone}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
