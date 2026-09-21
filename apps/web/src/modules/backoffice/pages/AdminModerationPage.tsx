import {
  Alert,
  Box,
  Button,
  DataTable,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Placeholder,
  Select,
  SelectItem,
  Skeleton,
  TabBar,
  TabBarItem,
  Tag,
  Textarea,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  ADMIN_KEYS,
  adminFactoryListOptions,
  adminOfferListOptions,
  getApiService,
  isApiError,
} from "@/shared/api";
import { formatIsoDate } from "@/shared/lib/dates";

/* Макет: экраны `admin-factories` и `admin-offers` — две очереди модерации.

   Обе живут на одном маршруте вкладками: у оператора это одна работа — «разобрать
   входящее», и разносить её по двум пунктам меню значило бы заставлять его прыгать.

   Любое решение требует обоснования (ARCHITECTURE.md, раздел 9): текст уходит заводу
   и в аудит-лог. Одобрение SKU публикует версию — предложение сразу появляется в
   каталоге. */

const FACTORY_STAGE_TITLE: Record<string, string> = {
  application: "Заявка",
  documents_ok: "Документы ок",
  visit_scheduled: "Выезд назначен",
  passed: "Аудит пройден",
  no_audit: "Без аудита",
  rejected: "Отклонена",
  suspended: "Приостановлен",
};

const FACTORY_STAGE_TONE: Record<string, "new" | "work" | "ok" | "done"> = {
  application: "new",
  documents_ok: "work",
  visit_scheduled: "work",
  passed: "ok",
  no_audit: "done",
  rejected: "done",
  suspended: "done",
};

export type ModerationSelection = {
  /** Какая очередь открыта. */
  queue: "offers" | "factories";
  /** Выбранная заявка: номер предложения или организация завода. */
  selected?: string;
};

export type AdminModerationPageProps = {
  selection: ModerationSelection;
  onSelectionChange: (next: ModerationSelection) => void;
};

export function AdminModerationPage({ selection, onSelectionChange }: AdminModerationPageProps) {
  const tab = selection.queue;
  const setTab = (queue: "offers" | "factories") => {
    onSelectionChange({ queue });
  };
  const select = (id: string) => {
    onSelectionChange({ queue: tab, selected: id });
  };

  return (
    <>
      <PageHeader
        title="Модерация"
        subtitle="Заявки заводов и предложения на проверке · SLA 1 рабочий день"
      />
      <TabBar label="Очереди модерации" className="mb-3">
        <TabBarItem asChild active={tab === "offers"}>
          <button type="button" onClick={() => setTab("offers")}>
            Предложения
          </button>
        </TabBarItem>
        <TabBarItem asChild active={tab === "factories"}>
          <button type="button" onClick={() => setTab("factories")}>
            Заводы и аудит
          </button>
        </TabBarItem>
      </TabBar>

      {tab === "offers" ? (
        <OffersQueue selected={selection.selected} onSelect={select} />
      ) : (
        <FactoriesQueue selected={selection.selected} onSelect={select} />
      )}
    </>
  );
}

function OffersQueue({
  selected,
  onSelect,
}: {
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const selectedId = selected === undefined ? undefined : Number(selected);
  const { data, isPending } = useQuery(
    adminOfferListOptions({
      tab: "queue",
      ...(selectedId !== undefined && Number.isFinite(selectedId) ? { selected: selectedId } : {}),
    }),
  );
  const [comment, setComment] = useState("");

  const decide = useMutation({
    mutationFn: (input: { offerId: number; decision: "approve" | "reject" }) =>
      getApiService().decideAdminOffer(input.offerId, {
        decision: input.decision,
        comment: comment.trim(),
      }),
    onSuccess: async () => {
      setComment("");
      await queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all });
    },
  });

  if (isPending) return <Skeleton className="h-64" />;
  const card = data?.selected ?? null;

  return (
    <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Box>
        <h2 className="font-heading text-base font-bold">
          Новые и правки · {data?.counts.queue ?? 0}
        </h2>
        <DataTable
          className="mt-2"
          rows={data?.items ?? []}
          rowKey={(row) => row.offerId}
          rowHighlighted={(row) => row.urgent}
          scrollable
          minWidth={620}
          empty={
            <EmptyState
              title="Очередь пуста"
              description="Все предложения заводов проверены — SLA соблюдён."
            />
          }
          columns={[
            {
              key: "title",
              header: "Предложение",
              // Строку выбирает клик по её названию: `DataTable` кликабельного `<tr>`
              // не умеет, а кнопка внутри ячейки доступна и с клавиатуры.
              cell: (row) => (
                <button
                  type="button"
                  className="text-left underline-offset-2 hover:underline"
                  aria-pressed={row.offerId === card?.offerId}
                  onClick={() => {
                    onSelect(String(row.offerId));
                  }}
                >
                  <b>{row.title}</b>
                </button>
              ),
            },
            { key: "factory", header: "Завод", cell: (row) => row.factoryName },
            {
              key: "kind",
              header: "Тип",
              cell: (row) => <span className="text-muted text-[12.5px]">{row.kindNote}</span>,
            },
            {
              key: "flags",
              header: "Флаги",
              cell: (row) =>
                row.flags.length === 0 ? (
                  <span className="text-muted">—</span>
                ) : (
                  row.flags.map((flag) => (
                    <Tag key={flag} tone="work">
                      {flag}
                    </Tag>
                  ))
                ),
            },
            {
              key: "waiting",
              header: "В очереди",
              cell: (row) => <span className="text-muted text-[12.5px]">{row.waiting}</span>,
            },
          ]}
        />
      </Box>

      <aside>
        <Box>
          {card === null ? (
            <EmptyState title="Нечего проверять" description="Выберите заявку из очереди." />
          ) : (
            <>
              <h3 className="font-heading text-base font-bold">
                {card.title} ·{" "}
                {card.fromVersion === null
                  ? "новое"
                  : `v${String(card.fromVersion)} → v${String(card.toVersion)}`}
              </h3>
              <div className="text-muted text-[12.5px]">
                {card.factoryName}, {card.factoryCity}
              </div>

              <h4 className="mt-3 text-[13px] font-bold">Что изменилось</h4>
              {card.changes.length === 0 ? (
                <p className="text-muted mt-1 text-[13px]">Первая версия предложения.</p>
              ) : (
                <table className="mt-1.5 w-full border-collapse text-[13px]">
                  <tbody>
                    {card.changes.map((change) => (
                      <tr key={change.field} className="border-border border-b last:border-0">
                        <td className="text-muted py-1.5 pe-2 align-top">{change.label}</td>
                        <td className="py-1.5">
                          {change.before === null ? null : (
                            <del className="text-muted">{change.before}</del>
                          )}{" "}
                          <ins className="text-success no-underline">{change.after ?? "—"}</ins>
                          {change.flag ? (
                            <Tag tone="work" className="ms-1">
                              {change.flag}
                            </Tag>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {card.images.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {card.images.map((image) => (
                    <Placeholder
                      key={image.id}
                      tone={image.tone}
                      radius="control"
                      square
                      label={image.flag ?? image.label}
                    />
                  ))}
                </div>
              ) : null}

              <Field label="Комментарий заводу" wide className="mt-3">
                <Textarea
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={card.suggestedComment ?? "Обязателен при возврате на доработку"}
                />
              </Field>

              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="cta"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ offerId: card.offerId, decision: "approve" })}
                >
                  Опубликовать
                </Button>
                <Button
                  variant="ghost"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ offerId: card.offerId, decision: "reject" })}
                >
                  Вернуть на доработку
                </Button>
              </div>
              {decide.error ? (
                <p className="text-danger mt-2 text-[13px]">
                  {isApiError(decide.error) ? decide.error.message : "Решение не прошло"}
                </p>
              ) : null}
            </>
          )}
        </Box>
      </aside>
    </div>
  );
}

function FactoriesQueue({
  selected,
  onSelect,
}: {
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"queue" | "active" | "suspended">("queue");
  const { data, isPending } = useQuery(
    adminFactoryListOptions({ tab, ...(selected === undefined ? {} : { selected }) }),
  );
  const [comment, setComment] = useState("");
  const [auditor, setAuditor] = useState("");
  const [visitAt, setVisitAt] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all });

  const decide = useMutation({
    mutationFn: (input: { orgId: string; decision: "approve" | "reject" | "suspend" }) =>
      getApiService().decideAdminFactory(input.orgId, {
        decision: input.decision,
        comment: comment.trim(),
      }),
    onSuccess: invalidate,
  });
  const schedule = useMutation({
    mutationFn: (orgId: string) =>
      getApiService().scheduleAuditVisit(orgId, { auditorName: auditor, visitAt }),
    onSuccess: invalidate,
  });

  if (isPending) return <Skeleton className="h-64" />;
  const card = data?.selected ?? null;

  return (
    <>
      <TabBar label="Состояния заводов" className="mb-3">
        <TabBarItem asChild active={tab === "queue"} count={data?.counts.queue || undefined}>
          <button type="button" onClick={() => setTab("queue")}>
            Очередь
          </button>
        </TabBarItem>
        <TabBarItem asChild active={tab === "active"} count={data?.counts.active || undefined}>
          <button type="button" onClick={() => setTab("active")}>
            Активные
          </button>
        </TabBarItem>
        <TabBarItem
          asChild
          active={tab === "suspended"}
          count={data?.counts.suspended || undefined}
        >
          <button type="button" onClick={() => setTab("suspended")}>
            Приостановленные
          </button>
        </TabBarItem>
      </TabBar>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Box>
          <DataTable
            rows={data?.items ?? []}
            rowKey={(row) => row.orgId}
            rowHighlighted={(row) => row.urgent}
            scrollable
            minWidth={620}
            empty={<EmptyState title="Пусто" description="В этой вкладке заводов нет." />}
            columns={[
              {
                key: "name",
                header: "Завод",
                cell: (row) => (
                  <button
                    type="button"
                    className="text-left"
                    aria-pressed={row.orgId === card?.orgId}
                    onClick={() => {
                      onSelect(row.orgId);
                    }}
                  >
                    <b className="underline-offset-2 hover:underline">{row.name}</b>
                    <div className="text-muted text-[12.5px]">
                      {row.city} · ИНН {row.inn}
                    </div>
                  </button>
                ),
              },
              {
                key: "stage",
                header: "Этап",
                cell: (row) => (
                  <Tag tone={FACTORY_STAGE_TONE[row.stage] ?? "done"}>
                    {FACTORY_STAGE_TITLE[row.stage] ?? row.stage}
                  </Tag>
                ),
              },
              {
                key: "next",
                header: "Что дальше",
                cell: (row) => (
                  <span className="text-muted text-[12.5px]">{row.nextStep ?? "—"}</span>
                ),
              },
              {
                key: "applied",
                header: "Заявка",
                cell: (row) => (
                  <span className="text-muted text-[12.5px]">
                    {row.appliedAt === null ? "—" : (formatIsoDate(row.appliedAt) ?? row.appliedAt)}
                  </span>
                ),
              },
            ]}
          />
        </Box>

        <aside>
          <Box>
            {card === null ? (
              <EmptyState title="Нечего проверять" description="Очередь пуста." />
            ) : (
              <>
                <h3 className="font-heading text-base font-bold">{card.name}</h3>
                <div className="text-muted text-[12.5px]">
                  ИНН {card.inn} · {card.city}
                  {card.appliedAt === null
                    ? ""
                    : ` · заявка ${formatIsoDate(card.appliedAt) ?? card.appliedAt}`}
                </div>

                <h4 className="mt-3 text-[13px] font-bold">Чек-лист аудита</h4>
                <ol className="mt-1.5">
                  {card.checks.map((check) => (
                    <li
                      key={check.key}
                      className="border-border relative border-b border-dashed py-[7px] ps-7 text-[13px] last:border-0"
                    >
                      <span
                        aria-hidden="true"
                        className={
                          check.state === "done"
                            ? "border-success bg-success absolute start-0 top-2 size-4 rounded-full border-2"
                            : check.state === "now"
                              ? "border-action ring-action-soft absolute start-0 top-2 size-4 rounded-full border-2 ring-[3px]"
                              : "border-border-strong absolute start-0 top-2 size-4 rounded-full border-2"
                        }
                      />
                      {check.title}
                    </li>
                  ))}
                </ol>

                <div className="mt-3 grid gap-2.5">
                  <Field label="Аудитор">
                    <Select
                      value={auditor || (card.auditorName ?? "")}
                      onValueChange={setAuditor}
                      aria-label="Аудитор"
                    >
                      {card.auditors.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Дата выезда">
                    <Input
                      type="date"
                      value={visitAt || (card.visitAt ?? "")}
                      onChange={(event) => setVisitAt(event.target.value)}
                    />
                  </Field>
                  <Button
                    variant="cta"
                    disabled={schedule.isPending}
                    onClick={() => schedule.mutate(card.orgId)}
                  >
                    Назначить выезд
                  </Button>
                </div>

                <Field label="Обоснование решения" wide className="mt-3">
                  <Textarea
                    rows={2}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Увидит завод и аудит-лог"
                  />
                </Field>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ orgId: card.orgId, decision: "approve" })}
                  >
                    Подключить завод
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ orgId: card.orgId, decision: "reject" })}
                  >
                    Отклонить заявку…
                  </Button>
                </div>
                {decide.error || schedule.error ? (
                  <Alert kind="danger" className="mt-2" title="Решение не прошло">
                    {(decide.error ?? schedule.error)?.message}
                  </Alert>
                ) : null}
              </>
            )}
          </Box>
        </aside>
      </div>
    </>
  );
}
