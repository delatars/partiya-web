import type { DocumentState, DocumentSummary } from "@partiya/api-contracts";
import { Alert, Box, Button, Chip, DataTable, EmptyState, Input, Skeleton, Tag } from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  documentListOptions,
  DOCUMENT_KEYS,
  edoConnectionOptions,
  getApiService,
  isApiError,
} from "@/shared/api";
import { formatIsoDate } from "@/shared/lib/dates";
import { AppLink } from "@/shared/ui";

/* Макет: экран `documents` — «Документы и ЭДО».
 *
 * Документы формируются из заказа сами: создать документ снаружи нельзя, можно только
 * подписать. Поэтому единственное действие таблицы — «Подписать по ЭДО», и оно доступно
 * ровно в состоянии `awaiting_customer`. */

const STATE_TITLES: Record<DocumentState, string> = {
  generating: "Формируется",
  awaiting_customer: "Ждёт вашей подписи",
  awaiting_factory: "Ждёт подписи фабрики",
  signed: "Подписан обеими сторонами",
  awaiting_payment: "Ожидает оплаты",
  paid: "Оплачен",
  cancelled: "Отозван",
};

const STATE_TONES: Record<DocumentState, "ok" | "new" | "work" | "done"> = {
  generating: "done",
  awaiting_customer: "work",
  awaiting_factory: "new",
  signed: "ok",
  awaiting_payment: "work",
  paid: "ok",
  cancelled: "done",
};

const KIND_TITLES: Record<string, string> = {
  offer_contract: "Оферта",
  specification: "Спецификация",
  invoice: "Счёт",
  act: "УПД и акты",
  upd: "УПД",
};

type Filter = "all" | "awaiting" | "offer_contract" | "specification" | "invoice" | "act";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "awaiting", label: "Ждут подписи" },
  { key: "offer_contract", label: "Оферты" },
  { key: "specification", label: "Спецификации" },
  { key: "invoice", label: "Счета" },
  { key: "act", label: "УПД и акты" },
];

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  const query = useQuery(documentListOptions());
  const edo = useQuery(edoConnectionOptions());

  const sign = useMutation({
    mutationFn: (documentId: string) => getApiService().signDocument(documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DOCUMENT_KEYS.all });
      setError(undefined);
    },
    onError: (cause) => {
      setError(isApiError(cause) ? cause.message : "Подписать не вышло");
    },
  });

  const all = query.data?.items ?? [];
  const needle = search.trim().toLowerCase();
  const rows = all.filter((item) => {
    if (filter === "awaiting" && item.state !== "awaiting_customer") return false;
    if (filter !== "all" && filter !== "awaiting" && item.kind !== filter) return false;
    if (needle.length === 0) return true;
    return (
      item.title.toLowerCase().includes(needle) ||
      item.number.toLowerCase().includes(needle) ||
      String(item.orderId).includes(needle)
    );
  });
  const awaiting = query.data?.awaitingSignature ?? 0;

  return (
    <>
      <header className="mt-1 mb-3.5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Документы и ЭДО</h1>
          <p className="text-muted mt-1 max-w-[80ch]">
            Все документы формируются автоматически из заказа. Подписание — через оператора ЭДО.
          </p>
        </div>
      </header>

      {error !== undefined && (
        <Alert kind="danger" className="mb-3" title="Документ не подписан">
          {error}
        </Alert>
      )}

      {awaiting > 0 && (
        <Alert
          kind="warn"
          className="mb-3"
          title={`${String(awaiting)} документ ждёт вашей подписи`}
          action={
            <Button
              size="sm"
              variant="cta"
              onClick={() => {
                setFilter("awaiting");
              }}
            >
              Показать
            </Button>
          }
        >
          Без подписи фабрика не получит выплату.
        </Alert>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((item) => (
          <Chip
            key={item.key}
            on={filter === item.key}
            onClick={() => {
              setFilter(item.key);
            }}
          >
            {item.label}
            {item.key === "awaiting" && awaiting > 0 && (
              <span className="num text-muted">{awaiting}</span>
            )}
          </Chip>
        ))}
        <Input
          className="ml-auto w-60"
          placeholder="Номер заказа или документа"
          aria-label="Поиск по документам"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
      </div>

      <Box>
        {query.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : all.length === 0 ? (
          <EmptyState
            title="Документов пока нет"
            description="Оферта, спецификация и счёт формируются при оформлении первой партии."
            action={
              <Button asChild variant="cta">
                <AppLink to="/catalog">Собрать партию</AppLink>
              </Button>
            }
          />
        ) : (
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            minWidth={760}
            empty={<EmptyState title="Документов с таким фильтром нет" />}
            columns={[
              {
                key: "title",
                header: "Документ",
                cell: (row: DocumentSummary) => <span className="font-medium">{row.title}</span>,
              },
              {
                key: "order",
                header: "Заказ",
                cell: (row) => (
                  <AppLink
                    to={`/account/orders/${String(row.orderId)}`}
                    className="text-action hover:underline"
                  >
                    № {row.orderId}
                  </AppLink>
                ),
              },
              {
                key: "kind",
                header: "Тип",
                cell: (row) => (
                  <span className="text-muted text-[12.5px]">
                    {KIND_TITLES[row.kind] ?? row.kind}
                  </span>
                ),
              },
              {
                key: "state",
                header: "Статус",
                cell: (row) => <Tag tone={STATE_TONES[row.state]}>{STATE_TITLES[row.state]}</Tag>,
              },
              {
                key: "date",
                header: "Дата",
                cell: (row) => (
                  <span className="text-muted text-[12.5px]">
                    {formatIsoDate(row.createdAt.slice(0, 10))}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "",
                align: "right",
                cell: (row) => (
                  <span className="flex justify-end gap-1.5">
                    {row.state === "awaiting_customer" && (
                      <Button
                        size="sm"
                        variant="cta"
                        disabled={sign.isPending}
                        onClick={() => {
                          sign.mutate(row.id);
                        }}
                      >
                        Подписать
                      </Button>
                    )}
                    <Button asChild size="sm">
                      <a href={row.url ?? "#"} download>
                        PDF
                      </a>
                    </Button>
                  </span>
                ),
              },
            ]}
          />
        )}
      </Box>

      {edo.data && (
        <Box className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-heading text-base font-bold">Подключение ЭДО</h3>
              <div className="text-muted text-[12.5px]">
                {edo.data.connected
                  ? `Оператор: ${edo.data.operator ?? "подключён"} · идентификатор ${edo.data.participantId ?? "—"}`
                  : "Оператор не подключён — документы можно только скачивать"}
              </div>
            </div>
            <Tag tone={edo.data.connected ? "ok" : "done"}>
              {edo.data.connected ? "Активно" : "Не подключено"}
            </Tag>
          </div>
        </Box>
      )}
    </>
  );
}
