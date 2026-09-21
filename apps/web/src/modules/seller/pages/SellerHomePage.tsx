import {
  Alert,
  Box,
  Button,
  EmptyState,
  KpiTile,
  PageHeader,
  ProgressBar,
  Skeleton,
} from "@partiya/ui";
import { useQuery } from "@tanstack/react-query";

import { sellerDashboardOptions } from "@/shared/api";
import { formatIsoDate } from "@/shared/lib/dates";
import { formatNumber, formatRub } from "@/shared/lib/format";
import { useSession } from "@/shared/lib/session";
import { AppLink } from "@/shared/ui";

import { deadlineNote } from "../lib/view";

/* Макет: экран `seller-home` — сводка завода.
   Все цифры приходят из `GET /seller/dashboard`: KPI обязаны сходиться с очередью
   заказов и планом мощности, а пять независимых запросов рано или поздно покажут
   сумму от одного момента и список от другого. */

export function SellerHomePage() {
  const session = useSession();
  const org = session.activeOrg;
  const { data, isPending, isError } = useQuery(sellerDashboardOptions());

  if (isPending) {
    return (
      <>
        <PageHeader title="Сводка" subtitle={org?.name ?? "Завод"} />
        <div className="my-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <PageHeader title="Сводка" subtitle={org?.name ?? "Завод"} />
        <Box>
          <EmptyState
            title="Сводка пока недоступна"
            description="Не удалось получить показатели кабинета. Обновите страницу."
          />
        </Box>
      </>
    );
  }

  const { capacity, finance, funnel, orders, todo, urgentOrder, quality, ranking } = data;
  const empty = orders.all === 0;

  return (
    <>
      <PageHeader
        title="Сводка"
        subtitle={`${org?.name ?? "Завод"} · ${capacity.month}`}
        actions={
          <Button asChild variant="cta">
            <AppLink to="/seller/offers/new/edit">+ Новое предложение</AppLink>
          </Button>
        }
      />

      {urgentOrder ? (
        <Alert
          kind="warn"
          title={`Новый заказ № ${String(urgentOrder.id)} · ${formatRub(urgentOrder.total)} — подтвердите вовремя`}
          action={
            <Button asChild variant="cta" size="sm">
              <AppLink to={`/seller/orders/${String(urgentOrder.id)}`}>Открыть</AppLink>
            </Button>
          }
        >
          {urgentOrder.customer} · {urgentOrder.title}. Деньги уже в эскроу. Без подтверждения заказ
          отменится, а рейтинг в выдаче снизится.{" "}
          {deadlineNote(urgentOrder.confirmDeadlineAt) ?? ""}
        </Alert>
      ) : null}

      <div className="my-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label={`Загрузка · ${capacity.month}`}
          value={<span className="whitespace-nowrap">{capacity.loadPct} %</span>}
          delta={`${formatNumber(capacity.soldUnits)} из ${formatNumber(capacity.totalUnits)} ${capacity.unit}`}
        />
        <KpiTile
          label="В эскроу за вас"
          value={formatRub(finance.escrowHeld)}
          delta={`по ${String(orders.all - orders.paidOut)} заказам`}
        />
        <KpiTile
          label="Выплачено"
          value={formatRub(finance.paidMonth)}
          delta={
            finance.nextPayoutAt === null
              ? "следующей выплаты пока нет"
              : `следующая ${formatIsoDate(finance.nextPayoutAt) ?? ""}`
          }
        />
        <KpiTile
          label="Позиция в «Популярных»"
          value={ranking === null ? "—" : `№ ${String(ranking.position)}`}
          delta={
            ranking === null
              ? "нет опубликованных предложений"
              : `в категории «${ranking.category}» · +${String(ranking.deltaWeek)} за неделю`
          }
          deltaTone={ranking === null ? "muted" : "up"}
        />
      </div>

      {empty ? (
        <Box>
          <EmptyState
            title="Заказов ещё не было"
            description="Первый заказ обычно приходит на второй неделе после публикации предложений."
            action={
              <Button asChild>
                <AppLink to="/capacity">Заполнить мощность</AppLink>
              </Button>
            }
          />
        </Box>
      ) : null}

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Box>
          <h3 className="font-heading text-base font-bold">Нужно сделать сегодня</h3>
          {todo.length === 0 ? (
            <p className="text-muted mt-2 text-[13.5px]">Срочных дел нет — хороший день.</p>
          ) : (
            <ol className="mt-2">
              {todo.map((item) => (
                <li
                  key={item.key}
                  className="border-border relative border-b border-dashed py-[7px] ps-7 text-[13.5px] last:border-0"
                >
                  <span
                    aria-hidden="true"
                    className={
                      item.urgent
                        ? "border-action ring-action-soft absolute start-0 top-2 size-4 rounded-full border-2 ring-[3px]"
                        : "border-border-strong absolute start-0 top-2 size-4 rounded-full border-2"
                    }
                  />
                  <AppLink to={item.href} className="text-action hover:underline">
                    {item.title}
                  </AppLink>{" "}
                  {item.note === null ? null : (
                    <span className="text-muted text-[12.5px]">{item.note}</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Box>

        <Box>
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-base font-bold">Воронка · 30 дней</h3>
            <AppLink to="/seller/offers" className="text-action text-[12.5px] hover:underline">
              по предложениям →
            </AppLink>
          </div>
          <div className="mt-2 grid gap-1">
            {funnel.steps.map((step) => (
              <div
                key={step.key}
                className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1 py-[5px] text-[13px] sm:grid-cols-[minmax(6rem,1fr)_2fr_auto]"
              >
                <span className="min-w-0">{step.title}</span>
                <ProgressBar
                  className="order-last col-span-2 sm:order-none sm:col-span-1"
                  label={step.title}
                  value={step.pct}
                />
                <b className="num text-right">{formatNumber(step.value)}</b>
              </div>
            ))}
          </div>
          <p className="text-muted mt-2 text-[12.5px]">
            Конверсия показ → заказ: {funnel.conversionPct.toString().replace(".", ",")} %
          </p>
        </Box>
      </div>

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
        <Box>
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-base font-bold">Загрузка по неделям</h3>
            <AppLink to="/capacity" className="text-action text-[12.5px] hover:underline">
              Мощность →
            </AppLink>
          </div>
          <div className="mt-2 flex h-24 items-end gap-1.5">
            {capacity.weeks.map((week) => (
              <div key={week.label} className="flex h-full flex-1 flex-col justify-end gap-1">
                <span
                  aria-hidden="true"
                  className={`block rounded-t-[3px] ${week.loadPct < 30 ? "bg-warning" : "bg-action"} opacity-85`}
                  style={{ height: `${String(Math.max(2, week.loadPct))}%` }}
                />
                <span className="text-muted text-center text-[10.5px]">{week.label}</span>
              </div>
            ))}
          </div>
          <p className="text-muted mt-2 text-[12.5px]">
            Недозагруженные недели помечены оранжевым и продвигаются со скидкой.
          </p>
        </Box>

        <Box>
          <h3 className="font-heading text-base font-bold">Качество работы</h3>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-[13.5px]">
            {quality.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-muted">{row.label}</dt>
                <dd className="m-0 text-right font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Box>
      </div>
    </>
  );
}
