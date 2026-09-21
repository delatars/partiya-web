import {
  Alert,
  Box,
  Button,
  DataTable,
  EmptyState,
  KpiTile,
  PageHeader,
  Skeleton,
  Tag,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ADMIN_KEYS, adminFinanceOptions, getApiService, isApiError } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/dates";
import { formatRub } from "@/shared/lib/format";
import { AppLink } from "@/shared/ui";

/* Макет: экран `admin-finance` — сверка ledger и две очереди: поступления и выплаты.

   «Подтвердить поступление» — ручной провайдер расчётов (Q-190): оператор видит
   платёжное поручение в выписке банка и подтверждает его здесь. Заказ заказчика тут же
   переходит в «ожидает подтверждения», а завод видит его во вкладке «Новые».

   Оба запроса идут с `Idempotency-Key`: повтор после обрыва связи не должен провести
   деньги дважды. */

export function AdminFinancePage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(adminFinanceOptions());

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all });

  const confirmFunds = useMutation({
    mutationFn: (trancheId: string) =>
      getApiService().confirmTrancheFunds(
        trancheId,
        { externalRef: `ПП · подтверждено оператором` },
        `admin:funds:${trancheId}`,
      ),
    onSuccess: invalidate,
  });
  const payout = useMutation({
    mutationFn: (dealId: string) =>
      getApiService().confirmDealPayout(
        dealId,
        { externalRef: `ПП · выплата заводу` },
        `admin:payout:${dealId}`,
      ),
    onSuccess: invalidate,
  });

  if (isPending || !data) {
    return (
      <>
        <PageHeader title="Финансы и сверка" subtitle="Ledger ↔ выписка банка-партнёра" />
        <Skeleton className="h-64" />
      </>
    );
  }

  const ready = data.payouts.filter((row) => row.ready);

  return (
    <>
      <PageHeader
        title="Финансы и сверка"
        subtitle={`Ledger ↔ выписка банка-партнёра · последняя сверка ${
          data.lastCheckedAt === null ? "не проводилась" : formatDateTime(data.lastCheckedAt)
        }`}
      />

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Эскроу по ledger" value={formatRub(data.reconciliation.escrowHeld)} />
        <KpiTile
          label="Ожидается на номинальном счёте"
          value={formatRub(data.reconciliation.nominalExpected)}
          delta="принято, но не роздано"
        />
        <KpiTile
          label="Расхождение"
          value={data.nominalActual === null ? "—" : formatRub(data.discrepancy)}
          delta={
            data.nominalActual === null ? "выписка банка не загружена (Q-10)" : "сверено с выпиской"
          }
          deltaTone={data.nominalActual === null ? "warn" : "muted"}
        />
        <KpiTile
          label="К выплате сегодня"
          value={formatRub(data.payoutTodayTotal)}
          delta={`${String(data.payoutTodayFactories)} заводам`}
        />
      </div>

      {data.reconciliation.consistent ? null : (
        <Alert kind="danger" className="mt-3" title="Журнал не сходится">
          Записей с ненулевым сальдо: {data.reconciliation.unbalancedEntries}. Ручные проводки
          заблокированы до разбора.
        </Alert>
      )}

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
        <Box>
          <h3 className="font-heading text-base font-bold">Ожидают поступления</h3>
          <DataTable
            className="mt-2"
            rows={data.tranches}
            rowKey={(row) => row.trancheId}
            rowHighlighted={(row) => row.overdue}
            scrollable
            minWidth={520}
            empty={
              <EmptyState
                title="Все счета оплачены"
                description="Новых поступлений к сопоставлению нет."
              />
            }
            columns={[
              {
                key: "payer",
                header: "Плательщик",
                cell: (row) => (
                  <div>
                    <b>{row.payerName ?? row.payerOrgId}</b>
                    <div className="text-muted text-[12.5px]">{row.subjectTitle ?? ""}</div>
                  </div>
                ),
              },
              {
                key: "reference",
                header: "Назначение",
                cell: (row) => <span className="text-muted text-[12.5px]">{row.reference}</span>,
              },
              {
                key: "amount",
                header: "Сумма",
                align: "right",
                cell: (row) => <span className="num">{formatRub(row.amount)}</span>,
              },
              {
                key: "action",
                header: "",
                align: "right",
                cell: (row) => (
                  <Button
                    size="sm"
                    variant="cta"
                    disabled={confirmFunds.isPending}
                    onClick={() => confirmFunds.mutate(row.trancheId)}
                  >
                    Подтвердить поступление
                  </Button>
                ),
              },
            ]}
          />
          {confirmFunds.error ? (
            <p className="text-danger mt-2 text-[13px]">
              {isApiError(confirmFunds.error) ? confirmFunds.error.message : "Не прошло"}
            </p>
          ) : null}
          <p className="text-muted mt-2 text-[12.5px]">
            Частичная оплата не поддерживается: сумма обязана совпасть со счётом (Q-192).
          </p>
        </Box>

        <Box>
          <h3 className="font-heading text-base font-bold">Очередь выплат</h3>
          <DataTable
            className="mt-2"
            rows={data.payouts}
            rowKey={(row) => row.dealId}
            scrollable
            minWidth={520}
            empty={<EmptyState title="Выплат нет" description="Ни одна партия ещё не принята." />}
            columns={[
              {
                key: "factory",
                header: "Завод",
                cell: (row) => (
                  <div>
                    <b>{row.factoryName}</b>
                    <div className="text-muted text-[12.5px]">
                      {row.orderId === null ? (
                        row.subtitle
                      ) : (
                        <AppLink
                          to={`/account/orders/${String(row.orderId)}`}
                          className="text-action hover:underline"
                        >
                          {row.subtitle}
                        </AppLink>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: "amount",
                header: "К выплате",
                align: "right",
                cell: (row) => <span className="num">{formatRub(row.amount)}</span>,
              },
              {
                key: "status",
                header: "Статус",
                cell: (row) =>
                  row.ready ? (
                    <Tag tone="ok">готово</Tag>
                  ) : (
                    <Tag tone="work">{row.blocker ?? "ждёт"}</Tag>
                  ),
              },
              {
                key: "action",
                header: "",
                align: "right",
                cell: (row) => (
                  <Button
                    size="sm"
                    disabled={!row.ready || payout.isPending}
                    onClick={() => payout.mutate(row.dealId)}
                  >
                    Выплатить
                  </Button>
                ),
              },
            ]}
          />
          {payout.error ? (
            <p className="text-danger mt-2 text-[13px]">
              {isApiError(payout.error) ? payout.error.message : "Не прошло"}
            </p>
          ) : null}
          <div className="mt-2 flex justify-end">
            <Button
              variant="cta"
              disabled={ready.length === 0 || payout.isPending}
              onClick={() => {
                for (const row of ready) payout.mutate(row.dealId);
              }}
            >
              Отправить в банк · {ready.length}
            </Button>
          </div>
        </Box>
      </div>

      <Box className="mt-3">
        <h3 className="font-heading text-base font-bold">Остатки по видам счетов</h3>
        <table className="mt-2 w-full border-collapse text-[13.5px]">
          <tbody>
            {data.reconciliation.byKind.map((row) => (
              <tr key={row.kind} className="border-border border-b last:border-0">
                <td className="py-1.5">{row.title}</td>
                <td className="num py-1.5 text-right">{formatRub(row.balance)}</td>
              </tr>
            ))}
            <tr>
              <td className="text-muted py-1.5">Сумма всех проводок (контроль)</td>
              <td className="num py-1.5 text-right">{data.reconciliation.journalTotal}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-muted mt-2 text-[12.5px]">
          Любая ручная проводка требует комментария и второго оператора. Все действия — в
          аудит-логе.
        </p>
      </Box>
    </>
  );
}
