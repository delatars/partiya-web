import type { SellerPayout } from "@partiya/api-contracts";
import {
  Box,
  Button,
  DataTable,
  EmptyState,
  KpiTile,
  PageHeader,
  Skeleton,
  Tag,
} from "@partiya/ui";
import { useQuery } from "@tanstack/react-query";

import { sellerFinanceSummaryOptions, sellerPayoutsOptions } from "@/shared/api";
import { formatIsoDate } from "@/shared/lib/dates";
import { formatRub } from "@/shared/lib/format";
import { AppLink } from "@/shared/ui";

/* Макет: экран `seller-finance` — выплаты и эскроу.

   Все четыре KPI и таблица приходят из `GET /seller/finance/summary` и
   `GET /seller/finance/payouts` — эти два эндпоинта у бэка уже реализованы, поля взяты
   из openapi.json без изменений. Проценты здесь не считаются: комиссия приходит числом
   из той же функции домена, что кладёт проводки в ledger. */

const STATUS_TONE: Record<string, "ok" | "new" | "work" | "done"> = {
  released: "ok",
  funded: "new",
  awaiting_funds: "work",
  refunded: "done",
  partially_funded: "work",
  partially_refunded: "work",
  cancelled: "done",
};

export function SellerFinancePage() {
  const summary = useQuery(sellerFinanceSummaryOptions());
  const payouts = useQuery(sellerPayoutsOptions());
  const data = summary.data;

  return (
    <>
      <PageHeader
        title="Финансы"
        subtitle="Выплата — в течение 2 рабочих дней после приёмки партии заказчиком."
      />

      {summary.isPending ? (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            label="В эскроу за вас"
            value={formatRub(data?.escrowHeld ?? 0)}
            delta={`по ${String(data?.escrowOrders?.length ?? 0)} заказам`}
          />
          <KpiTile
            label="Ближайшая выплата"
            value={formatRub(data?.nextPayoutAmount ?? 0)}
            delta={
              data?.nextPayoutAt == null
                ? "срок пока не назначен"
                : (formatIsoDate(data.nextPayoutAt) ?? "")
            }
          />
          <KpiTile label="Выплачено" value={formatRub(data?.paidTotal ?? 0)} />
          <KpiTile
            label="Комиссия платформы"
            value={`${String(data?.feePercent ?? 8)} %`}
            delta={`удержано ${formatRub(data?.feeWithheld ?? 0)}`}
          />
        </div>
      )}

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Box>
          <h2 className="font-heading text-base font-bold">Выплаты</h2>
          {payouts.isPending ? (
            <Skeleton className="mt-3 h-40" />
          ) : (
            <DataTable<SellerPayout>
              className="mt-2"
              scrollable
              minWidth={720}
              rows={payouts.data?.items ?? []}
              rowKey={(row) => row.dealId}
              empty={
                <EmptyState
                  title="Выплат пока не было"
                  description="Первая выплата придёт в течение 2 рабочих дней после приёмки первой партии."
                />
              }
              columns={[
                {
                  key: "date",
                  header: "Дата",
                  cell: (row) => (
                    <span className="text-muted text-[12.5px]">
                      {formatIsoDate(row.updatedAt.slice(0, 10)) ?? row.updatedAt.slice(0, 10)}
                    </span>
                  ),
                },
                {
                  key: "order",
                  header: "Заказ",
                  cell: (row) => (
                    <div>
                      <div className="font-medium">
                        {row.orderId === undefined ? (
                          `Сделка № ${String(row.dealNo)}`
                        ) : (
                          <AppLink
                            to={`/seller/orders/${String(row.orderId)}`}
                            className="text-action hover:underline"
                          >
                            № {row.orderId} · {row.orderTitle ?? ""}
                          </AppLink>
                        )}
                      </div>
                      <div className="text-muted text-[12.5px]">{row.customerName ?? ""}</div>
                    </div>
                  ),
                },
                {
                  key: "amount",
                  header: "Сумма заказа",
                  align: "right",
                  cell: (row) => <span className="num">{formatRub(row.amount)}</span>,
                },
                {
                  key: "fee",
                  header: "Комиссия",
                  align: "right",
                  cell: (row) => (
                    <span className="num text-muted">−{formatRub(row.feeAmount)}</span>
                  ),
                },
                {
                  key: "payout",
                  header: "К выплате",
                  align: "right",
                  cell: (row) => (
                    <span className="num font-medium">{formatRub(row.payoutAmount)}</span>
                  ),
                },
                {
                  key: "status",
                  header: "Статус",
                  cell: (row) => (
                    <Tag tone={STATUS_TONE[row.status] ?? "done"}>{row.statusTitle}</Tag>
                  ),
                },
              ]}
            />
          )}
        </Box>

        <aside>
          <Box>
            <h3 className="font-heading text-base font-bold">В эскроу по заказам</h3>
            {(data?.escrowOrders ?? []).length === 0 ? (
              <p className="text-muted mt-1.5 text-[13px]">Активных резервов нет.</p>
            ) : (
              <ul className="mt-2 grid gap-2 text-[13px]">
                {(data?.escrowOrders ?? []).map((row) => (
                  <li key={row.orderId} className="border-border border-b pb-2 last:border-0">
                    <AppLink
                      to={`/seller/orders/${String(row.orderId)}`}
                      className="text-action num font-medium hover:underline"
                    >
                      {row.title}
                    </AppLink>
                    <div className="num">{formatRub(row.amount)}</div>
                    <div className="text-muted text-[12.5px]">{row.note}</div>
                  </li>
                ))}
              </ul>
            )}
          </Box>

          <Box className="mt-3">
            <h3 className="font-heading text-base font-bold">Счёт для выплат</h3>
            <p className="num mt-2 text-[13.5px]">
              р/с …{(data?.payoutAccount ?? "").slice(-4) || "—"}
            </p>
            <p className="text-muted mt-1 text-[12.5px]">
              Смена реквизитов — с задержкой 24 ч и подтверждением владельца.
            </p>
            <Button asChild className="mt-2 w-full">
              <AppLink to="/company">Реквизиты</AppLink>
            </Button>
          </Box>
        </aside>
      </div>
    </>
  );
}
