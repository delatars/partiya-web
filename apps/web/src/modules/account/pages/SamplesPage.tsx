import type { SampleOrder, SampleStatus } from "@partiya/api-contracts";
import { Alert, Box, Button, DataTable, EmptyState, Skeleton, Tag } from "@partiya/ui";
import { useQuery } from "@tanstack/react-query";

import { isApiError, sampleListOptions } from "@/shared/api";
import { formatIsoDate, formatIsoDayMonth } from "@/shared/lib/dates";
import { formatRub } from "@/shared/lib/format";
import { AppLink } from "@/shared/ui";

/* Макет: экран `samples` — «Образцы».

   Статусы у образца свои: он не идёт через эскроу, приёмку и спор (samples.ts). Поэтому
   таблица показывает не готовность партии, а путь посылки и зачёт стоимости в партию. */

const TITLES: Record<SampleStatus, string> = {
  awaiting_payment: "Ожидает оплаты",
  paid: "Оплачен",
  in_production: "В производстве",
  shipped: "В пути",
  delivered: "Получен",
  cancelled: "Отменён",
};

const TONES: Record<SampleStatus, "new" | "work" | "qc" | "done"> = {
  awaiting_payment: "new",
  paid: "new",
  in_production: "work",
  shipped: "work",
  delivered: "done",
  cancelled: "done",
};

export function SamplesPage() {
  const query = useQuery(sampleListOptions());
  const items = query.data?.items ?? [];

  if (query.isError) {
    return (
      <Alert kind="danger" title="Не удалось загрузить образцы">
        {isApiError(query.error) ? query.error.message : "Попробуйте обновить страницу."}
      </Alert>
    );
  }

  return (
    <>
      <header className="mt-1 mb-3.5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Образцы</h1>
          <p className="text-muted mt-1 max-w-[80ch]">
            Стоимость образца зачитывается в первую партию у той же фабрики в течение 60 дней.
          </p>
        </div>
        <Button asChild variant="cta">
          <AppLink to="/catalog">Найти с образцом</AppLink>
        </Button>
      </header>

      <Box>
        {query.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : items.length === 0 ? (
          <EmptyState
            title="Образцов пока нет"
            description="Образец шьётся из той же ткани и на той же линии, что и партия: это самый дешёвый способ проверить фабрику."
            action={
              <Button asChild variant="cta">
                <AppLink to="/catalog">Выбрать предложение</AppLink>
              </Button>
            }
          />
        ) : (
          <DataTable
            rows={items}
            rowKey={(row) => row.id}
            minWidth={760}
            columns={[
              {
                key: "no",
                header: "№",
                cell: (row: SampleOrder) => <span className="num font-medium">С-{row.id}</span>,
              },
              {
                key: "sample",
                header: "Образец",
                cell: (row) => `${row.offer.title} × ${String(row.params.qty)}`,
              },
              {
                key: "factory",
                header: "Фабрика",
                cell: (row) => `${row.offer.factoryName}, ${row.offer.factoryCity}`,
              },
              {
                key: "status",
                header: "Статус",
                cell: (row) => <Tag tone={TONES[row.status]}>{TITLES[row.status]}</Tag>,
              },
              {
                key: "note",
                header: "Примечание",
                cell: (row) => <span className="text-muted text-[12.5px]">{noteOf(row)}</span>,
              },
              {
                key: "total",
                header: "Сумма",
                align: "right",
                cell: (row) => formatRub(row.total),
              },
              {
                key: "action",
                header: "",
                align: "right",
                cell: (row) => (
                  <Button
                    asChild
                    size="sm"
                    variant={row.status === "delivered" ? "cta" : "default"}
                  >
                    <AppLink to={`/offer/${String(row.offer.id)}`}>
                      {row.status === "delivered" ? "Заказать партию" : "К предложению"}
                    </AppLink>
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Box>
    </>
  );
}

/** Что показать в колонке «Примечание»: путь посылки или срок зачёта. */
function noteOf(sample: SampleOrder): string {
  if (sample.status === "delivered" && sample.credit.validUntil !== null) {
    return `зачёт ${formatRub(sample.credit.amount)} до ${formatIsoDate(sample.credit.validUntil) ?? ""}`;
  }
  if (sample.shipDate !== null) {
    return `${sample.delivery.title} · отгрузка ${formatIsoDayMonth(sample.shipDate) ?? ""}`;
  }
  return sample.delivery.title;
}
