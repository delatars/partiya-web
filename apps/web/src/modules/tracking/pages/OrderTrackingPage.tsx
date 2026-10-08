import type { ArtworkSignoff, Order } from "@partiya/api-contracts";
import {
  Alert,
  Box,
  Breadcrumbs,
  BreadcrumbLink,
  BreadcrumbPage,
  Button,
  Skeleton,
  Tag,
  Textarea,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import {
  getApiService,
  isApiError,
  ORDER_KEYS,
  orderEscrowOptions,
  orderEventsOptions,
  orderOptions,
  PAYMENT_KEYS,
} from "@/shared/api";
import { formatDateTime, formatIsoDayMonth, workingDaysLeft } from "@/shared/lib/dates";
import { formatRub } from "@/shared/lib/format";
import type { OrderActionKind } from "@/shared/lib/order-actions";
import { orderStatusTitle, orderStatusTone } from "@/shared/lib/order-status";
import { plural } from "@/shared/lib/plural";
import { AppLink, ErrorPage, useAppNavigate } from "@/shared/ui";

import { ChatPanel } from "@/shared/ui";
import { ConnectionBadge } from "@/shared/ui";
import { DocsList } from "@/shared/ui";
import { EscrowCard } from "@/shared/ui";
import { EventFeed } from "@/shared/ui";
import { PhotoStrip, PhotoViewer } from "@/shared/ui";
import { PipelineBar } from "@/shared/ui";
import { ProgressRows } from "@/shared/ui";
import { OrderActions } from "../components/OrderActions";
import type { FeedFilter } from "@/shared/lib/order-feed";
import { useOrderFeed } from "@/shared/lib/use-order-feed";

/* Макет: экран `tracking` — «Заказ № 4812».
 *
 * Как устроен экран. Заказ приходит одним запросом со всеми проекциями (`Order.tracking`,
 * `escrow`, `acceptance`, `dispute`), а журнал — отдельной страницей плюс живым каналом.
 * Такое разделение не случайно: шапка обязана быть согласованной сама с собой, а лента
 * растёт без предела, и грузить её целиком нельзя.
 *
 * Что считает браузер: группировку ленты по дням, фильтр и форматы. Всё остальное —
 * этапы, проценты, доступные действия, суммы — приходит с сервера или считается общими
 * проекциями из `shared/lib`, теми же, что у мок-бэкенда. */

export interface OrderTrackingPageProps {
  orderId: number;
  /** Демо-пульт: собирается в маршруте и существует только при `useMocks`. */
  demoPanel?: ReactNode;
}

export function OrderTrackingPage({ orderId, demoPanel }: OrderTrackingPageProps) {
  const queryClient = useQueryClient();
  const navigate = useAppNavigate();
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState<OrderActionKind | undefined>(undefined);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const orderQuery = useQuery(orderOptions(orderId));
  const eventsQuery = useQuery({
    ...orderEventsOptions(orderId),
    // журнала нет до оплаты — и спрашивать его незачем
    enabled: orderQuery.data?.paidAt != null,
  });

  const feed = useOrderFeed(orderId, eventsQuery.data?.items ?? [], {
    onOrderChanged: () => {
      void queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.deal(orderId) });
    },
  });
  // 50/50 (п. 4): транши — отдельным запросом сделки, только у схемы из двух платежей
  const escrowDeal = useQuery({
    ...orderEscrowOptions(orderId),
    enabled: orderQuery.data?.escrow?.method === "escrow_split_50_50",
  });

  const approve = useMutation({
    mutationFn: () => getApiService().approveArtwork(orderId),
    onMutate: () => {
      setPending("approve_artwork");
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(ORDER_KEYS.detail(orderId), updated);
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
      setActionError(undefined);
    },
    onError: (error) => {
      setActionError(isApiError(error) ? error.message : "Не получилось согласовать макет");
    },
    onSettled: () => {
      setPending(undefined);
    },
  });

  const repeat = useMutation({
    mutationFn: () => getApiService().repeatOrder(orderId, `repeat:${String(orderId)}`),
    onMutate: () => {
      setPending("repeat");
    },
    onSuccess: (result) => {
      queryClient.setQueryData(ORDER_KEYS.detail(result.order.id), result.order);
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
      // черновик уже на сервере — уходим в оформление по его номеру, а не по параметрам
      navigate({ to: "/order/new", search: { draft: result.order.id } });
    },
    onError: (error) => {
      setActionError(isApiError(error) ? error.message : "Не получилось повторить партию");
    },
    onSettled: () => {
      setPending(undefined);
    },
  });

  const cancel = useMutation({
    mutationFn: () =>
      getApiService().cancelOrder(orderId, {
        reason: cancelReason.trim().length > 0 ? cancelReason.trim() : null,
      }),
    onMutate: () => {
      setPending("cancel");
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(ORDER_KEYS.detail(orderId), updated);
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
      setCancelOpen(false);
      setCancelReason("");
      setActionError(undefined);
    },
    onError: (error) => {
      setCancelOpen(false);
      // п. 17: после оплаты — только через оператора; статус мог смениться, перечитываем
      if (isApiError(error) && error.problem?.type?.endsWith("/orders/cancel-after-payment")) {
        setActionError(
          "Деньги уже поступили в эскроу — отменить заказ можно только через оператора платформы. Напишите в чат заказа.",
        );
        void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.detail(orderId) });
        return;
      }
      setActionError(isApiError(error) ? error.message : "Не получилось отменить заказ");
    },
    onSettled: () => {
      setPending(undefined);
    },
  });

  if (orderQuery.isError) {
    const notFound = isApiError(orderQuery.error) && orderQuery.error.status === 404;
    return (
      <ErrorPage
        code={notFound ? "404" : "500"}
        title={notFound ? "Заказ не найден" : "Не удалось открыть заказ"}
        description={
          notFound
            ? "Возможно, заказ оформлен другой организацией."
            : "Попробуйте обновить страницу."
        }
        correlationId={isApiError(orderQuery.error) ? orderQuery.error.correlationId : undefined}
        actions={
          <Button asChild variant="cta">
            <AppLink to="/account/orders">Мои заказы</AppLink>
          </Button>
        }
      />
    );
  }

  const order = orderQuery.data;
  if (!order) return <TrackingSkeleton />;

  const photos = feed.events.flatMap((event) =>
    event.type === "photo_report" ? event.photos : [],
  );
  const tracking = order.tracking ?? null;

  return (
    <div className="pb-6">
      <Breadcrumbs className="mb-2">
        <BreadcrumbLink asChild>
          <AppLink to="/account/orders">Мои заказы</AppLink>
        </BreadcrumbLink>
        <BreadcrumbPage>Заказ № {order.id}</BreadcrumbPage>
      </Breadcrumbs>

      <div className="bg-surface rounded-card mb-3 grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold">Заказ № {order.id}</h1>
            {/* Статус меняется по SSE без перезагрузки — экранный диктор обязан его
                озвучить, иначе смена «в производстве» → «отгружено» проходит молча. */}
            <Tag role="status" aria-live="polite" tone={orderStatusTone(order.status)}>
              {orderStatusTitle(order.status)}
            </Tag>
            {order.repeat && <Tag tone="disc">повтор партии</Tag>}
          </div>
          <p className="text-muted mt-1 text-[13.5px]">
            {order.offer.title}, {order.params.qty} шт · «{order.offer.factoryName}»
            {order.shipDate !== null && (
              <>
                {" · отгрузка "}
                <b className="text-text">{formatIsoDayMonth(order.shipDate)}</b>
                {shipNote(order)}
              </>
            )}
            {order.escrow && <> · эскроу {formatRub(order.escrow.amount)}</>}
          </p>
          {tracking && <PipelineBar className="mt-3" stages={tracking.stages} />}
        </div>

        <OrderActions
          order={order}
          pending={pending}
          onApproveArtwork={() => {
            approve.mutate();
          }}
          onRepeat={() => {
            repeat.mutate();
          }}
          onCancel={() => {
            setActionError(undefined);
            setCancelOpen(true);
          }}
        />
      </div>

      {cancelOpen && order.canCancel === true && (
        <Box className="mb-3">
          <h2 className="font-heading text-base font-bold">Отменить заказ № {order.id}?</h2>
          <p className="text-muted mt-1 text-[13px]">
            Счёт будет снят, мощность фабрики освободится. Отменить можно только до оплаты — после
            поступления денег отмена идёт через оператора платформы.
          </p>
          <label className="text-muted mt-2.5 block text-xs" htmlFor="cancel-reason">
            Причина — необязательно, попадёт в журнал заказа
          </label>
          <Textarea
            id="cancel-reason"
            rows={2}
            className="mt-1"
            maxLength={500}
            value={cancelReason}
            onChange={(event) => {
              setCancelReason(event.target.value);
            }}
            placeholder="Например: изменился бюджет"
          />
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Button
              onClick={() => {
                setCancelOpen(false);
              }}
            >
              Не отменять
            </Button>
            <Button
              variant="ghost"
              disabled={cancel.isPending}
              onClick={() => {
                cancel.mutate();
              }}
            >
              {cancel.isPending ? "Отменяем…" : "Да, отменить заказ"}
            </Button>
          </div>
        </Box>
      )}

      {actionError !== undefined && (
        <Alert kind="danger" className="mb-3" title="Действие не выполнено">
          {actionError}
        </Alert>
      )}

      {order.status === "artwork_review" && order.artworkSignoff !== undefined && (
        <Alert kind="info" className="mb-3" title="Согласование макета">
          {artworkSignoffNote(order.artworkSignoff)}
        </Alert>
      )}

      {order.trackingNumber != null &&
        (order.status === "acceptance" ||
          order.status === "dispute" ||
          order.status === "completed") && (
          <p className="mb-3 text-[13.5px]">
            Доставка: трек-номер <b className="num">{order.trackingNumber}</b>
          </p>
        )}

      {order.acceptance && (
        <Alert
          kind="warn"
          className="mb-3"
          title={`Партия доставлена — примите её за ${String(order.acceptance.workingDaysLeft)} ${plural(order.acceptance.workingDaysLeft, ["рабочий день", "рабочих дня", "рабочих дней"])}`}
          action={
            <Button asChild variant="cta" size="sm">
              <AppLink to={`/account/orders/${String(order.id)}/acceptance`}>
                Перейти к приёмке
              </AppLink>
            </Button>
          }
        >
          После {formatDateTime(order.acceptance.autoAcceptAt)} партия будет принята автоматически,
          и деньги уйдут фабрике.
        </Alert>
      )}

      {order.dispute && order.dispute.status !== "withdrawn" && (
        <Alert
          kind="danger"
          className="mb-3"
          title={`Спор: ${order.dispute.reasonTitle}`}
          action={
            <Button asChild size="sm">
              <AppLink to={`/account/orders/${String(order.id)}/dispute`}>Открыть спор</AppLink>
            </Button>
          }
        >
          Выплата фабрике заблокирована
          {order.dispute.decisionDueAt === null
            ? ""
            : ` · решение оператора до ${formatDateTime(order.dispute.decisionDueAt)}`}
          .
        </Alert>
      )}

      {demoPanel}

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_340px]">
        <Box className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-bold">
              Ход производства
              {tracking === null ? "" : ` · ${String(tracking.progressPct)} %`}
            </h2>
            <ConnectionBadge
              state={feed.connection}
              isCatchingUp={feed.isCatchingUp}
              onRefresh={feed.refresh}
              updatedAt={tracking?.updatedAt}
            />
          </div>

          {tracking === null ? (
            <p className="text-muted mt-2 text-[13px]">
              Производство начнётся после оплаты и подтверждения фабрикой — тогда здесь появятся
              прогресс, фотоотчёты и журнал заказа.
            </p>
          ) : (
            <>
              <ProgressRows rows={tracking.progress} />
              {photos.length > 0 && (
                <div className="border-border mb-1 border-b pb-3">
                  <h3 className="text-muted text-xs font-bold tracking-[0.05em] uppercase">
                    Фотоотчёты · {photos.length} {plural(photos.length, ["фото", "фото", "фото"])}
                  </h3>
                  <PhotoStrip photos={photos} onOpen={setOpenPhoto} size="sm" />
                </div>
              )}
              {eventsQuery.isPending ? (
                <Skeleton className="mt-3 h-40 w-full" />
              ) : (
                <EventFeed
                  events={feed.events}
                  filter={filter}
                  onFilterChange={setFilter}
                  onOpenPhoto={setOpenPhoto}
                />
              )}
            </>
          )}
        </Box>

        <div className="flex flex-col gap-3" id="chat">
          <ChatPanel
            orderId={orderId}
            disabled={order.status === "completed" || order.status === "cancelled"}
            disabledNote="Заказ закрыт: переписка доступна только для чтения."
          />
          <Box>
            <h3 className="font-heading text-base font-bold">Документы</h3>
            <DocsList documents={order.documents} />
          </Box>
          {order.escrow && (
            <EscrowCard
              escrow={order.escrow}
              tranches={escrowDeal.data?.tranches}
              finalPayment={escrowDeal.data?.finalPayment}
            />
          )}
        </div>
      </div>

      <PhotoViewer
        photos={photos}
        openId={openPhoto}
        onClose={() => {
          setOpenPhoto(null);
        }}
      />
    </div>
  );
}

/** «(через 12 раб. дней)» — сколько осталось до плановой отгрузки. */
/** п. 16: макет подписывают обе стороны — технолог (производимость) и заказчик (визуал). */
function artworkSignoffNote(signoff: ArtworkSignoff): string {
  const customer = signoff.customerApprovedAt !== null;
  const factory = signoff.factoryApprovedAt !== null;
  if (customer && factory) return "Макет согласован обеими сторонами — фабрика закупает сырьё.";
  if (customer) {
    return "Вы согласовали макет. Ждём согласования технолога фабрики — он проверяет производимость.";
  }
  if (factory) {
    return "Технолог фабрики согласовал макет. Ждём вашего согласования — проверьте визуал и цветопробу.";
  }
  return "Макет у технолога. Нужны обе подписи: ваша (визуал) и технолога (производимость).";
}

function shipNote(order: Order): string {
  if (order.shipDate === null) return "";
  const left = workingDaysLeft(`${order.shipDate}T18:00:00`);
  if (left === 0) return "";
  return ` (через ${String(left)} ${plural(left, ["раб. день", "раб. дня", "раб. дней"])})`;
}

function TrackingSkeleton() {
  return (
    <div className="pb-6">
      <Skeleton className="mb-3 h-28 w-full rounded-[10px]" />
      <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
        <Skeleton className="h-96 w-full rounded-[10px]" />
        <Skeleton className="h-96 w-full rounded-[10px]" />
      </div>
    </div>
  );
}
