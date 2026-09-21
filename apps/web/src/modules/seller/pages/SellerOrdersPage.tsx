import type { SellerOrderListItem, SellerStage } from "@partiya/api-contracts";
import {
  Box,
  Button,
  DataTable,
  EmptyState,
  KpiTile,
  PageHeader,
  Skeleton,
  TabBar,
  TabBarItem,
  Tag,
  Toggle,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  capacityPlanOptions,
  getApiService,
  SELLER_KEYS,
  sellerOfferListOptions,
  sellerOrderListOptions,
} from "@/shared/api";
import { formatNumber, formatRub } from "@/shared/lib/format";
import { useSession } from "@/shared/lib/session";
import { AppLink } from "@/shared/ui";

import {
  deadlineNote,
  OFFER_STATUS_TITLE,
  OFFER_STATUS_TONE,
  SELLER_STAGE_ORDER,
  SELLER_STAGE_TITLE,
  SELLER_STAGE_TONE,
  sellerKey,
} from "../lib/view";

/* Макет: экран `factory` — «Заказы завода»: KPI, свободная мощность, очередь заказов
   с вкладками и таблица предложений.

   Подтверждение и отклонение живут прямо в строке: у завода это самое частое действие,
   и заставлять открывать карточку ради двух кнопок — лишний шаг. Оба запроса идут с
   `Idempotency-Key`, потому что двигают деньги и резерв мощности. */

export function SellerOrdersPage() {
  const session = useSession();
  const [stage, setStage] = useState<SellerStage | "all">("all");
  const queryClient = useQueryClient();

  const orders = useQuery(sellerOrderListOptions());
  const offers = useQuery(sellerOfferListOptions());
  const capacity = useQuery(capacityPlanOptions());

  const confirm = useMutation({
    mutationFn: (id: number) => getApiService().confirmSellerOrder(id, sellerKey("confirm", id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SELLER_KEYS.all }),
  });
  const decline = useMutation({
    mutationFn: (id: number) =>
      getApiService().declineSellerOrder(
        id,
        { reason: "Нет свободной мощности на этот срок" },
        sellerKey("decline", id),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SELLER_KEYS.all }),
  });
  const listing = useMutation({
    mutationFn: (input: { id: number; listed: boolean }) =>
      getApiService().setSellerOfferListed(input.id, { listed: input.listed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SELLER_KEYS.offers() }),
  });

  const summary = orders.data?.summary;
  const items = (orders.data?.items ?? []).filter(
    (item) => stage === "all" || item.sellerStage === stage,
  );
  const plan = capacity.data;

  const countOf = (value: SellerStage): number => {
    if (!summary) return 0;
    switch (value) {
      case "new":
        return summary.new;
      case "in_production":
        return summary.inProduction;
      case "quality_control":
        return summary.qualityControl;
      case "shipped":
        return summary.shipped;
      case "paid_out":
        return summary.paidOut;
    }
  };

  return (
    <>
      <PageHeader
        title="Заказы"
        subtitle={
          session.activeOrg
            ? `${session.activeOrg.name} · очередь производства`
            : "Очередь производства"
        }
        actions={
          <Button asChild variant="cta">
            <AppLink to="/seller/offers/new/edit">+ Новое предложение</AppLink>
          </Button>
        }
      />

      <div className="my-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label={plan ? `Загрузка · ${plan.summary.month}` : "Загрузка"}
          value={plan ? `${String(plan.summary.loadPct)} %` : "—"}
          delta={
            plan
              ? `${formatNumber(plan.summary.soldUnits)} из ${formatNumber(plan.summary.totalUnits)} ${plan.summary.unit}`
              : undefined
          }
        />
        <KpiTile
          label="Ждут подтверждения"
          value={summary ? String(summary.awaitingConfirmation) : "—"}
          delta={deadlineNote(summary?.nearestConfirmDeadlineAt ?? null) ?? "срочных нет"}
          deltaTone={summary && summary.awaitingConfirmation > 0 ? "warn" : "muted"}
        />
        <KpiTile label="В эскроу за вас" value={summary ? formatRub(summary.escrowHeld) : "—"} />
        <KpiTile
          label="К выплате"
          value={summary ? formatRub(summary.payoutPlanned) : "—"}
          delta="после приёмки заказчиком"
        />
      </div>

      <Box className="mb-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-bold">Заказы</h2>
          <span className="text-muted text-[12.5px]">
            {summary && summary.awaitingConfirmation > 0
              ? `${String(summary.awaitingConfirmation)} ждёт подтверждения`
              : "срочных нет"}
          </span>
        </div>
        <TabBar label="Ступени заказов" className="mt-2">
          <TabBarItem asChild active={stage === "all"} count={summary?.all}>
            <button
              type="button"
              onClick={() => {
                setStage("all");
              }}
            >
              Все
            </button>
          </TabBarItem>
          {SELLER_STAGE_ORDER.map((value) => (
            <TabBarItem
              key={value}
              asChild
              active={stage === value}
              count={countOf(value) || undefined}
            >
              <button
                type="button"
                onClick={() => {
                  setStage(value);
                }}
              >
                {SELLER_STAGE_TITLE[value]}
              </button>
            </TabBarItem>
          ))}
        </TabBar>

        {orders.isPending ? (
          <Skeleton className="mt-3 h-40" />
        ) : items.length === 0 ? (
          <EmptyState
            className="mt-3"
            title="Заказов в этой вкладке нет"
            description="Как только заказчик оплатит партию, она появится здесь со ступенью «Новый»."
          />
        ) : (
          <DataTable<SellerOrderListItem>
            className="mt-3"
            scrollable
            minWidth={760}
            rows={items}
            rowKey={(row) => row.id}
            rowHighlighted={(row) => row.sellerStage === "new"}
            columns={[
              {
                key: "order",
                header: "Заказ",
                cell: (row) => (
                  <div>
                    <AppLink
                      to={`/seller/orders/${String(row.id)}`}
                      className="text-action font-medium hover:underline"
                    >
                      № {row.id}
                    </AppLink>
                    <div className="text-muted text-[12.5px]">{row.title}</div>
                  </div>
                ),
              },
              { key: "customer", header: "Заказчик", cell: (row) => row.customer },
              {
                key: "status",
                header: "Статус",
                cell: (row) =>
                  row.sellerStage === null ? null : (
                    <span className="flex items-center gap-1">
                      <Tag tone={SELLER_STAGE_TONE[row.sellerStage]}>
                        {SELLER_STAGE_TITLE[row.sellerStage]}
                      </Tag>
                      {row.disputeOpen ? <Tag tone="hot">спор</Tag> : null}
                    </span>
                  ),
              },
              {
                key: "note",
                header: "Примечание",
                cell: (row) => <span className="text-muted text-[12.5px]">{row.note ?? "—"}</span>,
              },
              {
                key: "total",
                header: "Сумма",
                align: "right",
                cell: (row) => <span className="num">{formatRub(row.total)}</span>,
              },
              {
                key: "actions",
                header: "",
                align: "right",
                cell: (row) =>
                  row.sellerStage === "new" ? (
                    <span className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="cta"
                        disabled={confirm.isPending || decline.isPending}
                        onClick={() => confirm.mutate(row.id)}
                      >
                        Подтвердить
                      </Button>
                      <Button
                        size="sm"
                        disabled={confirm.isPending || decline.isPending}
                        onClick={() => decline.mutate(row.id)}
                      >
                        Отклонить
                      </Button>
                    </span>
                  ) : (
                    <Button asChild size="sm">
                      <AppLink to={`/seller/orders/${String(row.id)}`}>Открыть</AppLink>
                    </Button>
                  ),
              },
            ]}
          />
        )}
        {confirm.isError || decline.isError ? (
          <p className="text-danger mt-2 text-[13px]">
            {(confirm.error ?? decline.error)?.message ?? "Команда не прошла"}
          </p>
        ) : null}
      </Box>

      <Box>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-bold">Предложения-SKU</h2>
          <Button asChild size="sm" variant="cta">
            <AppLink to="/seller/offers/new/edit">+ Новое предложение</AppLink>
          </Button>
        </div>
        {offers.isPending ? (
          <Skeleton className="mt-3 h-32" />
        ) : (
          <DataTable
            className="mt-2"
            scrollable
            minWidth={700}
            rows={offers.data?.items ?? []}
            rowKey={(row) => row.id}
            empty={
              <EmptyState
                title="Предложений пока нет"
                description="Без них заказчики не увидят ваш завод."
              />
            }
            columns={[
              {
                key: "title",
                header: "Предложение",
                cell: (row) => (
                  <div>
                    <div className="font-medium">{row.title}</div>
                    <div className="text-muted text-[12.5px]">
                      арт. {row.id} · версия {row.version}
                    </div>
                  </div>
                ),
              },
              {
                key: "status",
                header: "Статус",
                cell: (row) => (
                  <Tag tone={OFFER_STATUS_TONE[row.status]}>{OFFER_STATUS_TITLE[row.status]}</Tag>
                ),
              },
              {
                key: "price",
                header: "Цена от",
                align: "right",
                cell: (row) => (
                  <span className="num">
                    {row.priceFrom === null ? "—" : formatRub(row.priceFrom)}
                  </span>
                ),
              },
              {
                key: "moq",
                header: "MOQ",
                align: "right",
                cell: (row) => (
                  <span className="num">{row.moq === null ? "—" : formatNumber(row.moq)}</span>
                ),
              },
              {
                key: "views",
                header: "Просмотры",
                align: "right",
                cell: (row) => <span className="num">{formatNumber(row.views)}</span>,
              },
              {
                key: "orders",
                header: "Заказов",
                align: "right",
                cell: (row) => <span className="num">{row.orders}</span>,
              },
              {
                key: "listed",
                header: "В выдаче",
                cell: (row) => (
                  <Toggle
                    checked={row.listed}
                    disabled={row.status !== "published" || listing.isPending}
                    aria-label={`Показывать «${row.title}» в выдаче`}
                    onCheckedChange={(next) => listing.mutate({ id: row.id, listed: next })}
                  />
                ),
              },
              {
                key: "edit",
                header: "",
                align: "right",
                cell: (row) => (
                  <Button asChild size="sm">
                    <AppLink to={`/seller/offers/${String(row.id)}/edit`}>Изменить</AppLink>
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
