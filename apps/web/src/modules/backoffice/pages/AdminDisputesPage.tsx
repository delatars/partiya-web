import type { DisputeResolution } from "@partiya/api-contracts";
import {
  Alert,
  Box,
  Button,
  DataTable,
  EmptyState,
  Field,
  PageHeader,
  Radio,
  RadioGroup,
  Skeleton,
  Tag,
  Textarea,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ADMIN_KEYS, adminDisputeListOptions, getApiService, isApiError } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/dates";
import { formatNumber, formatRub } from "@/shared/lib/format";
import { AppLink, PhotoStrip } from "@/shared/ui";

/* Макет: экран `admin-disputes` — очередь споров и карточка решения.

   Решение — это распределение суммы эскроу (ARCHITECTURE.md, раздел 9). Суммы считает
   сервер и присылает вариантами: браузер ничего не делит, потому что эти же числа
   уходят в проводки ledger. Обоснование обязательно — его видят обе стороны. */

const STATUS_TITLE: Record<string, string> = {
  opened: "Открыт",
  factory_replied: "Фабрика ответила",
  operator_review: "У оператора",
  resolved: "Решён",
  withdrawn: "Отозван",
};

export function AdminDisputesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const { data, isPending } = useQuery(adminDisputeListOptions({ tab }));
  const [resolution, setResolution] = useState<DisputeResolution>("rework");
  const [comment, setComment] = useState("");

  const resolve = useMutation({
    mutationFn: (orderId: number) => {
      const option = data?.selected?.options.find((item) => item.resolution === resolution);
      return getApiService().resolveAdminDispute(
        orderId,
        {
          resolution,
          inFavorOf: resolution === "rejected" ? "factory" : "customer",
          amount: option && option.customerAmount > 0 ? option.customerAmount : null,
          comment: comment.trim(),
        },
        `admin:dispute:${String(orderId)}:${resolution}`,
      );
    },
    onSuccess: async () => {
      setComment("");
      await queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all });
    },
  });

  if (isPending) {
    return (
      <>
        <PageHeader title="Споры" subtitle="Очередь и решения оператора" />
        <Skeleton className="h-64" />
      </>
    );
  }

  const card = data?.selected ?? null;
  const chosen = card?.options.find((item) => item.resolution === resolution);

  return (
    <>
      <PageHeader
        title="Споры"
        subtitle={`Открытых: ${String(data?.counts.open ?? 0)} · решено: ${String(data?.counts.resolved ?? 0)}`}
        actions={
          <>
            <Button variant={tab === "open" ? "cta" : "default"} onClick={() => setTab("open")}>
              Открытые
            </Button>
            <Button
              variant={tab === "resolved" ? "cta" : "default"}
              onClick={() => setTab("resolved")}
            >
              Решённые
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <Box>
            <DataTable
              rows={data?.items ?? []}
              rowKey={(row) => row.disputeId}
              rowHighlighted={(row) => row.urgent}
              scrollable
              minWidth={620}
              empty={
                <EmptyState
                  title="Споров нет"
                  description="Открытых разбирательств в этой вкладке не осталось."
                />
              }
              columns={[
                {
                  key: "order",
                  header: "Заказ",
                  cell: (row) => (
                    <AppLink
                      to={`/account/orders/${String(row.orderId)}`}
                      className="text-action font-medium hover:underline"
                    >
                      № {row.orderId}
                    </AppLink>
                  ),
                },
                { key: "parties", header: "Стороны", cell: (row) => row.parties },
                { key: "reason", header: "Причина", cell: (row) => row.reasonTitle },
                {
                  key: "status",
                  header: "Статус",
                  cell: (row) => (
                    <Tag tone={row.status === "resolved" ? "done" : "hot"}>
                      {STATUS_TITLE[row.status] ?? row.status}
                    </Tag>
                  ),
                },
                {
                  key: "escrow",
                  header: "Эскроу",
                  align: "right",
                  cell: (row) => <span className="num">{formatRub(row.escrowAmount)}</span>,
                },
                {
                  key: "due",
                  header: "Решение до",
                  cell: (row) => (
                    <span className="text-muted text-[12.5px]">
                      {row.decisionDueAt === null ? "—" : formatDateTime(row.decisionDueAt)}
                    </span>
                  ),
                },
              ]}
            />
          </Box>

          {card === null ? null : (
            <>
              <Box className="mt-3">
                <h3 className="font-heading text-base font-bold">Позиции сторон</h3>
                <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                  {card.parties.map((party) => (
                    <div key={party.side} className="border-border rounded-card border p-3">
                      <b className="text-[13.5px]">{party.title}</b>
                      <p className="mt-1 text-[13px]">{party.text}</p>
                      {party.badge === null ? null : (
                        <Tag tone="ok" className="mt-1.5">
                          {party.badge}
                        </Tag>
                      )}
                      {party.evidence.length > 0 ? (
                        <div className="mt-2">
                          <PhotoStrip
                            size="sm"
                            photos={party.evidence.map((item) => ({
                              id: item.id,
                              url: item.url,
                              label: item.caption ?? item.fileName,
                              tone: "a",
                              takenAt: item.uploadedAt,
                            }))}
                            onOpen={() => undefined}
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Box>

              <Box className="mt-3">
                <h3 className="font-heading text-base font-bold">Доказательная база</h3>
                <table className="mt-2 w-full border-collapse text-[13px]">
                  <tbody>
                    {card.evidence.map((row) => (
                      <tr key={row.key} className="border-border border-b last:border-0">
                        <td className="py-1.5 pe-2 font-medium">{row.title}</td>
                        <td className="py-1.5 pe-2">{row.fact}</td>
                        <td className="text-muted py-1.5 text-[12.5px]">{row.verdict ?? "—"}</td>
                        <td className="py-1.5 text-right">
                          {row.href === null ? null : row.href.startsWith("/") ? (
                            <Button asChild size="sm">
                              <AppLink to={row.href}>Открыть</AppLink>
                            </Button>
                          ) : (
                            <Button asChild size="sm">
                              <a href={row.href}>Открыть</a>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>

              <Box className="mt-3">
                <h3 className="font-heading text-base font-bold">
                  Переписка сторон · {card.messages.length}
                </h3>
                <div className="mt-2 grid gap-2">
                  {card.messages.length === 0 ? (
                    <p className="text-muted text-[13px]">В ветке спора пока пусто.</p>
                  ) : (
                    card.messages.map((message) => (
                      <div key={message.id} className="bg-subtle rounded-control px-2.5 py-2">
                        <div className="text-muted text-[11.5px]">
                          {message.author.name} · {formatDateTime(message.createdAt)}
                        </div>
                        <div className="text-[13px]">{message.text}</div>
                      </div>
                    ))
                  )}
                </div>
              </Box>
            </>
          )}
        </div>

        <aside>
          <Box>
            {card === null ? (
              <EmptyState title="Спор не выбран" description="Очередь пуста." />
            ) : (
              <>
                <h3 className="font-heading text-base font-bold">
                  Решение по заказу № {card.orderId}
                </h3>
                <div className="text-muted text-[12.5px]">
                  {card.customerName} ↔ {card.factoryName} · эскроу {formatRub(card.escrowAmount)}
                  {card.affectedQty === null
                    ? ""
                    : ` · затронуто ${formatNumber(card.affectedQty)} из ${formatNumber(card.totalQty)} шт`}
                </div>

                {card.decision === null ? (
                  <>
                    <RadioGroup
                      className="mt-3"
                      value={resolution}
                      onValueChange={(next) => setResolution(next as DisputeResolution)}
                      aria-label="Исход спора"
                    >
                      {card.options.map((option) => (
                        <Radio
                          key={option.resolution}
                          value={option.resolution}
                          disabled={!option.available}
                          label={
                            <span>
                              <b>{option.title}</b>
                              {option.description === null ? null : (
                                <span className="text-muted block text-[12.5px]">
                                  {option.description}
                                </span>
                              )}
                            </span>
                          }
                        />
                      ))}
                    </RadioGroup>

                    <h4 className="mt-3 text-[13px] font-bold">Распределение эскроу</h4>
                    <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">
                      <dt className="text-muted">Заказчику</dt>
                      <dd className="num m-0 text-right">
                        {formatRub(chosen?.customerAmount ?? 0)}
                      </dd>
                      <dt className="text-muted">Фабрике</dt>
                      <dd className="num m-0 text-right">
                        {formatRub(chosen?.factoryAmount ?? 0)}
                      </dd>
                      <dt className="text-muted">Комиссия</dt>
                      <dd className="num m-0 text-right">{formatRub(chosen?.fee ?? 0)}</dd>
                    </dl>

                    <Field label="Обоснование (увидят обе стороны)" wide className="mt-3">
                      <Textarea
                        rows={3}
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        placeholder="Несоответствие спецификации подтверждено замерами и признано фабрикой."
                      />
                    </Field>
                    <Button
                      variant="cta"
                      className="mt-2 w-full"
                      disabled={resolve.isPending}
                      onClick={() => resolve.mutate(card.orderId)}
                    >
                      {resolve.isPending ? "Выносим…" : "Вынести решение"}
                    </Button>
                    <p className="text-muted mt-2 text-[12.5px]">
                      Решение записывается в журнал заказа и влияет на рейтинг фабрики.
                    </p>
                    {resolve.error ? (
                      <Alert kind="danger" className="mt-2" title="Решение не прошло">
                        {isApiError(resolve.error) ? resolve.error.message : "Ошибка"}
                      </Alert>
                    ) : null}
                  </>
                ) : (
                  <Alert kind="info" className="mt-3" title="Решение вынесено">
                    {card.decision.comment}
                    <div className="text-muted mt-1 text-[12.5px]">
                      {formatDateTime(card.decision.decidedAt)} · {card.decision.decidedBy.name}
                      {card.decision.amount === null
                        ? ""
                        : ` · возврат ${formatRub(card.decision.amount)}`}
                    </div>
                  </Alert>
                )}
              </>
            )}
          </Box>
        </aside>
      </div>
    </>
  );
}
