import type { Order } from "@partiya/api-contracts";
import { Alert, Box, Button, Field, Input, PageHeader } from "@partiya/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ADMIN_KEYS, getApiService, isApiError, ORDER_KEYS } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/dates";
import { orderStatusTitle } from "@/shared/lib/order-status";

/* Запасной путь «Доставлено» оператора (DECISIONS.md, п. 13; Q-332).

   Обычно доставку отмечает завод по трек-номеру. Если завод пропал или перевозчик
   подтвердил вручную, оператор переводит отгруженный заказ в приёмку сам:
   `POST /admin/orders/{id}/delivered`. Деньги это не двигает — открывается окно приёмки.

   ⚠ Q-381: списка отгруженных заказов в API бэк-офиса нет, поэтому номер вводится руками
   (его называет завод или заказчик в обращении). */

export function AdminDeliveryPage() {
  const queryClient = useQueryClient();
  const [raw, setRaw] = useState("");
  const [confirming, setConfirming] = useState<number | null>(null);
  const [done, setDone] = useState<Order | null>(null);

  const orderId = Number(raw.replace(/\D/gu, ""));
  const valid = Number.isInteger(orderId) && orderId > 0;

  const delivered = useMutation({
    mutationFn: (id: number) => getApiService().markAdminOrderDelivered(id),
    onSuccess: (order) => {
      setDone(order);
      setConfirming(null);
      setRaw("");
      void queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
    },
    onError: () => {
      setConfirming(null);
    },
  });

  const errorText = (() => {
    const error = delivered.error;
    if (!error) return null;
    if (!isApiError(error)) return error.message;
    if (error.status === 404) return `Заказ № ${String(orderId || "")} не найден.`;
    if (error.status === 409) {
      return `${error.message} «Доставлено» отмечают только у отгруженной партии.`;
    }
    return error.message;
  })();

  return (
    <>
      <PageHeader
        title="Доставка"
        subtitle="Запасной путь: отметить «Доставлено», если завод не отметил сам"
      />

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_360px] [&>*]:min-w-0">
        <Box>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!valid) return;
              setDone(null);
              delivered.reset();
              setConfirming(orderId);
            }}
          >
            <Field label="Номер заказа" className="min-w-0 flex-1">
              <Input
                inputMode="numeric"
                numeric
                value={raw}
                placeholder="4813"
                onChange={(event) => {
                  setRaw(event.target.value);
                }}
              />
            </Field>
            <Button type="submit" variant="cta" disabled={!valid}>
              Доставлено…
            </Button>
          </form>

          {confirming !== null ? (
            <Alert
              kind="warn"
              className="mt-3"
              title={`Отметить заказ № ${String(confirming)} доставленным?`}
              action={
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setConfirming(null)}>
                    Отмена
                  </Button>
                  <Button
                    size="sm"
                    variant="cta"
                    disabled={delivered.isPending}
                    onClick={() => delivered.mutate(confirming)}
                  >
                    {delivered.isPending ? "Отмечаем…" : "Да, доставлено"}
                  </Button>
                </div>
              }
            >
              У заказчика откроется окно приёмки — 5 рабочих дней. Трек-номер при этом не
              сохраняется: его вводит только завод.
            </Alert>
          ) : null}

          {errorText !== null ? (
            <Alert kind="danger" className="mt-3" title="Не получилось">
              {errorText}
            </Alert>
          ) : null}

          {done !== null ? (
            <Alert kind="info" className="mt-3" title={`Заказ № ${String(done.id)} в приёмке`}>
              Статус — «{orderStatusTitle(done.status)}»
              {done.acceptance
                ? `, авто-приёмка ${formatDateTime(done.acceptance.autoAcceptAt)}`
                : ""}
              .
            </Alert>
          ) : null}
        </Box>

        <Box>
          <h2 className="font-heading text-base font-bold">Когда это нужно</h2>
          <ul className="text-muted mt-1.5 grid gap-1 text-[13px]">
            <li>Завод отгрузил партию, но не отметил доставку по трек-номеру.</li>
            <li>Перевозчик подтвердил вручение, а завод недоступен.</li>
            <li>Деньги эта отметка не двигает: их раскрывает только приёмка заказчика.</li>
          </ul>
        </Box>
      </div>
    </>
  );
}
