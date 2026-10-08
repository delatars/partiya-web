import type { AdminOverdueActionResult, AdminOverdueTranche } from "@partiya/api-contracts";
import {
  Alert,
  Box,
  Button,
  DataTable,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Skeleton,
  Tag,
  Textarea,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ADMIN_KEYS, adminOverdueTranchesOptions, getApiService, isApiError } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/dates";
import { formatRub } from "@/shared/lib/format";
import { AppLink } from "@/shared/ui";

/* Экран «Просроченные транши» (DECISIONS.md, Q-401 — вариант «в»; Q-420…Q-423).

   Второй транш 50/50 не оплачен и после автоматического продления на 48 ч: партия стоит
   на контроле качества, отгрузка закрыта. Оператор решает одно из двух:
   — «Продлить» — тот же счёт (номер не меняется, Q-420) получает срок «сейчас + N ч»;
   — «Открыть спор» — счёт снимается, заказ уходит в спор от имени платформы, первый
     транш делит обычное решение по спору (экран «Споры»).
   Комментарий обязателен у обоих: он уходит в аудит-лог, журнал заказа и уведомления.
   Если заказчик успел оплатить — сервер ответит 409 `payments/tranche-already-paid`, и
   строка просто исчезнет из очереди. */

/** Варианты продления в один клик; любое другое число часов — полем. */
const PRESETS = [24, 48, 72] as const;

export function AdminOverdueTranchesPage() {
  const queryClient = useQueryClient();
  const list = useQuery(adminOverdueTranchesOptions());
  const [selectedNo, setSelectedNo] = useState<number | null>(null);
  const [hours, setHours] = useState("48");
  const [comment, setComment] = useState("");
  const [done, setDone] = useState<AdminOverdueActionResult | null>(null);

  const rows = list.data?.items ?? [];
  const selected = rows.find((row) => row.orderNo === selectedNo) ?? rows[0] ?? null;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.overdue() });
  };

  const onSuccess = (result: AdminOverdueActionResult) => {
    setDone(result);
    setComment("");
    setSelectedNo(null);
    void refresh();
  };

  const extend = useMutation({
    mutationFn: (row: AdminOverdueTranche) =>
      getApiService().extendAdminOverdueTranche(row.orderNo, {
        hours: Number(hours),
        comment,
      }),
    onSuccess,
    onError: () => void refresh(),
  });

  const dispute = useMutation({
    mutationFn: (row: AdminOverdueTranche) =>
      getApiService().openAdminOverdueDispute(row.orderNo, { comment }),
    onSuccess,
    onError: () => void refresh(),
  });

  const actionError = extend.error ?? dispute.error;
  const fieldErrors = isApiError(actionError) ? (actionError.problem?.errors ?? {}) : {};
  const commentError =
    fieldErrors.comment?.[0] ??
    (isApiError(actionError) && actionError.problem?.type?.endsWith("/comment-required")
      ? "Комментарий обязателен"
      : undefined);
  const hoursError = fieldErrors.hours?.[0];
  const busy = extend.isPending || dispute.isPending;

  return (
    <>
      <PageHeader
        title="Просроченные транши"
        subtitle="Второй транш 50/50 не оплачен и после автопродления на 48 ч — партия ждёт решения"
        actions={
          <Button onClick={() => void refresh()} disabled={list.isFetching}>
            Обновить
          </Button>
        }
      />

      {done !== null ? (
        <Alert kind="info" className="mb-3" title={`Заказ № ${String(done.orderNo)}`}>
          {done.outcome === "extended" ? (
            <>Срок продлён до {done.dueAt === null ? "—" : formatDateTime(done.dueAt)}.</>
          ) : (
            <>
              Счёт снят, открыт спор от имени платформы.{" "}
              <AppLink to="/admin/disputes">Перейти к спорам</AppLink>
            </>
          )}
        </Alert>
      ) : null}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
        <Box>
          {list.isPending ? (
            <Skeleton className="h-48" />
          ) : list.isError ? (
            <Alert kind="danger" title="Не получилось загрузить очередь">
              {list.error.message}
            </Alert>
          ) : (
            <DataTable
              rows={rows}
              rowKey={(row) => String(row.orderNo)}
              rowHighlighted={(row) => row.orderNo === selected?.orderNo}
              scrollable
              minWidth={620}
              empty={
                <EmptyState
                  title="Просроченных траншей нет"
                  description="Вторые транши оплачены в срок или ещё ждут оплаты в продлённый срок."
                />
              }
              columns={[
                {
                  key: "order",
                  header: "Заказ",
                  cell: (row) => (
                    <button
                      type="button"
                      className="text-action text-left font-medium hover:underline"
                      onClick={() => {
                        setSelectedNo(row.orderNo);
                        setComment("");
                        setDone(null);
                        extend.reset();
                        dispute.reset();
                      }}
                    >
                      <span className="block">№ {row.orderNo}</span>
                      <span className="text-muted block text-[12px] font-normal">
                        {row.orderTitle}
                      </span>
                    </button>
                  ),
                },
                {
                  key: "parties",
                  header: "Стороны",
                  cell: (row) => (
                    <span className="text-[12.5px]">
                      {row.customerName}
                      <span className="text-muted block">{row.factoryName}</span>
                    </span>
                  ),
                },
                {
                  key: "amount",
                  header: "Второй транш",
                  align: "right",
                  cell: (row) => (
                    <span className="num">
                      {formatRub(row.amount)}
                      <span className="text-muted block text-[12px]">{row.invoiceNumber}</span>
                    </span>
                  ),
                },
                {
                  key: "overdue",
                  header: "У оператора с",
                  cell: (row) => formatDateTime(row.overdueSince),
                },
              ]}
            />
          )}
        </Box>

        <Box aria-live="polite">
          {selected === null ? (
            <EmptyState
              title="Выберите строку"
              description="Карточка покажет историю сроков и действия."
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-base font-bold">
                  Заказ № {selected.orderNo} · счёт {selected.invoiceNumber}
                </h2>
                <Tag tone="hot">просрочен</Tag>
              </div>
              <dl className="mt-2 grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 gap-y-1 text-[13px]">
                <dt className="text-muted">Второй транш</dt>
                <dd className="num m-0">{formatRub(selected.amount)}</dd>
                <dt className="text-muted">В эскроу</dt>
                <dd className="num m-0">{formatRub(selected.heldAmount)} · первый транш</dd>
                <dt className="text-muted">Срок истёк</dt>
                <dd className="m-0">{formatDateTime(selected.dueAt)}</dd>
                <dt className="text-muted">Продлений</dt>
                <dd className="num m-0">{selected.extensions}</dd>
              </dl>

              <h3 className="mt-3 text-[13px] font-medium">История сроков</h3>
              <ul className="mt-1 grid gap-1.5 text-[12.5px]">
                {selected.history.map((item) => (
                  <li key={`${item.at}-${item.dueAt}`}>
                    <b>{item.kind === "auto" ? "Автопродление" : "Оператор"}</b> ·{" "}
                    {formatDateTime(item.previousDueAt)} → {formatDateTime(item.dueAt)}
                    {item.comment === null ? null : (
                      <span className="text-muted block">{item.comment}</span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-3 grid gap-2">
                <Field label="Продлить на, часов" hint="От 1 до 336" error={hoursError}>
                  <Input
                    type="number"
                    min={1}
                    max={336}
                    inputMode="numeric"
                    value={hours}
                    onChange={(event) => {
                      setHours(event.target.value);
                    }}
                  />
                </Field>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      size="sm"
                      variant="ghost"
                      aria-pressed={hours === String(preset)}
                      onClick={() => {
                        setHours(String(preset));
                      }}
                    >
                      {preset} ч
                    </Button>
                  ))}
                </div>
                <Field
                  label="Комментарий"
                  hint="Обязателен: попадёт в аудит-лог, журнал заказа и уведомления сторонам"
                  error={commentError}
                >
                  <Textarea
                    rows={2}
                    value={comment}
                    onChange={(event) => {
                      setComment(event.target.value);
                    }}
                    placeholder="Например: заказчик прислал платёжку, ждём зачисления"
                  />
                </Field>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      extend.reset();
                      dispute.mutate(selected);
                    }}
                  >
                    {dispute.isPending ? "Открываем…" : "Открыть спор"}
                  </Button>
                  <Button
                    variant="cta"
                    disabled={busy}
                    onClick={() => {
                      dispute.reset();
                      extend.mutate(selected);
                    }}
                  >
                    {extend.isPending ? "Продлеваем…" : "Продлить"}
                  </Button>
                </div>
                <p className="text-muted text-[12px]">
                  Спор: счёт снимается, первый транш делит решение по спору — отказ заводу или
                  возврат заказчику.
                </p>
              </div>

              {actionError && commentError === undefined && hoursError === undefined ? (
                <p role="alert" className="text-danger mt-2 text-[13px]">
                  {actionErrorText(actionError)}
                </p>
              ) : null}
            </>
          )}
        </Box>
      </div>
    </>
  );
}

function actionErrorText(error: Error): string {
  if (isApiError(error)) {
    const type = error.problem?.type ?? "";
    if (type.endsWith("/tranche-already-paid")) {
      return "Заказчик уже оплатил второй транш — заказ продолжает путь, решение не нужно.";
    }
    if (type.endsWith("/tranche-cancelled")) return "Счёт уже снят — по заказу открыт спор.";
    if (type.endsWith("/tranche-not-overdue")) {
      return "Счёт уже не в очереди: срок продлён другим оператором.";
    }
  }
  return error.message;
}
