import { Alert, Box, Button, KpiTile, PageHeader, ProgressBar, Skeleton } from "@partiya/ui";
import { useQuery } from "@tanstack/react-query";

import { adminOverviewOptions } from "@/shared/api";
import { formatNumber, formatRub } from "@/shared/lib/format";
import { AppLink } from "@/shared/ui";

/* Макет: экран `admin-home` — обзор оператора: очереди и то, что горит.

   KPI и очереди приходят одним запросом: цифра «7 в модерации» в плитке и в списке —
   одна и та же выборка, и расходиться им нельзя. */

export function AdminHomePage() {
  const { data, isPending } = useQuery(adminOverviewOptions());

  if (isPending || !data) {
    return (
      <>
        <PageHeader title="Обзор" subtitle="Очереди и то, что горит" />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      </>
    );
  }

  const maxStage = Math.max(1, ...data.stages.map((row) => row.count));

  return (
    <>
      <PageHeader title="Обзор" subtitle={data.todayNote} />

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="GMV · месяц"
          value={formatRub(data.gmvMonth)}
          delta={
            data.gmvDeltaPct === null ? undefined : `+${String(data.gmvDeltaPct)} % к прошлому`
          }
          deltaTone="up"
        />
        <KpiTile
          label="В эскроу"
          value={formatRub(data.escrowTotal)}
          delta={`по ${String(data.escrowOrders)} заказам`}
        />
        {/* бэк считает по проводкам ledger закрытых сделок, а не 8 % с оборота */}
        <KpiTile
          label="Удержано комиссии за месяц"
          value={formatRub(data.feeMonth)}
          delta="по закрытым сделкам"
        />
        <KpiTile
          label="Заказов в работе"
          value={formatNumber(data.ordersInWork)}
          delta={
            data.ordersOverdue > 0 ? `${String(data.ordersOverdue)} просрочено` : "просрочек нет"
          }
          deltaTone={data.ordersOverdue > 0 ? "warn" : "muted"}
        />
      </div>

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
        <Box>
          <h3 className="font-heading text-base font-bold">Очереди</h3>
          <table className="mt-2 w-full border-collapse text-[13.5px]">
            <tbody>
              {data.queues.map((queue) => (
                <tr key={queue.key} className="border-border border-b last:border-0">
                  <td className="py-2 font-medium">{queue.title}</td>
                  <td className="num py-2 text-right">
                    <b>{queue.count}</b>
                  </td>
                  <td className="text-muted py-2 ps-3 text-[12.5px]">{queue.note ?? "—"}</td>
                  <td className="py-2 text-right">
                    <Button asChild size="sm">
                      <AppLink to={queue.href}>Открыть</AppLink>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>

        <Box>
          <h3 className="font-heading text-base font-bold">Бизнес-алерты</h3>
          <div className="mt-2 grid gap-2">
            {data.alerts.length === 0 ? (
              <p className="text-muted text-[13px]">Ничего не горит.</p>
            ) : (
              data.alerts.map((alert) => (
                <Alert
                  key={alert.id}
                  kind={alert.kind}
                  title={alert.title}
                  action={
                    alert.actionHref === null || alert.actionLabel === null ? null : (
                      <Button asChild size="sm">
                        <AppLink to={alert.actionHref}>{alert.actionLabel}</AppLink>
                      </Button>
                    )
                  }
                >
                  {alert.text}
                </Alert>
              ))
            )}
          </div>
        </Box>
      </div>

      <Box className="mt-3">
        <h3 className="font-heading text-base font-bold">Сделки по этапам</h3>
        <div className="mt-2 grid gap-1">
          {data.stages.map((stage) => (
            <div
              key={stage.key}
              className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1 py-[5px] text-[13px] sm:grid-cols-[minmax(10rem,1fr)_2fr_auto]"
            >
              <span>{stage.title}</span>
              <ProgressBar
                className="order-last col-span-2 sm:order-none sm:col-span-1"
                label={stage.title}
                value={Math.round((stage.count / maxStage) * 100)}
              />
              <b className="num text-right">{stage.count}</b>
            </div>
          ))}
        </div>
      </Box>
    </>
  );
}
