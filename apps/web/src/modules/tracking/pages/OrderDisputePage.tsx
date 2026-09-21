import type { Dispute, DisputeReason, DisputeRemedyKind } from "@partiya/api-contracts";
import {
  Alert,
  Box,
  BreadcrumbLink,
  BreadcrumbPage,
  Breadcrumbs,
  Button,
  Field,
  Input,
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  Skeleton,
  Tag,
  Textarea,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  DISPUTE_KEYS,
  disputeFormOptions,
  disputeOptionsQuery,
  getApiService,
  isApiError,
  ORDER_KEYS,
  orderOptions,
} from "@/shared/api";
import { formatDateTime, formatShortDate } from "@/shared/lib/dates";
import { formatRub } from "@/shared/lib/format";
import { AppLink, ErrorPage } from "@/shared/ui";

import { ChatPanel } from "@/shared/ui";
import { PipelineBar } from "@/shared/ui";
import { disputeFormSchema, type DisputeFormValues } from "../lib/dispute-schema";

/* Макет: экран `dispute` — форма претензии и состояние спора с перепиской.
 *
 * Один маршрут на два состояния намеренно: спор либо есть, либо его открывают, и это
 * один и тот же разговор с платформой. Пока спора нет — форма; как только открыт —
 * стадии, требование, доказательства и переписка.
 *
 * Суммы считает сервер. Экран показывает предварительную оценку частичного возврата
 * (`unitPrice × затронуто`), но в претензию уходит только количество: иначе у денег
 * появился бы второй источник правды. */

export function OrderDisputePage({ orderId }: { orderId: number }) {
  const orderQuery = useQuery(orderOptions(orderId));
  const disputeQuery = useQuery(disputeOptionsQuery(orderId));

  if (orderQuery.isError) {
    const notFound = isApiError(orderQuery.error) && orderQuery.error.status === 404;
    return (
      <ErrorPage
        code={notFound ? "404" : "500"}
        title={notFound ? "Заказ не найден" : "Не удалось открыть спор"}
        actions={
          <Button asChild variant="cta">
            <AppLink to="/account/orders">Мои заказы</AppLink>
          </Button>
        }
      />
    );
  }

  const order = orderQuery.data;
  if (!order) return <Skeleton className="h-96 w-full rounded-[10px]" />;

  const dispute = disputeQuery.data ?? null;

  return (
    <div className="pb-6">
      <Breadcrumbs className="mb-2">
        <BreadcrumbLink asChild>
          <AppLink to="/account/orders">Мои заказы</AppLink>
        </BreadcrumbLink>
        <BreadcrumbLink asChild>
          <AppLink to={`/account/orders/${String(order.id)}`}>Заказ № {order.id}</AppLink>
        </BreadcrumbLink>
        <BreadcrumbPage>Спор</BreadcrumbPage>
      </Breadcrumbs>

      {dispute === null ? (
        <DisputeForm orderId={orderId} orderTitle={order.offer.title} />
      ) : (
        <DisputeState dispute={dispute} orderId={orderId} />
      )}
    </div>
  );
}

/* ─────────────────────────────── форма претензии ─────────────────────────────── */

function DisputeForm({ orderId, orderTitle }: { orderId: number; orderTitle: string }) {
  const queryClient = useQueryClient();
  const optionsQuery = useQuery(disputeFormOptions(orderId));
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<DisputeFormValues>({
    resolver: zodResolver(disputeFormSchema),
    defaultValues: { reason: "size_mismatch", affectedQty: "", description: "", remedy: "rework" },
  });

  const open = useMutation({
    mutationFn: async (values: DisputeFormValues) => {
      const api = getApiService();
      const evidenceFileIds: string[] = [];
      for (const file of files) {
        const upload = await api.requestDisputeEvidenceUpload(orderId, {
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        });
        evidenceFileIds.push(upload.fileId);
      }
      return api.openDispute(
        orderId,
        {
          reason: values.reason,
          affectedQty: values.affectedQty === "" ? null : Number(values.affectedQty),
          description: values.description,
          remedy: values.remedy,
          evidenceFileIds,
        },
        `dispute:${String(orderId)}`,
      );
    },
    onSuccess: (dispute) => {
      queryClient.setQueryData(DISPUTE_KEYS.detail(orderId), dispute);
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.detail(orderId) });
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
    },
    onError: (cause) => {
      if (isApiError(cause) && cause.fieldErrors) {
        for (const [field, messages] of Object.entries(cause.fieldErrors)) {
          form.setError(field as keyof DisputeFormValues, { message: messages[0] });
        }
        return;
      }
      setError(isApiError(cause) ? cause.message : "Не получилось открыть спор");
    },
  });

  const options = optionsQuery.data;
  const affectedQty = Number(form.watch("affectedQty") || 0);
  const remedy = form.watch("remedy");
  const preview =
    options && affectedQty > 0 ? options.unitPrice * affectedQty : (options?.unitPrice ?? 0);

  return (
    <>
      <div className="bg-surface rounded-card mb-3 px-5 py-4">
        <h1 className="font-heading text-2xl font-bold">Претензия по заказу № {orderId}</h1>
        <p className="text-muted mt-1 text-[13.5px]">
          {orderTitle} · пока идёт разбирательство, выплата фабрике заблокирована. Решение оператора
          обязательно для обеих сторон по оферте.
        </p>
      </div>

      {error !== undefined && (
        <Alert kind="danger" className="mb-3" title="Претензия не отправлена">
          {error}
        </Alert>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_340px]">
        <Box>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              void form.handleSubmit((values) => {
                open.mutate(values);
              })(event);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Причина" error={form.formState.errors.reason?.message}>
                <Select
                  aria-label="Причина претензии"
                  value={form.watch("reason")}
                  onValueChange={(value) => {
                    form.setValue("reason", value as DisputeReason);
                  }}
                >
                  {(options?.reasons ?? []).map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.title}
                    </SelectItem>
                  ))}
                </Select>
              </Field>
              <Field
                label="Затронуто изделий"
                hint={options ? `из ${String(options.totalQty)} шт в партии` : "укажите количество"}
                error={form.formState.errors.affectedQty?.message}
              >
                <Input inputMode="numeric" {...form.register("affectedQty")} />
              </Field>
            </div>

            <Field label="Описание" error={form.formState.errors.description?.message}>
              <Textarea
                rows={4}
                placeholder="Что именно не так: замеры, партия, номера коробов"
                {...form.register("description")}
              />
            </Field>

            <div>
              <h3 className="font-heading text-base font-bold">Доказательства</h3>
              <p className="text-muted mt-0.5 text-[12.5px]">
                Фотографии замеров и брака. Решение принимается по документам, а не по словам.
              </p>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="sr-only"
                aria-label="Приложить фото"
                onChange={(event) => {
                  setFiles([...(event.target.files ?? [])]);
                }}
              />
              <Button type="button" className="mt-2" onClick={() => fileRef.current?.click()}>
                + Фото
              </Button>
              {files.length > 0 && (
                <ul className="text-muted mt-1.5 list-none p-0 text-[12.5px]">
                  {files.map((file) => (
                    <li key={file.name}>{file.name}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="font-heading text-base font-bold">Чего вы хотите</h3>
              <RadioGroup
                className="mt-2 flex flex-col gap-1.5"
                value={remedy}
                onValueChange={(value) => {
                  form.setValue("remedy", value as DisputeRemedyKind);
                }}
                aria-label="Требование по претензии"
              >
                {(options?.remedies ?? []).map((item) => (
                  <Radio
                    key={item.kind}
                    value={item.kind}
                    disabled={!item.available}
                    label={
                      <span>
                        <b>
                          {item.title}
                          {item.kind === "partial_refund" && affectedQty > 0
                            ? ` · ${formatRub(preview)}`
                            : item.amount != null
                              ? ` · ${formatRub(item.amount)}`
                              : ""}
                        </b>
                        {item.description != null && (
                          <span className="text-muted block text-[12.5px]">{item.description}</span>
                        )}
                      </span>
                    }
                  />
                ))}
              </RadioGroup>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="cta" disabled={open.isPending}>
                {open.isPending ? "Открываем спор…" : "Открыть спор"}
              </Button>
              <Button asChild variant="ghost">
                <AppLink to={`/account/orders/${String(orderId)}`}>Отмена</AppLink>
              </Button>
            </div>
          </form>
        </Box>

        <Box>
          <h3 className="font-heading text-base font-bold">Как это работает</h3>
          <ol className="text-muted mt-1.5 list-decimal pl-4 text-[12.5px]">
            <li className="mb-1">Претензия уходит фабрике, выплата блокируется.</li>
            <li className="mb-1">Фабрика отвечает — обычно в течение 2 рабочих дней.</li>
            <li className="mb-1">Не договорились — решает оператор платформы.</li>
            <li>Решение исполняется автоматически: переделка, возврат или выплата.</li>
          </ol>
          {options?.openUntil != null && (
            <p className="text-muted mt-2 text-[12px]">
              Претензию принимаем до {formatDateTime(options.openUntil)} — пока идёт окно приёмки.
            </p>
          )}
        </Box>
      </div>
    </>
  );
}

/* ─────────────────────────────── состояние спора ─────────────────────────────── */

const STAGE_TITLES: { key: Dispute["status"]; title: string }[] = [
  { key: "opened", title: "Претензия" },
  { key: "factory_replied", title: "Ответ фабрики" },
  { key: "operator_review", title: "Решение платформы" },
  { key: "resolved", title: "Исполнение" },
];

const REMEDY_TITLES: Record<DisputeRemedyKind, string> = {
  rework: "Допечатка за счёт фабрики",
  partial_refund: "Частичный возврат",
  full_refund: "Полный возврат и возврат партии",
};

function DisputeState({ dispute, orderId }: { dispute: Dispute; orderId: number }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | undefined>(undefined);

  const withdraw = useMutation({
    mutationFn: () => getApiService().withdrawDispute(orderId),
    onSuccess: (updated) => {
      queryClient.setQueryData(DISPUTE_KEYS.detail(orderId), updated);
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.detail(orderId) });
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
    },
    onError: (cause) => {
      setError(isApiError(cause) ? cause.message : "Не получилось отозвать претензию");
    },
  });

  const activeIndex = STAGE_TITLES.findIndex((stage) => stage.key === dispute.status);
  const stages = STAGE_TITLES.map((stage, index) => ({
    stage: stage.key as unknown as "paid",
    title: stage.title,
    state: (index < activeIndex ? "done" : index === activeIndex ? "active" : "todo") as
      "done" | "active" | "todo",
    pct: null,
    note: noteOf(stage.key, dispute),
    at: null,
  }));

  return (
    <>
      <div className="bg-surface rounded-card mb-3 grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold">Спор по заказу № {orderId}</h1>
            <Tag
              tone={
                dispute.status === "resolved"
                  ? "ok"
                  : dispute.status === "withdrawn"
                    ? "done"
                    : "work"
              }
            >
              {statusTitle(dispute.status)}
            </Tag>
          </div>
          <p className="text-muted mt-1 text-[13.5px]">
            Открыт {formatDateTime(dispute.openedAt)}
            {dispute.escrowBlocked && " · выплата фабрике заблокирована"}
            {dispute.decisionDueAt !== null &&
              ` · решение оператора — до ${formatDateTime(dispute.decisionDueAt)}`}
          </p>
          <PipelineBar className="mt-3" stages={stages} />
        </div>
        {dispute.status !== "resolved" && dispute.status !== "withdrawn" && (
          <Button
            variant="ghost"
            disabled={withdraw.isPending}
            onClick={() => {
              withdraw.mutate();
            }}
          >
            {withdraw.isPending ? "Отзываем…" : "Отозвать претензию"}
          </Button>
        )}
      </div>

      {error !== undefined && (
        <Alert kind="danger" className="mb-3" title="Не вышло">
          {error}
        </Alert>
      )}

      {dispute.decision && (
        <Alert
          kind={dispute.decision.inFavorOf === "customer" ? "info" : "warn"}
          className="mb-3"
          title={`Решение оператора: ${REMEDY_TITLES[dispute.decision.resolution as DisputeRemedyKind] ?? "претензия отклонена"}`}
        >
          {dispute.decision.comment}
          {dispute.decision.amount !== null && ` · ${formatRub(dispute.decision.amount)}`}
        </Alert>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          <Box>
            <h2 className="font-heading text-lg font-bold">Ваша претензия</h2>
            <dl className="mt-2 grid grid-cols-[minmax(120px,160px)_1fr] gap-x-3 gap-y-1.5 text-[13.5px]">
              <dt className="text-muted">Причина</dt>
              <dd className="m-0">{dispute.reasonTitle}</dd>
              <dt className="text-muted">Затронуто изделий</dt>
              <dd className="num m-0">
                {dispute.affectedQty === null
                  ? "вся партия"
                  : `${String(dispute.affectedQty)} из ${String(dispute.totalQty)}`}
              </dd>
              <dt className="text-muted">Требование</dt>
              <dd className="m-0">
                {REMEDY_TITLES[dispute.remedy]}
                {dispute.remedyAmount !== null && ` · ${formatRub(dispute.remedyAmount)}`}
              </dd>
              <dt className="text-muted">Описание</dt>
              <dd className="m-0">{dispute.description}</dd>
            </dl>
            {dispute.evidence.length > 0 && (
              <ul className="mt-2 flex list-none flex-wrap gap-1.5 p-0">
                {dispute.evidence.map((file) => (
                  <li key={file.id}>
                    <a className="text-action text-[12.5px]" href={file.url ?? "#"}>
                      {file.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Box>

          <ChatPanel orderId={orderId} channel="dispute" title="Переписка по спору" />
        </div>

        <div className="flex flex-col gap-3">
          <Box>
            <h3 className="font-heading text-base font-bold">Что видит оператор</h3>
            <p className="text-muted mt-1 text-[12.5px]">
              Решение принимается по документам, а не по словам.
            </p>
            <div className="mt-1.5">
              {[
                { label: "Журнал заказа", action: "Открыть" },
                { label: "Фотоотчёты фабрики", action: "Открыть" },
                { label: "Чат с технологом", action: "Открыть" },
              ].map((row) => (
                <AppLink
                  key={row.label}
                  to={`/account/orders/${String(orderId)}`}
                  className="border-border flex justify-between gap-3 border-b border-dashed py-[7px] text-[13px] last:border-0"
                >
                  <span>{row.label}</span>
                  <span className="text-action">{row.action}</span>
                </AppLink>
              ))}
            </div>
          </Box>

          <Box>
            <h3 className="font-heading text-base font-bold">
              Эскроу · {formatRub(dispute.escrowAmount)}
            </h3>
            <p className="text-danger mt-1.5 text-[12.5px]">
              {dispute.escrowBlocked ? "Заблокировано до решения спора" : "Блокировка снята"}
            </p>
          </Box>

          <Alert kind="info" title="Арбитраж платформы">
            Если вы не договоритесь с фабрикой
            {dispute.factoryReplyDueAt === null
              ? ""
              : ` до ${formatShortDate(dispute.factoryReplyDueAt)}`}
            , решение примет оператор. Оно обязательно для обеих сторон по оферте.
          </Alert>
        </div>
      </div>
    </>
  );
}

function statusTitle(status: Dispute["status"]): string {
  switch (status) {
    case "opened":
      return "На рассмотрении";
    case "factory_replied":
      return "Фабрика ответила";
    case "operator_review":
      return "У оператора";
    case "resolved":
      return "Решён";
    case "withdrawn":
      return "Отозван";
  }
}

function noteOf(key: Dispute["status"], dispute: Dispute): string | null {
  if (key === "opened") return formatShortDate(dispute.openedAt);
  if (key === "factory_replied" && dispute.factoryReplyDueAt !== null) {
    return `до ${formatShortDate(dispute.factoryReplyDueAt)}`;
  }
  if (key === "operator_review" && dispute.decisionDueAt !== null) {
    return `до ${formatShortDate(dispute.decisionDueAt)}`;
  }
  if (key === "resolved") return "возврат / выплата";
  return null;
}
