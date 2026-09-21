import { Alert, Box, Button, DataTable, PageHeader, Skeleton, Tag } from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getApiService, SELLER_KEYS, sellerAuditOptions } from "@/shared/api";
import { formatIsoDate } from "@/shared/lib/dates";

/* Макет: экран `seller-audit` — аудит платформы и документы завода.

   Бейдж «аудит» — это фильтр каталога, которым пользуется большинство заказчиков,
   поэтому чек-лист показывается целиком: заводу должно быть видно, что именно
   осталось донести. */

const STATUS_TITLE: Record<string, string> = {
  none: "Аудита нет",
  requested: "Заявка подана",
  scheduled: "Выезд назначен",
  passed: "Аудит пройден",
  expiring: "Аудит истекает",
};

export function SellerAuditPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(sellerAuditOptions());

  const request = useMutation({
    mutationFn: () => getApiService().requestSellerAudit({ comment: null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SELLER_KEYS.audit() }),
  });

  if (isPending || !data) {
    return (
      <>
        <PageHeader title="Аудит и документы" subtitle="Бейдж «аудит» даёт приоритет в выдаче." />
        <Skeleton className="h-48" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Аудит и документы"
        subtitle="Бейдж «аудит» даёт приоритет в выдаче и фильтр «только с аудитом» — им пользуются 64 % заказчиков."
        actions={
          data.reportUrl === null ? (
            <Button
              variant="cta"
              disabled={request.isPending || data.status === "requested"}
              onClick={() => request.mutate()}
            >
              {data.status === "requested" ? "Заявка подана" : "Запросить аудит"}
            </Button>
          ) : (
            <Button asChild>
              <a href={data.reportUrl}>Отчёт аудитора PDF</a>
            </Button>
          )
        }
      />

      <Box className="mb-3">
        <div className="flex flex-wrap items-center gap-3">
          <div
            aria-hidden="true"
            className={`grid size-12 flex-none place-items-center rounded-full text-xl font-bold text-white ${
              data.status === "passed" ? "bg-success" : "bg-warning"
            }`}
          >
            {data.status === "passed" ? "✓" : "!"}
          </div>
          <div className="min-w-0 flex-1">
            <Tag tone={data.status === "passed" ? "ok" : "work"}>
              {STATUS_TITLE[data.status] ?? data.status}
            </Tag>
            <h2 className="font-heading mt-1 text-lg font-bold">
              {data.validUntil === null
                ? "Аудит платформы ещё не пройден"
                : `Действует до ${formatIsoDate(data.validUntil) ?? data.validUntil}`}
            </h2>
            <p className="text-muted text-[13px]">
              {data.visitAt === null
                ? "Следующая проверка — плановая, выезд по согласованию. Напомним за 30 дней."
                : `Выезд аудитора ${formatIsoDate(data.visitAt) ?? data.visitAt}${
                    data.auditorName === null ? "" : ` · ${data.auditorName}`
                  }`}
            </p>
          </div>
        </div>
      </Box>

      {data.warning === null ? null : (
        <Alert kind="warn" className="mb-3" title={data.warning.title}>
          {data.warning.text}
        </Alert>
      )}

      <Box>
        <DataTable
          rows={data.checks}
          rowKey={(row) => row.key}
          scrollable
          minWidth={640}
          columns={[
            { key: "title", header: "Пункт проверки", cell: (row) => <b>{row.title}</b> },
            {
              key: "basis",
              header: "Основание",
              cell: (row) => <span className="text-muted text-[12.5px]">{row.basis}</span>,
            },
            {
              key: "state",
              header: "Статус",
              cell: (row) => (
                <Tag tone={row.state === "ok" ? "ok" : row.state === "work" ? "work" : "done"}>
                  {row.state === "ok"
                    ? "Подтверждено"
                    : row.state === "work"
                      ? "Требует внимания"
                      : "Не начато"}
                </Tag>
              ),
            },
            {
              key: "date",
              header: "Дата",
              cell: (row) => <span className="text-muted text-[12.5px]">{row.date ?? "—"}</span>,
            },
            {
              key: "files",
              header: "",
              align: "right",
              cell: (row) => (
                <Button size="sm" disabled={row.files === 0}>
                  Файлы {row.files > 0 ? `· ${String(row.files)}` : ""}
                </Button>
              ),
            },
          ]}
        />
      </Box>
    </>
  );
}
