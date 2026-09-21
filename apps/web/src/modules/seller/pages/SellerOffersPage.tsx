import type { SellerOfferListItem, SellerOfferStatus } from "@partiya/api-contracts";
import {
  Alert,
  Box,
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  Placeholder,
  Skeleton,
  TabBar,
  TabBarItem,
  Tag,
  Toggle,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getApiService, SELLER_KEYS, sellerOfferListOptions } from "@/shared/api";
import { formatNumber, formatRub } from "@/shared/lib/format";
import { AppLink } from "@/shared/ui";

import { OFFER_STATUS_TITLE, OFFER_STATUS_TONE } from "../lib/view";

/* Макет: экран `seller-offers` — выкладка SKU как на маркетплейсе.

   Тумблер «В выдаче» не меняет статус: скрытое предложение остаётся опубликованным и
   возвращается без повторной модерации (ARCHITECTURE.md, 5.1). */

type Tab = "all" | "listed" | "hidden" | "moderation" | "draft";

const TABS: { key: Tab; title: string }[] = [
  { key: "all", title: "Все" },
  { key: "listed", title: "В выдаче" },
  { key: "hidden", title: "Скрытые" },
  { key: "moderation", title: "На модерации" },
  { key: "draft", title: "Черновики" },
];

function matches(item: SellerOfferListItem, tab: Tab): boolean {
  switch (tab) {
    case "listed":
      return item.listed;
    case "hidden":
      return item.status === "published" && !item.listed;
    case "moderation":
      return item.status === "moderation";
    case "draft":
      return item.status === "draft";
    default:
      return true;
  }
}

export function SellerOffersPage() {
  const [tab, setTab] = useState<Tab>("all");
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(sellerOfferListOptions());

  const listing = useMutation({
    mutationFn: (input: { id: number; listed: boolean }) =>
      getApiService().setSellerOfferListed(input.id, { listed: input.listed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SELLER_KEYS.offers() }),
  });

  const items = (data?.items ?? []).filter((item) => matches(item, tab));
  const counts = data?.counts;
  const countOf = (key: Tab): number | undefined => {
    if (!counts) return undefined;
    switch (key) {
      case "all":
        return counts.all;
      case "listed":
        return counts.listed;
      case "hidden":
        return counts.hidden;
      case "moderation":
        return counts.moderation;
      case "draft":
        return counts.draft;
    }
  };

  return (
    <>
      <PageHeader
        title="Предложения"
        subtitle="Выкладка как на маркетплейсе: цена по объёму, MOQ, срок, фото. Изменение цены создаёт новую версию — старые заказы не затрагиваются."
        actions={
          <Button asChild variant="cta">
            <AppLink to="/seller/offers/new/edit">+ Новое предложение</AppLink>
          </Button>
        }
      />

      <TabBar label="Состояния предложений" className="mb-3">
        {TABS.map((item) => (
          <TabBarItem
            key={item.key}
            asChild
            active={tab === item.key}
            count={countOf(item.key) || undefined}
          >
            <button
              type="button"
              onClick={() => {
                setTab(item.key);
              }}
            >
              {item.title}
            </button>
          </TabBarItem>
        ))}
      </TabBar>

      <Box>
        {isPending ? (
          <Skeleton className="h-48" />
        ) : (
          <DataTable<SellerOfferListItem>
            rows={items}
            rowKey={(row) => row.id}
            scrollable
            minWidth={880}
            empty={
              <EmptyState
                title="В этой вкладке пусто"
                description="Добавьте предложение — без него заказчики не увидят ваш завод."
                action={
                  <Button asChild variant="cta">
                    <AppLink to="/seller/offers/new/edit">+ Новое предложение</AppLink>
                  </Button>
                }
              />
            }
            columns={[
              {
                key: "title",
                header: "Предложение",
                cell: (row) => (
                  <div className="flex items-center gap-2">
                    <Placeholder
                      tone={row.tone ?? "a"}
                      radius="control"
                      className="size-9 flex-none"
                    />
                    <div className="min-w-0">
                      <AppLink
                        to={`/seller/offers/${String(row.id)}/edit`}
                        className="text-action font-medium hover:underline"
                      >
                        {row.title}
                      </AppLink>
                      <div className="text-muted text-[12.5px]">
                        арт. {row.id} · версия {row.version}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: "status",
                header: "Статус",
                cell: (row) => (
                  <Tag tone={OFFER_STATUS_TONE[row.status as SellerOfferStatus]}>
                    {OFFER_STATUS_TITLE[row.status]}
                  </Tag>
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
                key: "impressions",
                header: "Показы",
                align: "right",
                cell: (row) => <span className="num">{formatNumber(row.impressions)}</span>,
              },
              {
                key: "views",
                header: "Просмотры",
                align: "right",
                cell: (row) => <span className="num">{formatNumber(row.views)}</span>,
              },
              {
                key: "compare",
                header: "В сравн.",
                align: "right",
                cell: (row) => <span className="num">{formatNumber(row.inCompare)}</span>,
              },
              {
                key: "orders",
                header: "Заказов",
                align: "right",
                cell: (row) => <span className="num">{row.orders}</span>,
              },
              {
                key: "conversion",
                header: "Конверсия",
                align: "right",
                cell: (row) => (
                  <span className="num">
                    {row.conversionPct === null
                      ? "—"
                      : `${row.conversionPct.toString().replace(".", ",")} %`}
                  </span>
                ),
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

      {data?.hint ? (
        <Alert
          kind="info"
          className="mt-3"
          title={data.hint.title}
          action={
            <Button asChild size="sm">
              <AppLink to={`/seller/offers/${String(data.hint.offerId)}/edit`}>
                Изменить условия
              </AppLink>
            </Button>
          }
        >
          {data.hint.text}
        </Alert>
      ) : null}
    </>
  );
}
