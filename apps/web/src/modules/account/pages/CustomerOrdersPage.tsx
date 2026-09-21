import type { OrderListItem } from "@partiya/api-contracts";
import {
  Alert,
  Box,
  Button,
  DataTable,
  EmptyState,
  KpiTile,
  MiniBar,
  Skeleton,
  TabBar,
  TabBarItem,
  Tag,
} from "@partiya/ui";
import { useQuery } from "@tanstack/react-query";

import { isApiError, orderListOptions } from "@/shared/api";
import { formatIsoDayMonth } from "@/shared/lib/dates";
import { formatNumber, formatRub, toRubles } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import { isDraftStatus, orderStatusTitle, orderStatusTone } from "@/shared/lib/order-status";
import { AppLink } from "@/shared/ui";

import type { OrderTab } from "../api/fixtures";

/* Макет: экран customer — KPI, вкладки, таблица заказов и блок повторных партий.

   Заказы берутся из домена «Заказы» (`GET /orders`), а не из фикстур: там же лежат
   черновики оформления, и человек должен видеть незаконченную партию рядом с готовыми.
   У новой компании заказов нет — тогда показывается пустое состояние из state-empty. */

const TABS: { key: OrderTab; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "work", label: "В работе" },
  { key: "action", label: "Ждут действия" },
  { key: "done", label: "Получены" },
  { key: "cancelled", label: "Отменённые" },
];

export interface CustomerOrdersPageProps {
  tab: OrderTab;
  onTabChange: (tab: OrderTab) => void;
}

export function CustomerOrdersPage({ tab, onTabChange }: CustomerOrdersPageProps) {
  // счётчики вкладок считаются по полной выдаче, поэтому фильтр — на клиенте
  const query = useQuery(orderListOptions());
  const orders = query.data?.items ?? [];
  // KPI считает сервер по всей выдаче: «в эскроу» обязано сходиться с разделом «Эскроу»
  const summary = query.data?.summary;
  // карточки повтора — из завершённых заказов, а не из отдельной фикстуры
  const repeat = orders.filter((order) => order.bucket === "done").slice(0, 2);

  const countOf = (bucket: OrderTab) =>
    bucket === "all" ? orders.length : orders.filter((order) => order.bucket === bucket).length;
  const rows = tab === "all" ? orders : orders.filter((order) => order.bucket === tab);

  const active = summary?.active ?? orders.filter((order) => order.bucket !== "done").length;
  const hasData = orders.length > 0;

  if (query.isError) {
    return (
      <Alert kind="danger" title="Не удалось загрузить заказы">
        {isApiError(query.error) ? query.error.message : "Попробуйте обновить страницу."}
      </Alert>
    );
  }

  return (
    <>
      {/* Заголовок страницы: он был единственным экраном кабинета без <h1> —
          скринридер и оглавление начинались сразу с плиток. */}
      <h1 className="font-heading mb-3 text-2xl font-bold">Заказы</h1>

      <div className="mb-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Активных заказов" value={query.isPending ? "—" : active} />
        <KpiTile label="В эскроу" value={summary ? formatRub(summary.escrowTotal) : "—"} />
        <KpiTile
          label="Ближайшая отгрузка"
          value={
            summary?.nearestShipDate == null
              ? "—"
              : (formatIsoDayMonth(summary.nearestShipDate) ?? "—")
          }
        />
        <KpiTile
          label="Экономия за повторы"
          value={summary ? formatRub(summary.savedOnRepeats) : "—"}
          delta={
            summary && summary.repeatOrders > 0
              ? `на ${String(summary.repeatOrders)} ${plural(summary.repeatOrders, ["партии", "партиях", "партиях"])}`
              : undefined
          }
          deltaTone="up"
        />
      </div>

      <Box>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-bold">Заказы</h2>
          <Button asChild variant="cta" size="sm">
            <AppLink to="/catalog">+ Новая партия</AppLink>
          </Button>
        </div>

        {query.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : !hasData ? (
          <EmptyState
            title="Заказов пока нет"
            description="Найдите предложение, соберите партию — и она появится здесь с трекингом производства."
            action={
              <Button asChild variant="cta">
                <AppLink to="/catalog">Перейти в каталог</AppLink>
              </Button>
            }
          />
        ) : (
          <>
            <TabBar label="Фильтр заказов" className="mb-2.5">
              {TABS.map((item) => (
                <TabBarItem
                  key={item.key}
                  asChild
                  active={item.key === tab}
                  count={countOf(item.key) || undefined}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onTabChange(item.key);
                    }}
                  >
                    {item.label}
                  </button>
                </TabBarItem>
              ))}
            </TabBar>

            <DataTable
              rows={rows}
              rowKey={(row) => row.id}
              minWidth={760}
              empty={
                <EmptyState
                  title="Нет заказов с таким статусом"
                  action={
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onTabChange("all");
                      }}
                    >
                      Сбросить фильтр
                    </Button>
                  }
                />
              }
              columns={[
                {
                  key: "order",
                  header: "Заказ",
                  cell: (row: OrderListItem) => (
                    <AppLink {...orderHref(row)}>
                      <span className="block font-medium">
                        {isDraftStatus(row.status) ? "Черновик" : `№ ${String(row.id)}`}
                      </span>
                      <span className="text-muted block text-[12.5px]">{row.title}</span>
                    </AppLink>
                  ),
                },
                { key: "factory", header: "Фабрика", cell: (row) => row.factory },
                {
                  key: "status",
                  header: "Статус",
                  cell: (row) => (
                    <Tag tone={orderStatusTone(row.status)}>{orderStatusTitle(row.status)}</Tag>
                  ),
                },
                {
                  key: "progress",
                  header: "Готовность",
                  cell: (row) => (
                    <span className="whitespace-nowrap">
                      <MiniBar value={row.progressPct} />
                      <span className="num text-[12.5px]">{row.progressPct} %</span>
                    </span>
                  ),
                },
                {
                  key: "ship",
                  header: "Отгрузка",
                  cell: (row) => formatIsoDayMonth(row.shipDate ?? undefined) ?? "—",
                },
                {
                  key: "sum",
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
                      variant={isDraftStatus(row.status) ? "cta" : "default"}
                    >
                      <AppLink {...orderHref(row)}>
                        {isDraftStatus(row.status) ? "Продолжить оформление" : "Открыть"}
                      </AppLink>
                    </Button>
                  ),
                },
              ]}
            />
          </>
        )}
      </Box>

      {repeat.length > 0 && (
        <>
          <h2 className="font-heading mt-4 mb-2.5 flex items-center gap-2 text-lg font-bold">
            Повторные партии
            {repeat[0]?.repeatDiscountPercent != null && (
              <Tag tone="disc">−{repeat[0].repeatDiscountPercent} %</Tag>
            )}
          </h2>
          <div className="grid gap-2.5 md:grid-cols-2">
            {repeat.map((item) => (
              <Box key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <b className="block">{item.title}</b>
                  <div className="text-muted text-[12.5px]">{item.spec}</div>
                  <div className="mt-1 text-[12.5px]">
                    было{" "}
                    <span className="num">{formatNumber(toRubles(item.unitPrice ?? 0))} ₽</span> →{" "}
                    <b className="num text-discount whitespace-nowrap">
                      {formatNumber(
                        toRubles(
                          Math.round(
                            ((item.unitPrice ?? 0) * (100 - (item.repeatDiscountPercent ?? 0))) /
                              100,
                          ),
                        ),
                      )}{" "}
                      ₽/шт
                    </b>
                  </div>
                </div>
                <Button asChild variant="cta">
                  <AppLink to="/account/repeat">Повторить</AppLink>
                </Button>
              </Box>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** Черновик ведёт обратно в оформление, неоплаченный заказ — к счёту, остальные — в трекинг. */
function orderHref(row: OrderListItem): { to: string; search?: Record<string, unknown> } {
  if (isDraftStatus(row.status)) return { to: "/order/new", search: { draft: row.id } };
  if (row.status === "awaiting_payment") return { to: `/order/${String(row.id)}/pay` };
  return { to: `/account/orders/${String(row.id)}` };
}
