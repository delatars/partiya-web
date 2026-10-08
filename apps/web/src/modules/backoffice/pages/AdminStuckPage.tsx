import type {
  AdminStuckCount,
  AdminStuckKind,
  AdminStuckRow,
  AdminStuckStatus,
} from "@partiya/api-contracts";
import {
  Alert,
  Box,
  Button,
  DataTable,
  EmptyState,
  Field,
  PageHeader,
  Skeleton,
  TabBar,
  TabBarItem,
  Tag,
  Textarea,
} from "@partiya/ui";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ADMIN_KEYS, adminStuckCardOptions, getApiService, isApiError } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/dates";

/* Экран «Зависшие» (DECISIONS.md, п. 35; Q-52/Q-53, Q-372…Q-375).

   Три очереди: мёртвые фоновые задания, не разосланные доменные события и не
   обработанные webhook-и старше минуты. Пушей нет — только бейдж в меню и этот экран.
   Лента — курсором (`nextCursor`), счётчики вкладок — из той же страницы (`counts`),
   они не зависят от фильтра. Карточка — ошибка целиком, payload как в очереди и история
   действий оператора из аудит-лога.

   «Повторить» у задания — ровно одна попытка (Q-372); «Отметить решённым» у события —
   подписчики его не получат (Q-373), поэтому комментарий обязателен (422). */

type Tab = AdminStuckKind | "all";

const TABS: { key: Tab; label: string; count: (counts: AdminStuckCount) => number }[] = [
  { key: "all", label: "Все", count: (counts) => counts.total },
  { key: "job", label: "Задания", count: (counts) => counts.jobs },
  { key: "outbox", label: "События", count: (counts) => counts.outbox },
  { key: "inbox", label: "Webhook-и", count: (counts) => counts.inbox },
];

const KIND_TITLE: Record<AdminStuckKind, string> = {
  job: "задание",
  outbox: "событие",
  inbox: "webhook",
};

const STATUS: Record<AdminStuckStatus, { label: string; tone: "hot" | "work" | "ok" | "done" }> = {
  dead: { label: "мёртвое", tone: "hot" },
  pending: { label: "ждёт", tone: "work" },
  running: { label: "выполняется", tone: "work" },
  done: { label: "выполнено", tone: "ok" },
  resolved: { label: "решено", tone: "done" },
};

const PAGE_SIZE = 20;

/** Текст ошибки действия: известные коды — человеческими словами. */
function actionErrorText(error: Error): string {
  if (!isApiError(error)) return error.message;
  const type = error.problem?.type ?? "";
  if (type.endsWith("/admin/stuck-busy")) {
    return "Строку прямо сейчас обрабатывает воркер — повторите через несколько секунд.";
  }
  if (type.endsWith("/admin/stuck-not-stuck")) {
    return "Строка уже не зависла: её выполнили, разослали или решили раньше. Список обновлён.";
  }
  if (type.endsWith("/admin/comment-required")) {
    return error.fieldErrors?.comment?.[0] ?? "Напишите, почему строку можно считать решённой.";
  }
  return error.message;
}

export function AdminStuckPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<{ kind: AdminStuckKind; id: string } | null>(null);
  const [comment, setComment] = useState("");

  const kind = tab === "all" ? undefined : tab;
  const list = useInfiniteQuery({
    queryKey: ADMIN_KEYS.stuckList({ kind, limit: PAGE_SIZE }),
    queryFn: ({ pageParam, signal }) =>
      getApiService().listAdminStuck({ kind, cursor: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 0,
  });
  const card = useQuery({
    ...adminStuckCardOptions(selected?.kind ?? "job", selected?.id ?? ""),
    enabled: selected !== null,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.stuck() });

  const retry = useMutation({
    mutationFn: (target: { kind: AdminStuckKind; id: string }) =>
      getApiService().retryAdminStuck(target.kind, target.id, {
        comment: comment.trim().length > 0 ? comment.trim() : null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(ADMIN_KEYS.stuckCard(updated.row.kind, updated.row.id), updated);
      setComment("");
      void refresh();
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 409) void refresh();
    },
  });
  const resolve = useMutation({
    mutationFn: (target: { kind: AdminStuckKind; id: string }) =>
      getApiService().resolveAdminStuck(target.kind, target.id, { comment: comment.trim() }),
    onSuccess: (updated) => {
      queryClient.setQueryData(ADMIN_KEYS.stuckCard(updated.row.kind, updated.row.id), updated);
      setComment("");
      void refresh();
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 409) void refresh();
    },
  });

  const pages = list.data?.pages ?? [];
  const rows: AdminStuckRow[] = pages.flatMap((page) => page.items);
  const counts = pages[0]?.counts;
  const actionError = retry.error ?? resolve.error;
  const commentError =
    isApiError(resolve.error) && resolve.error.fieldErrors?.comment !== undefined
      ? actionErrorText(resolve.error)
      : undefined;

  return (
    <>
      <PageHeader
        title="Зависшие"
        subtitle="Мёртвые фоновые задания и события, не разосланные дольше минуты"
        actions={
          <Button onClick={() => void refresh()} disabled={list.isFetching}>
            Обновить
          </Button>
        }
      />

      <TabBar label="Очереди" className="mb-3">
        {TABS.map((item) => (
          <TabBarItem key={item.key} asChild active={item.key === tab}>
            <button
              type="button"
              onClick={() => {
                setTab(item.key);
                setSelected(null);
              }}
            >
              {item.label}
              {counts ? ` · ${String(item.count(counts))}` : ""}
            </button>
          </TabBarItem>
        ))}
      </TabBar>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
        <Box>
          {list.isPending ? (
            <Skeleton className="h-48" />
          ) : list.isError ? (
            <Alert kind="danger" title="Не получилось загрузить очередь">
              {list.error.message}
            </Alert>
          ) : (
            <>
              <DataTable
                rows={rows}
                rowKey={(row) => `${row.kind}:${row.id}`}
                rowHighlighted={(row) => row.kind === selected?.kind && row.id === selected.id}
                scrollable
                minWidth={620}
                empty={
                  <EmptyState
                    title="Ничего не зависло"
                    description="Все задания выполняются, события разосланы, webhook-и обработаны."
                  />
                }
                columns={[
                  {
                    key: "type",
                    header: "Что",
                    cell: (row) => (
                      <button
                        type="button"
                        className="text-action text-left font-medium hover:underline"
                        onClick={() => {
                          setSelected({ kind: row.kind, id: row.id });
                          setComment("");
                          retry.reset();
                          resolve.reset();
                        }}
                      >
                        <span className="block">{row.type}</span>
                        <span className="text-muted block text-[12px] font-normal">
                          {KIND_TITLE[row.kind]}
                          {row.subject === null ? "" : ` · ${row.subject}`}
                        </span>
                      </button>
                    ),
                  },
                  {
                    key: "error",
                    header: "Последняя ошибка",
                    cell: (row) => (
                      <span className="text-muted line-clamp-2 text-[12.5px]">
                        {row.lastError ?? "—"}
                      </span>
                    ),
                  },
                  {
                    key: "attempts",
                    header: "Попытки",
                    align: "right",
                    cell: (row) => (
                      <span className="num">
                        {row.attempts}
                        {row.maxAttempts === null ? "" : ` / ${String(row.maxAttempts)}`}
                      </span>
                    ),
                  },
                  {
                    key: "created",
                    header: "С",
                    cell: (row) => formatDateTime(row.createdAt),
                  },
                ]}
              />
              {list.hasNextPage ? (
                <div className="mt-2.5 flex justify-center">
                  <Button
                    disabled={list.isFetchingNextPage}
                    onClick={() => void list.fetchNextPage()}
                  >
                    {list.isFetchingNextPage ? "Загружаем…" : "Показать ещё"}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </Box>

        <Box aria-live="polite">
          {selected === null ? (
            <EmptyState
              title="Выберите строку"
              description="Карточка покажет ошибку целиком, payload и историю действий."
            />
          ) : card.isPending ? (
            <Skeleton className="h-48" />
          ) : card.isError ? (
            <Alert kind="danger" title="Карточка не открылась">
              {card.error.message}
            </Alert>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading min-w-0 text-base font-bold break-words">
                  {card.data.row.type}
                </h2>
                <Tag tone={STATUS[card.data.row.status].tone}>
                  {STATUS[card.data.row.status].label}
                </Tag>
              </div>
              <dl className="mt-2 grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-3 gap-y-1 text-[13px]">
                <dt className="text-muted">Очередь</dt>
                <dd className="m-0">{KIND_TITLE[card.data.row.kind]}</dd>
                <dt className="text-muted">Объект</dt>
                <dd className="m-0 break-all">{card.data.row.subject ?? "—"}</dd>
                <dt className="text-muted">Попытки</dt>
                <dd className="num m-0">
                  {card.data.row.attempts}
                  {card.data.row.maxAttempts === null
                    ? ""
                    : ` из ${String(card.data.row.maxAttempts)}`}
                </dd>
                <dt className="text-muted">Создано</dt>
                <dd className="m-0">{formatDateTime(card.data.row.createdAt)}</dd>
                {card.data.lockedBy !== null ? (
                  <>
                    <dt className="text-muted">Держит</dt>
                    <dd className="m-0">{card.data.lockedBy}</dd>
                  </>
                ) : null}
              </dl>

              <h3 className="mt-3 text-[13px] font-medium">Ошибка</h3>
              <pre className="bg-subtle rounded-control mt-1 max-h-40 overflow-auto px-2.5 py-2 text-[12px] whitespace-pre-wrap">
                {card.data.row.lastError ?? "ошибки нет — строка просто не обработана вовремя"}
              </pre>

              <h3 className="mt-3 text-[13px] font-medium">Payload</h3>
              <pre className="bg-subtle rounded-control mt-1 max-h-56 overflow-auto px-2.5 py-2 text-[12px]">
                {JSON.stringify(card.data.payload, null, 2)}
              </pre>

              {card.data.canRetry || card.data.canResolve ? (
                <div className="mt-3">
                  <Field
                    label="Комментарий"
                    hint="Для «Отметить решённым» обязателен — попадёт в аудит-лог"
                    error={commentError}
                  >
                    <Textarea
                      rows={2}
                      value={comment}
                      onChange={(event) => {
                        setComment(event.target.value);
                      }}
                      placeholder="Почему повторяем или почему строку можно закрыть"
                    />
                  </Field>
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    {card.data.canResolve ? (
                      <Button
                        variant="ghost"
                        disabled={resolve.isPending || retry.isPending}
                        onClick={() => {
                          retry.reset();
                          resolve.mutate(selected);
                        }}
                      >
                        {resolve.isPending ? "Закрываем…" : "Отметить решённым"}
                      </Button>
                    ) : null}
                    {card.data.canRetry ? (
                      <Button
                        variant="cta"
                        disabled={retry.isPending || resolve.isPending}
                        onClick={() => {
                          resolve.reset();
                          retry.mutate(selected);
                        }}
                      >
                        {retry.isPending ? "Повторяем…" : "Повторить"}
                      </Button>
                    ) : null}
                  </div>
                  {card.data.row.kind === "outbox" && card.data.canResolve ? (
                    <p className="text-muted mt-1.5 text-[12px]">
                      «Решено» у события значит: подписчики его не получат.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {actionError && commentError === undefined ? (
                <p role="alert" className="text-danger mt-2 text-[13px]">
                  {actionErrorText(actionError)}
                </p>
              ) : null}

              <h3 className="mt-3 text-[13px] font-medium">История</h3>
              {card.data.actions.length === 0 ? (
                <p className="text-muted mt-1 text-[12.5px]">Оператор ещё ничего не делал.</p>
              ) : (
                <ul className="mt-1 grid gap-1.5 text-[12.5px]">
                  {card.data.actions.map((action) => (
                    <li key={`${action.at}-${action.action}`}>
                      <b>{action.action === "stuck.retry" ? "Повтор" : "Решено"}</b> ·{" "}
                      {formatDateTime(action.at)} · {action.actorRef}
                      {action.comment === null ? null : (
                        <span className="text-muted block">{action.comment}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Box>
      </div>
    </>
  );
}
