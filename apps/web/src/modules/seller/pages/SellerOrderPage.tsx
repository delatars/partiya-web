import type { OrderEvent, SellerStageCommand } from "@partiya/api-contracts";
import {
  Alert,
  Box,
  BreadcrumbLink,
  BreadcrumbPage,
  Breadcrumbs,
  Button,
  EmptyState,
  Input,
  ProgressBar,
  Skeleton,
  Tag,
  Textarea,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getApiService, isApiError, SELLER_KEYS, sellerOrderOptions } from "@/shared/api";
import { formatDateTime, formatIsoDayMonth } from "@/shared/lib/dates";
import { formatNumber, formatRub } from "@/shared/lib/format";
import { useOrderFeed } from "@/shared/lib/use-order-feed";
import { AppLink, ChatPanel, ConnectionBadge, DocsList } from "@/shared/ui";

import { PhotoReportForm } from "../components/PhotoReportForm";
import { SellerPipeline } from "../components/SellerPipeline";
import { deadlineNote, SELLER_STAGE_TITLE, SELLER_STAGE_TONE, sellerKey } from "../lib/view";

/* Макет: экран `seller-order` — заказ глазами завода: ступени, «Внести прогресс»,
   фотоотчёт, спецификация, чат с заказчиком, деньги и журнал.

   Кнопки этапов рисуются по `availableCommands`, который считает сервер: иначе
   «Перевести в КК» висела бы в производстве, бэк отвечал бы 409, и о правилах завод
   узнавал бы из ошибки. */

/** Строки формы прогресса: три технологических этапа ВСЕГДА видны, а те, по которым
    завод уже отчитался, показывают факт. Иначе после первого сохранения из формы
    исчезали бы остальные строки — отчитаться по ним стало бы нечем. */
const DEFAULT_PROGRESS = [
  { id: "cut", title: "Раскроено" },
  { id: "sewn", title: "Отшито" },
  { id: "print", title: "Принт" },
] as const;

function progressRowsOf(order: {
  progress: { id: string; title: string; done: number; total: number; updatedAt: string }[];
  params: { qty: number };
}): { id: string; title: string; done: number; total: number; updatedAt: string }[] {
  const reported = new Map(order.progress.map((row) => [row.id, row]));
  const base = DEFAULT_PROGRESS.map(
    (row) =>
      reported.get(row.id) ?? {
        id: row.id,
        title: row.title,
        done: 0,
        total: order.params.qty,
        updatedAt: "",
      },
  );
  const extra = order.progress.filter(
    (row) => !DEFAULT_PROGRESS.some((item) => item.id === row.id),
  );
  return [...base, ...extra];
}

/** Лента заводу не рисуется — стартовой страницы журнала нет (стабильная ссылка для хука). */
const NO_EVENTS: OrderEvent[] = [];

const COMMAND_LABEL: Record<SellerStageCommand, string> = {
  start_artwork_review: "Отправить макет технологу",
  approve_artwork: "Согласовать макет",
  materials_purchased: "Сырьё закуплено — старт производства",
  start_quality_control: "Перевести в «Контроль качества»",
  ship: "Отгрузить партию",
};

/** Понятный текст ошибки команды завода: известные коды — человеческими словами. */
function commandErrorText(error: Error): string {
  if (!isApiError(error)) return error.message;
  const type = error.problem?.type ?? "";
  if (type.endsWith("/orders/ship-before-final-payment")) {
    return "Ждём оплату второго транша: по схеме 50/50 отгрузка — после того, как заказчик оплатит вторую половину.";
  }
  if (type.endsWith("/seller/invalid-tracking-number")) {
    return error.fieldErrors?.trackingNumber?.[0] ?? "Укажите трек-номер: от 1 до 64 символов.";
  }
  if (error.status === 409) {
    return `${error.message} Обновите страницу — заказ мог измениться.`;
  }
  return error.message;
}

export function SellerOrderPage({ orderId }: { orderId: number }) {
  const queryClient = useQueryClient();
  const { data: order, isPending, error } = useQuery(sellerOrderOptions(orderId));
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [declineReason, setDeclineReason] = useState("");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [deliveredOpen, setDeliveredOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: SELLER_KEYS.all });

  /* Q-331: кабинет завода слушает канал заказа, как кабинет заказчика, — сообщения и
     смены статуса приходят без перезагрузки. Лента здесь не рисуется: канал нужен ради
     инвалидаций (заказ, чат). */
  const feed = useOrderFeed(orderId, NO_EVENTS, {
    onOrderChanged: () => {
      void queryClient.invalidateQueries({ queryKey: SELLER_KEYS.all });
    },
  });

  const confirm = useMutation({
    mutationFn: () => getApiService().confirmSellerOrder(orderId, sellerKey("confirm", orderId)),
    onSuccess: invalidate,
  });
  const decline = useMutation({
    mutationFn: () =>
      getApiService().declineSellerOrder(
        orderId,
        { reason: declineReason.trim() || null },
        sellerKey("decline", orderId),
      ),
    onSuccess: invalidate,
  });
  const advance = useMutation({
    mutationFn: (command: SellerStageCommand) =>
      getApiService().advanceSellerStage(orderId, { command }),
    onSuccess: invalidate,
  });
  const report = useMutation({
    mutationFn: (input: { stage: string; done: number; total: number }) =>
      getApiService().reportSellerProgress(orderId, input),
    onSuccess: invalidate,
  });
  const delivered = useMutation({
    mutationFn: (value: string) =>
      getApiService().markSellerOrderDelivered(orderId, { trackingNumber: value }),
    onSuccess: () => {
      setDeliveredOpen(false);
      setTrackingNumber("");
      return invalidate();
    },
  });

  if (isPending) {
    return (
      <>
        <Skeleton className="h-24" />
        <Skeleton className="mt-3 h-64" />
      </>
    );
  }

  if (error || !order) {
    return (
      <Box className="my-3">
        <EmptyState
          title="Заказ не найден"
          description={
            isApiError(error) ? error.message : "Возможно, заказ принадлежит другому заводу."
          }
          action={
            <Button asChild variant="cta">
              <AppLink to="/seller/orders">К заказам</AppLink>
            </Button>
          }
        />
      </Box>
    );
  }

  const money = order.money;
  const commandError =
    confirm.error ?? decline.error ?? advance.error ?? report.error ?? delivered.error;
  const signoff = order.artworkSignoff;
  /* 50/50 (п. 4): в «Контроле качества» сервер не даёт `ship`, пока второй транш не
     оплачен. Состояние транша приходит полем `finalPayment` (Q-383, Q-401); без него
     (старый бэк) — по-прежнему выводим из отсутствия команды. */
  const finalPayment = order.finalPayment ?? null;
  const waitingFinalPayment =
    order.status === "quality_control" &&
    !order.disputeOpen &&
    (finalPayment === null
      ? !order.availableCommands.includes("ship")
      : finalPayment.state === "awaiting" ||
        finalPayment.state === "extended" ||
        finalPayment.state === "operator");

  return (
    <>
      <Breadcrumbs className="mb-2">
        <BreadcrumbLink asChild>
          <AppLink to="/seller/orders">Заказы</AppLink>
        </BreadcrumbLink>
        <BreadcrumbPage>№ {order.id}</BreadcrumbPage>
      </Breadcrumbs>

      <Box className="mb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl font-extrabold">
                № {order.id} · {order.title}
              </h1>
              {order.sellerStage === null ? null : (
                /* Этап меняется после действий завода и по каналу заказа — озвучиваем. */
                <Tag role="status" aria-live="polite" tone={SELLER_STAGE_TONE[order.sellerStage]}>
                  {SELLER_STAGE_TITLE[order.sellerStage]}
                </Tag>
              )}
              {order.disputeOpen ? <Tag tone="hot">спор</Tag> : null}
              <ConnectionBadge
                state={feed.connection}
                isCatchingUp={feed.isCatchingUp}
                onRefresh={feed.refresh}
              />
            </div>
            <div className="text-muted mt-1 text-[13.5px]">
              {order.customer}
              {order.shipDate === null
                ? null
                : ` · отгрузка до ${formatIsoDayMonth(order.shipDate) ?? order.shipDate}`}
              {order.productionDay === null || order.productionDays === null
                ? null
                : ` · день ${String(order.productionDay)} из ${String(order.productionDays)}`}
              {` · к выплате ${formatRub(money.payout)}`}
            </div>
            <SellerPipeline stage={order.sellerStage} className="mt-3" />
          </div>

          <div className="flex flex-col items-stretch gap-1.5 md:min-w-56">
            {order.canConfirm ? (
              <>
                <Button variant="cta" disabled={confirm.isPending} onClick={() => confirm.mutate()}>
                  {confirm.isPending ? "Подтверждаем…" : "Подтвердить заказ"}
                </Button>
                <Button variant="ghost" onClick={() => setDeclineOpen((open) => !open)}>
                  Отклонить…
                </Button>
              </>
            ) : null}
            {order.availableCommands.map((command) => (
              <Button
                key={command}
                variant="cta"
                disabled={advance.isPending}
                onClick={() => advance.mutate(command)}
              >
                {COMMAND_LABEL[command]}
              </Button>
            ))}
            {order.canMarkDelivered === true ? (
              <Button
                variant="cta"
                aria-expanded={deliveredOpen}
                onClick={() => setDeliveredOpen((open) => !open)}
              >
                Доставлено…
              </Button>
            ) : null}
            {order.availableCommands.length === 0 &&
            !order.canConfirm &&
            order.canMarkDelivered !== true ? (
              <p className="text-muted text-[12.5px]">
                {waitingFinalPayment
                  ? "Ждём оплату второго транша — отгрузка откроется после неё."
                  : "Следующий шаг за заказчиком или платформой."}
              </p>
            ) : null}
          </div>
        </div>

        {waitingFinalPayment && finalPayment?.state === "operator" ? (
          <Alert
            kind="warn"
            className="mt-3"
            title="Второй транш не оплачен — заказ передан оператору платформы"
            data-testid="final-payment-alert"
          >
            Срок оплаты истёк и после автоматического продления. Оператор продлит срок или откроет
            спор: тогда первый транш в эскроу разделят по правилам спора. Если заказчик оплатит
            раньше решения — отгрузка откроется.
          </Alert>
        ) : waitingFinalPayment ? (
          <Alert
            kind="info"
            className="mt-3"
            title={
              finalPayment?.state === "extended" ? finalPayment.note : "Ждём оплату второго транша"
            }
            data-testid="final-payment-alert"
          >
            Схема 50/50: вторую половину заказчик оплачивает, когда партия готова к отгрузке. Счёт
            {finalPayment?.invoiceNumber == null ? "" : ` ${finalPayment.invoiceNumber}`} выставлен
            {finalPayment?.dueAt == null
              ? ""
              : ` — срок оплаты до ${formatDateTime(finalPayment.dueAt)}`}
            . Отгрузить можно сразу после поступления денег в эскроу.
          </Alert>
        ) : null}

        {order.status === "artwork_review" && signoff !== undefined ? (
          <div className="bg-subtle rounded-control mt-3 px-3 py-2.5 text-[13px]">
            <b className="font-medium">Согласование макета</b> — подписывают обе стороны: технолог —
            производимость, заказчик — визуал.
            <ul className="mt-1 grid gap-0.5">
              <li>
                Технолог:{" "}
                {signoff.factoryApprovedAt === null
                  ? "ждём вашего согласования"
                  : `согласовано ${formatDateTime(signoff.factoryApprovedAt)}`}
              </li>
              <li>
                Заказчик:{" "}
                {signoff.customerApprovedAt === null
                  ? "ждём согласования заказчика"
                  : `согласовано ${formatDateTime(signoff.customerApprovedAt)}`}
              </li>
            </ul>
          </div>
        ) : null}

        {deliveredOpen && order.canMarkDelivered === true ? (
          <form
            className="border-border mt-3 rounded-[10px] border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              delivered.mutate(trackingNumber);
            }}
          >
            <label className="text-muted text-xs" htmlFor="tracking-number">
              Трек-номер перевозчика — его увидит заказчик; с отметки открывается окно приёмки (5
              рабочих дней)
            </label>
            <Input
              id="tracking-number"
              className="mt-1"
              maxLength={64}
              value={trackingNumber}
              invalid={
                isApiError(delivered.error) &&
                delivered.error.fieldErrors?.trackingNumber !== undefined
              }
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="CDEK-1234567890"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" onClick={() => setDeliveredOpen(false)}>
                Отмена
              </Button>
              <Button
                type="submit"
                variant="cta"
                disabled={delivered.isPending || trackingNumber.trim().length === 0}
              >
                {delivered.isPending ? "Отмечаем…" : "Отметить «Доставлено»"}
              </Button>
            </div>
          </form>
        ) : null}

        {order.trackingNumber != null ? (
          <p className="mt-2 text-[13px]">
            Трек-номер: <b className="num">{order.trackingNumber}</b>
          </p>
        ) : null}

        {order.canConfirm && order.confirmDeadlineAt !== null ? (
          <Alert kind="warn" className="mt-3" title="Подтвердите заказ до дедлайна">
            {formatDateTime(order.confirmDeadlineAt)} · {deadlineNote(order.confirmDeadlineAt)}.{" "}
            Деньги заказчика уже в эскроу. Без подтверждения заказ отменится, а рейтинг в выдаче
            снизится.
          </Alert>
        ) : null}

        {declineOpen ? (
          <div className="border-border mt-3 rounded-[10px] border p-3">
            <label className="text-muted text-xs" htmlFor="decline-reason">
              Причина отказа — её увидит заказчик
            </label>
            <Textarea
              id="decline-reason"
              rows={2}
              className="mt-1"
              value={declineReason}
              onChange={(event) => setDeclineReason(event.target.value)}
              placeholder="Нет свободной мощности на этот срок"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button onClick={() => setDeclineOpen(false)}>Отмена</Button>
              <Button variant="ghost" disabled={decline.isPending} onClick={() => decline.mutate()}>
                {decline.isPending ? "Отклоняем…" : "Отклонить и вернуть деньги"}
              </Button>
            </div>
          </div>
        ) : null}

        {commandError ? (
          <p role="alert" className="text-danger mt-2 text-[13px]">
            {commandErrorText(commandError)}
          </p>
        ) : null}
      </Box>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <Box>
            <h2 className="font-heading text-base font-bold">Внести прогресс</h2>
            <p className="text-muted mt-1 text-[12.5px]">
              Заказчик увидит это в ленте сразу. Обновляйте хотя бы раз в 2 рабочих дня — это влияет
              на рейтинг.
            </p>
            <div className="mt-3 grid gap-2">
              {progressRowsOf(order).map((row) => {
                const draft = progress[row.id] ?? String(row.done);
                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-[minmax(5rem,1fr)_auto] items-center gap-x-2.5 gap-y-1 text-[13px] sm:grid-cols-[minmax(6rem,1fr)_2fr_auto]"
                  >
                    <span>{row.title}</span>
                    <ProgressBar
                      className="order-last col-span-2 sm:order-none sm:col-span-1"
                      label={row.title}
                      value={row.total === 0 ? 0 : Math.round((row.done / row.total) * 100)}
                    />
                    <span className="flex items-center justify-end gap-1.5">
                      <Input
                        size="sm"
                        numeric
                        className="w-20 text-right"
                        inputMode="numeric"
                        aria-label={`Факт: ${row.title}`}
                        value={draft}
                        onChange={(event) => {
                          setProgress((current) => ({
                            ...current,
                            [row.id]: event.target.value,
                          }));
                        }}
                      />
                      <span className="text-muted text-[12.5px]">
                        / {formatNumber(row.total || order.params.qty)}
                      </span>
                      <Button
                        size="sm"
                        variant="cta"
                        aria-label={`Сохранить: ${row.title}`}
                        disabled={report.isPending}
                        onClick={() => {
                          const done = Number(draft.replace(/[\s\u00a0]/gu, ""));
                          if (!Number.isFinite(done)) return;
                          report.mutate({
                            stage: row.id,
                            done,
                            total: row.total || order.params.qty,
                          });
                        }}
                      >
                        Сохранить
                      </Button>
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-muted mt-2.5 text-[12.5px]">
              Последнее обновление:{" "}
              {order.progressUpdatedAt === null
                ? "ещё не было"
                : formatDateTime(order.progressUpdatedAt)}
            </p>
          </Box>

          <PhotoReportForm orderId={order.id} className="mt-3" />

          <Box className="mt-3">
            <h2 className="font-heading text-base font-bold">Спецификация</h2>
            <dl className="mt-2 grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 gap-y-1.5 text-[13.5px]">
              <dt className="text-muted">Объём</dt>
              <dd className="m-0">{formatNumber(order.params.qty)} шт</dd>
              <dt className="text-muted">Цвета</dt>
              <dd className="m-0">
                {order.params.colors
                  .map((line) => `${line.color} ${formatNumber(line.qty)}`)
                  .join(" · ") || "—"}
              </dd>
              <dt className="text-muted">Размеры</dt>
              <dd className="m-0">
                {order.params.sizes
                  .map((line) => `${line.size} ${formatNumber(line.qty)}`)
                  .join(" · ") || "—"}
              </dd>
              <dt className="text-muted">Крой</dt>
              <dd className="m-0">{order.params.fit ?? "—"}</dd>
              <dt className="text-muted">Печать</dt>
              <dd className="m-0">{order.params.print ?? "—"}</dd>
              <dt className="text-muted">Макет</dt>
              <dd className="m-0">
                {order.artwork.length === 0
                  ? "не приложен"
                  : order.artwork.map((file) => file.fileName).join(", ")}
              </dd>
              <dt className="text-muted">Доставка</dt>
              <dd className="m-0">
                {order.delivery === null
                  ? "—"
                  : `${order.delivery.title}${order.delivery.address === null ? "" : ` · ${order.delivery.address}`}`}
              </dd>
            </dl>
          </Box>

          <Box className="mt-3">
            <h2 className="font-heading text-base font-bold">Документы</h2>
            <div className="mt-2">
              <DocsList documents={order.documents} />
            </div>
          </Box>
        </div>

        <aside>
          <ChatPanel orderId={order.id} title="Чат с заказчиком" />

          <Box className="mt-3">
            <h3 className="font-heading text-base font-bold">Деньги</h3>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-[13.5px]">
              <dt className="text-muted">В эскроу</dt>
              <dd className="num m-0 text-right">{formatRub(money.escrowAmount)}</dd>
              {/* п. 2: комиссия только со стоимости товара, доставка без комиссии */}
              <dt className="text-muted">Комиссия {money.feePercent} % с товара</dt>
              <dd className="num m-0 text-right">−{formatRub(money.fee)}</dd>
              <dt className="font-medium">К выплате</dt>
              <dd className="num m-0 text-right font-bold">{formatRub(money.payout)}</dd>
            </dl>
            <p className="text-muted mt-2 text-[12.5px]">
              {money.blockedByDispute
                ? "Выплата заблокирована спором до решения оператора."
                : money.note}
            </p>
          </Box>
        </aside>
      </div>
    </>
  );
}
