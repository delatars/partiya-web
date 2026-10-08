import type { Order, OrderDocument, PaymentInstructions } from "@partiya/api-contracts";
import { getConfig } from "@partiya/shared";
import { Alert, Box, Button, cn, Skeleton, Tag } from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { isApiError, ORDER_KEYS, orderOptions } from "@/shared/api";
import { formatRub } from "@/shared/lib/format";
import { isAwaitingPayment, orderStatusTitle } from "@/shared/lib/order-status";
import { AppLink, ErrorPage } from "@/shared/ui";

import { PipeSteps } from "../components/PipeSteps";
import { demoMarkOrderPaid } from "../api/mocks";

/* Макет: экран `checkout-pay` — «Счёт выставлен, ждём оплату».

   B2B-оплата — это платёжное поручение, а не карта (ARCHITECTURE.md, 5.4): человек
   уходит в банк-клиент, а деньги приходят через часы или дни. Поэтому экран устроен
   как ожидание, а не как оплата: реквизиты для копирования, документы, таймер и
   честная надпись, сколько идут деньги.

   Статус спрашиваем опросом раз в 10 секунд. SSE (`GET /orders/{id}/stream`) — следующий
   шаг; пока его нет, опрос честнее «висящего» экрана, который не узнает о поступлении.

   ⚠ «Я оплатил (демо)» существует только при `useMocks`: у настоящего бэка этот переход
   делает webhook банка, и в контракте такого метода нет. */

const POLL_INTERVAL_MS = 10_000;

export interface OrderPaymentPageProps {
  orderId: number;
}

export function OrderPaymentPage({ orderId }: OrderPaymentPageProps) {
  const queryClient = useQueryClient();
  const query = useQuery({
    ...orderOptions(orderId),
    // ждём поступления денег — опрашиваем; дождались — перестаём
    refetchInterval: (state) =>
      state.state.data && isAwaitingPayment(state.state.data.status) ? POLL_INTERVAL_MS : false,
  });
  const order = query.data;

  const markPaid = useMutation({
    mutationFn: () => demoMarkOrderPaid(orderId),
    onSuccess: (updated) => {
      queryClient.setQueryData(ORDER_KEYS.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
    },
  });

  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.status === 404;
    return (
      <ErrorPage
        code={notFound ? "404" : "500"}
        title={notFound ? "Заказ не найден" : "Не удалось открыть счёт"}
        description={
          notFound
            ? "Возможно, заказ оформлен другой организацией."
            : "Попробуйте обновить страницу."
        }
        correlationId={isApiError(query.error) ? query.error.correlationId : undefined}
        actions={
          <Button asChild variant="cta">
            <AppLink to="/account/orders">Мои заказы</AppLink>
          </Button>
        }
      />
    );
  }

  if (!order) return <PaymentSkeleton />;

  const payment = order.payment;
  const waiting = isAwaitingPayment(order.status);
  const paid = !waiting && order.paidAt !== null;

  return (
    <div className="mx-auto max-w-[900px] pb-8">
      <header className="px-0 pt-7 pb-1.5 text-center">
        <span
          aria-hidden="true"
          className="bg-success font-heading mx-auto grid size-13 place-items-center rounded-full text-[26px] font-bold text-white"
        >
          <Check className="size-7" strokeWidth={3} />
        </span>
        <h1 className="font-heading mx-auto mt-2.5 mb-1.5 max-w-[30ch] text-2xl font-bold">
          {waiting
            ? `Заказ № ${String(order.id)} оформлен. Оплатите счёт${payment ? ` до ${formatDeadline(payment.dueAt)}` : ""}`
            : `Заказ № ${String(order.id)} оплачен — ждём подтверждения фабрики`}
        </h1>
        <p className="text-muted mx-auto max-w-[64ch]">
          {waiting
            ? "Мощность фабрики зарезервирована за вами на 48 часов. После поступления денег в эскроу заказ уйдёт фабрике на подтверждение."
            : `Деньги в эскроу. Фабрика подтвердит заказ${order.confirmDeadlineAt === null ? "" : ` до ${formatDeadline(order.confirmDeadlineAt)}`} — или резерв снимется и деньги вернутся.`}
        </p>
      </header>

      <PipeSteps
        className="my-4"
        steps={[
          { name: "Оформлен", note: formatMoment(order.submittedAt), state: "done" },
          {
            name: "Оплата в эскроу",
            note: waiting ? "ждём поступления" : formatMoment(order.paidAt),
            state: waiting ? "active" : "done",
          },
          {
            name: "Подтверждение фабрики",
            note:
              order.confirmDeadlineAt === null
                ? "после оплаты"
                : `до ${formatDeadline(order.confirmDeadlineAt)}`,
            state: paid ? "active" : "todo",
          },
          {
            name: "Производство",
            note:
              order.quote.leadDays === undefined
                ? undefined
                : `${String(order.quote.leadDays)} раб. дней`,
            state: "todo",
          },
        ]}
      />

      <div className="grid items-start gap-3 md:grid-cols-2">
        {payment && <InvoiceCard order={order} payment={payment} waiting={waiting} />}

        <div className="flex flex-col gap-3">
          <Box>
            <h2 className="font-heading text-lg font-bold">Документы к подписанию</h2>
            <div className="mt-1.5">
              {order.documents.map((document) => (
                <DocumentRow key={document.id} document={document} />
              ))}
            </div>
          </Box>

          <Box>
            <h2 className="font-heading text-lg font-bold">Что дальше</h2>
            <ol className="mt-1.5 list-none p-0">
              <TodoRow state="done">Параметры и макет переданы фабрике</TodoRow>
              <TodoRow state={waiting ? "now" : "done"}>Оплата счёта → деньги в эскроу</TodoRow>
              <TodoRow state={paid ? "now" : "todo"}>
                Фабрика подтверждает заказ (или отклоняет — деньги вернутся)
              </TodoRow>
              <TodoRow state="todo">Технолог согласует макет и цветопробу</TodoRow>
            </ol>
          </Box>

          <div className="bg-success-soft rounded-card px-3 py-2.5 text-[12.5px]">
            Если фабрика не подтвердит заказ до дедлайна, резерв снимется и деньги вернутся на ваш
            счёт автоматически.
          </div>

          {getConfig().useMocks && waiting && (
            <Alert
              kind="info"
              title="Демо-режим"
              action={
                <Button
                  size="sm"
                  variant="cta"
                  disabled={markPaid.isPending}
                  onClick={() => {
                    markPaid.mutate();
                  }}
                >
                  Я оплатил (демо)
                </Button>
              }
            >
              На бэке этот переход делает webhook банка. Здесь его нажимаете вы.
            </Alert>
          )}
        </div>
      </div>

      <div className="mt-5 text-center">
        <Button asChild size="lg" variant={paid ? "cta" : "default"}>
          <AppLink to={`/account/orders/${String(order.id)}`}>Перейти к заказу</AppLink>
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ счёт */

function InvoiceCard({
  order,
  payment,
  waiting,
}: {
  order: Order;
  payment: PaymentInstructions;
  waiting: boolean;
}) {
  const rows: { label: string; value: string; copy?: string }[] = [
    { label: "Получатель", value: payment.payeeName },
    {
      label: "ИНН / КПП",
      value: `${payment.payeeInn} / ${payment.payeeKpp}`,
      copy: payment.payeeInn,
    },
    { label: "Банк", value: `${payment.bankName} · БИК ${payment.bik}`, copy: payment.bik },
    { label: "Расчётный счёт", value: groupAccount(payment.account), copy: payment.account },
    {
      label: "Корр. счёт",
      value: groupAccount(payment.correspondentAccount),
      copy: payment.correspondentAccount,
    },
    { label: "Назначение", value: payment.purpose, copy: payment.purpose },
  ];

  return (
    <Box>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-bold">Счёт № {payment.invoiceNumber}</h2>
        <Tag tone={waiting ? "work" : "ok"}>
          {waiting ? "ожидает оплаты" : orderStatusTitle(order.status).toLowerCase()}
        </Tag>
      </div>

      {waiting && <PaymentCountdown dueAt={payment.dueAt} />}

      <dl className="mt-3 grid grid-cols-[minmax(110px,150px)_1fr] gap-x-3 gap-y-1.5 text-[13.5px]">
        {rows.map((row) => (
          <Row key={row.label} label={row.label} value={row.value} copy={row.copy} />
        ))}
        <dt className="text-muted">К оплате</dt>
        <dd className="m-0">
          <b className="price num text-xl">{formatRub(payment.amountDue)}</b>
          {payment.amountDue !== payment.amount && (
            <span className="text-muted ml-1.5 text-[12.5px]">
              первый транш из {formatRub(payment.amount)} · половина — когда партия готова к
              отгрузке
            </span>
          )}
        </dd>
      </dl>

      <div className="mt-3.5 flex flex-wrap gap-2">
        <Button variant="cta" asChild>
          <a href={invoiceUrl(order)} download>
            Скачать счёт PDF
          </a>
        </Button>
        <Button asChild>
          {/* mailto, а не запрос к бэку: отправку счёта на почту сервер пока не умеет (Q-C6) */}
          <a href={accountantMailto(order, payment)}>Отправить бухгалтеру</a>
        </Button>
        <CopyButton label="Скопировать реквизиты" value={requisitesText(payment)} variant="ghost" />
      </div>

      <Alert
        kind="info"
        className="mt-3"
        title="Платёжка идёт от нескольких часов до 1 рабочего дня"
      >
        Мы сопоставим поступление по номеру заказа в назначении платежа и сразу уведомим вас и
        фабрику.
      </Alert>
    </Box>
  );
}

/** Таймер срока оплаты: после него резерв мощности снимается, поэтому счёт идёт секундами,
    а не «оплатите когда-нибудь». Тикает раз в секунду и умеет показать истёкший срок. */
function PaymentCountdown({ dueAt }: { dueAt: string }) {
  const deadline = Date.parse(dueAt);
  const [left, setLeft] = useState(() => deadline - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setLeft(deadline - Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [deadline]);

  if (Number.isNaN(deadline)) return null;

  const over = left <= 0;
  const hours = Math.floor(Math.abs(left) / 3_600_000);
  const minutes = Math.floor((Math.abs(left) % 3_600_000) / 60_000);
  const seconds = Math.floor((Math.abs(left) % 60_000) / 1000);

  return (
    <p className={cn("mt-1.5 text-[13px]", over ? "text-danger" : "text-muted")}>
      {over ? "Срок оплаты истёк — " : "На оплату осталось "}
      <b className={cn("num", over ? "text-danger" : "text-text")}>
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </b>
      {over ? ", резерв мощности снят" : ", потом резерв мощности снимется"}
    </p>
  );
}

function Row({ label, value, copy }: { label: string; value: string; copy?: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 flex items-start gap-1.5">
        <span className="num min-w-0 break-words">{value}</span>
        {copy !== undefined && <CopyButton label={`Скопировать: ${label}`} value={copy} icon />}
      </dd>
    </>
  );
}

/** Копирование в буфер: `navigator.clipboard` есть не везде и отказывает без жеста —
    поэтому в try/catch, и молчать об отказе нельзя. */
function CopyButton({
  label,
  value,
  icon,
  variant = "default",
}: {
  label: string;
  value: string;
  icon?: boolean;
  variant?: "default" | "ghost";
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => {
      setState("idle");
    }, 2000);
    return () => {
      clearTimeout(timer);
    };
  }, [state]);

  const copy = () => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(value);
        setState("done");
      } catch {
        setState("failed");
      }
    })();
  };

  if (icon === true) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={copy}
        className="text-muted hover:text-action mt-px flex-none"
      >
        {state === "done" ? (
          <Check aria-hidden="true" className="text-success size-3.5" />
        ) : (
          <Copy aria-hidden="true" className="size-3.5" />
        )}
        {state === "failed" && <span className="sr-only">Скопировать не удалось</span>}
      </button>
    );
  }

  return (
    <Button variant={variant} onClick={copy}>
      {state === "done" ? "Скопировано" : state === "failed" ? "Не удалось скопировать" : label}
    </Button>
  );
}

function DocumentRow({ document }: { document: OrderDocument }) {
  const action = document.signature === "edo_pending" ? "Подписать по ЭДО" : "Скачать";
  return (
    <a
      href={document.url ?? "#"}
      className="border-border flex justify-between gap-3 border-b border-dashed py-[7px] text-[13px] last:border-0"
    >
      <span>{document.title}</span>
      <span className="text-action flex-none">{document.url === null ? "готовится" : action}</span>
    </a>
  );
}

function TodoRow({
  state,
  children,
}: {
  state: "done" | "now" | "todo";
  children: React.ReactNode;
}) {
  return (
    <li
      className={
        state === "todo"
          ? "border-border text-muted relative border-b border-dashed py-[7px] pl-7 text-[13.5px] last:border-0"
          : "border-border text-text relative border-b border-dashed py-[7px] pl-7 text-[13.5px] last:border-0"
      }
    >
      <span
        aria-hidden="true"
        className={
          state === "done"
            ? "bg-success border-success absolute top-2 left-0 size-4 rounded-full border-2"
            : state === "now"
              ? "border-action shadow-action-soft absolute top-2 left-0 size-4 rounded-full border-2 shadow-[0_0_0_3px_var(--color-action-soft)]"
              : "border-border-strong absolute top-2 left-0 size-4 rounded-full border-2"
        }
      />
      <span className={state === "now" ? "font-medium" : undefined}>{children}</span>
    </li>
  );
}

/* ------------------------------------------------------------------ формат */

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

function formatDeadline(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateTimeFormatter.format(date);
}

function formatMoment(iso: string | null): string | undefined {
  if (iso === null) return undefined;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : dateFormatter.format(date);
}

/** «40702 810 0 0000 0004812» — так счёт читается глазами в макете. */
function groupAccount(account: string): string {
  if (account.length !== 20) return account;
  return [
    account.slice(0, 5),
    account.slice(5, 8),
    account.slice(8, 9),
    account.slice(9, 13),
    account.slice(13),
  ].join(" ");
}

function requisitesText(payment: PaymentInstructions): string {
  return [
    `Получатель: ${payment.payeeName}`,
    `ИНН: ${payment.payeeInn}`,
    `КПП: ${payment.payeeKpp}`,
    `Банк: ${payment.bankName}`,
    `БИК: ${payment.bik}`,
    `Расчётный счёт: ${payment.account}`,
    `Корр. счёт: ${payment.correspondentAccount}`,
    `Назначение: ${payment.purpose}`,
    `Сумма: ${formatRub(payment.amountDue)}`,
  ].join("\n");
}

/** Документ-заглушка: PDF-генерация — отдельная задача бэка (`documents`, typst). */
function invoiceUrl(order: Order): string {
  return order.documents.find((item) => item.kind === "invoice")?.url ?? "#";
}

/** Письмо бухгалтеру со счётом и реквизитами. Адрес подставляется из карточки
    плательщика, если человек указал его на шаге «Плательщик и документы». */
function accountantMailto(order: Order, payment: PaymentInstructions): string {
  const to = order.payer?.accountantEmail ?? "";
  const subject = `Счёт ${payment.invoiceNumber} на оплату заказа № ${String(order.id)}`;
  const body = [
    `Счёт № ${payment.invoiceNumber} на ${formatRub(payment.amountDue)}.`,
    "",
    requisitesText(payment),
  ].join("\n");
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function PaymentSkeleton() {
  return (
    <div className="mx-auto max-w-[900px] py-8">
      <Skeleton className="mx-auto mb-3 h-10 w-2/3" />
      <Skeleton className="mb-4 h-6 w-full" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-[10px]" />
        <Skeleton className="h-80 w-full rounded-[10px]" />
      </div>
    </div>
  );
}
