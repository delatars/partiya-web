import type { EscrowOperation, EscrowOperationKind } from "@partiya/api-contracts";
import { Alert, Box, Button, DataTable, EmptyState, KpiTile, Skeleton, Tag } from "@partiya/ui";
import { useQuery } from "@tanstack/react-query";

import { escrowOverviewOptions, isApiError } from "@/shared/api";
import { formatDateTime, formatShortDate } from "@/shared/lib/dates";
import { formatRub } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import { AppLink } from "@/shared/ui";

/* Макет: экран `escrow` — «Эскроу и счета».
 *
 * Весь раздел приходит одним запросом: KPI сверху обязаны сходиться с таблицами снизу,
 * а пять независимых запросов рано или поздно покажут сумму от одного момента и список
 * от другого. Знак суммы в истории задаёт вид операции, а не само число — резерв для
 * заказчика не расход, и рисуется он иначе, чем выплата. */

const OPERATION_TONE: Record<EscrowOperationKind, string> = {
  hold: "text-muted",
  release: "text-text",
  refund: "text-success",
  invoice: "text-warning",
  fee: "text-muted",
};

const OPERATION_SIGN: Record<EscrowOperationKind, string> = {
  hold: "−",
  release: "",
  refund: "+",
  invoice: "",
  fee: "−",
};

export function EscrowPage() {
  const query = useQuery(escrowOverviewOptions());
  const data = query.data;

  if (query.isError) {
    return (
      <Alert kind="danger" title="Не удалось загрузить эскроу">
        {isApiError(query.error) ? query.error.message : "Попробуйте обновить страницу."}
      </Alert>
    );
  }

  return (
    <>
      <header className="mt-1 mb-3.5">
        <h1 className="font-heading text-2xl font-bold">Эскроу и счета</h1>
        <p className="text-muted mt-1 max-w-[80ch]">
          Деньги по активным заказам хранятся на номинальном счёте банка-партнёра, а не у платформы.
        </p>
      </header>

      <div className="mb-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="В эскроу сейчас"
          value={data ? formatRub(data.heldTotal) : "—"}
          delta={
            data
              ? `по ${String(data.heldOrders)} ${plural(data.heldOrders, ["заказу", "заказам", "заказам"])}`
              : undefined
          }
        />
        <KpiTile
          label="Ждут оплаты"
          value={data ? formatRub(data.awaitingTotal) : "—"}
          delta={
            data && data.awaitingInvoices > 0
              ? `${String(data.awaitingInvoices)} ${plural(data.awaitingInvoices, ["счёт", "счёта", "счетов"])}`
              : undefined
          }
          deltaTone="warn"
        />
        <KpiTile label="Выплачено фабрикам" value={data ? formatRub(data.paidOutTotal) : "—"} />
        <KpiTile label="Возвращено по спорам" value={data ? formatRub(data.refundedTotal) : "—"} />
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_320px]">
        {/* min-w-0: без него колонка грида расширяется под таблицу, и горизонтальная
            прокрутка уезжает со страницы вместо таблицы */}
        <Box className="min-w-0">
          <h2 className="font-heading text-lg font-bold">Активные резервы</h2>
          {query.isPending ? (
            <Skeleton className="mt-2 h-24 w-full" />
          ) : (
            <DataTable
              rows={data?.deals ?? []}
              rowKey={(row) => row.dealId}
              minWidth={640}
              empty={
                <EmptyState
                  title="Резервов нет"
                  description="Деньги попадают в эскроу после оплаты счёта и возвращаются или уходят фабрике после приёмки."
                />
              }
              columns={[
                {
                  key: "order",
                  header: "Заказ",
                  cell: (row) => (
                    <AppLink to={`/account/orders/${String(row.orderId)}`}>
                      <span className="text-action block">№ {row.orderId}</span>
                      <span className="text-muted block text-[12.5px]">{row.orderTitle}</span>
                    </AppLink>
                  ),
                },
                { key: "factory", header: "Фабрика", cell: (row) => row.factory },
                {
                  key: "stage",
                  header: "Этап",
                  cell: (row) => <Tag tone="work">{row.stageTitle}</Tag>,
                },
                {
                  key: "release",
                  header: "Освобождение",
                  cell: (row) => (
                    <span className="text-muted text-[12.5px]">{row.releaseNote ?? "—"}</span>
                  ),
                },
                {
                  key: "amount",
                  header: "Сумма",
                  align: "right",
                  cell: (row) => <b className="num">{formatRub(row.amount)}</b>,
                },
              ]}
            />
          )}

          <h2 className="font-heading mt-4 mb-1.5 text-lg font-bold">История операций</h2>
          {(data?.operations ?? []).length === 0 ? (
            <p className="text-muted text-[13px]">Операций пока не было.</p>
          ) : (
            <div>
              {(data?.operations ?? []).map((operation) => (
                <OperationRow key={operation.id} operation={operation} />
              ))}
            </div>
          )}
        </Box>

        <div className="flex flex-col gap-3">
          <Box>
            <h3 className="font-heading text-base font-bold">Счета к оплате</h3>
            {(data?.invoices ?? []).length === 0 ? (
              <p className="text-muted mt-1.5 text-[12.5px]">Неоплаченных счетов нет.</p>
            ) : (
              (data?.invoices ?? []).map((invoice) => (
                <div key={invoice.id} className="mt-2 flex items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <b className="block">
                      № {invoice.number} · {formatRub(invoice.amount)}
                    </b>
                    <span className="text-muted text-[12.5px]">
                      {invoice.title} · до {formatDateTime(invoice.dueAt)}
                    </span>
                  </div>
                  <Button asChild size="sm" variant="cta">
                    <AppLink to={`/order/${String(invoice.orderId)}/pay`}>Реквизиты</AppLink>
                  </Button>
                </div>
              ))
            )}
          </Box>

          <div className="bg-success-soft rounded-card px-3 py-2.5 text-[12.5px]">
            Платформа не может списать деньги из эскроу без вашей приёмки или решения по спору.
          </div>
        </div>
      </div>
    </>
  );
}

function OperationRow({ operation }: { operation: EscrowOperation }) {
  return (
    <div className="border-border grid grid-cols-[52px_1fr_auto] items-center gap-2.5 border-b py-2 text-[13.5px] last:border-0">
      <span className="text-muted text-[12.5px]">{formatShortDate(operation.at)}</span>
      <div className="min-w-0">
        <b className="block">{operation.title}</b>
        {operation.subtitle != null && (
          <span className="text-muted block text-[12.5px]">{operation.subtitle}</span>
        )}
      </div>
      <b className={`num ${OPERATION_TONE[operation.kind]}`}>
        {OPERATION_SIGN[operation.kind]}
        {formatRub(operation.amount)}
      </b>
    </div>
  );
}
