import { useQuery } from "@tanstack/react-query";
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
  TabBar,
  TabBarItem,
  Tag,
} from "@partiya/ui";

import { authSessionsOptions, isApiError } from "@/shared/api";
import {
  can,
  PERMISSION_TABLE_ROLES,
  PERMISSION_TABLE_ROWS,
  PERMISSION_TITLES,
  ROLE_TITLES,
} from "@/shared/lib/roles";
import { useRevokeAuthSession, useSession } from "@/shared/lib/session";

import { RequisitesForm } from "../components/RequisitesForm";

/* Макет: экран account.company — реквизиты, сотрудники, таблица «Что может каждая роль».
   Реквизиты (ОГРН, адрес, банк — п. 24) редактируются формой `RequisitesForm` у владельца
   и бухгалтера; остальным ролям форма не показывается (бэк ответил бы 403).
   Вкладка «Безопасность» в макете не нарисована, но `GET /me/sessions` и отзыв сеанса на
   бэке есть и без интерфейса бесполезны — она здесь (см. отчёт, Q-A3). */

export type CompanyTab = "details" | "team" | "addresses" | "security";

const TABS: { key: CompanyTab; label: string }[] = [
  { key: "details", label: "Реквизиты" },
  { key: "team", label: "Сотрудники" },
  { key: "addresses", label: "Адреса доставки" },
  { key: "security", label: "Безопасность" },
];

const KIND_TITLE = { customer: "Заказчик", factory: "Завод" } as const;

const VERIFICATION: Record<string, { label: string; tone: "ok" | "new" | "work" }> = {
  verified: { label: "Проверена по ЕГРЮЛ", tone: "ok" },
  pending: { label: "На проверке", tone: "new" },
  rejected: { label: "Проверка не пройдена", tone: "work" },
};

export interface CompanyPageProps {
  tab: CompanyTab;
  onTabChange: (tab: CompanyTab) => void;
}

export function CompanyPage({ tab, onTabChange }: CompanyPageProps) {
  const session = useSession();
  const org = session.activeOrg;

  if (session.isPending) return <Skeleton className="h-64 w-full" />;
  if (!org) {
    return (
      <Box>
        <EmptyState
          title="Компании ещё нет"
          description="Зарегистрируйте юрлицо или ИП — на него выставляются счета и оформляется эскроу."
        />
      </Box>
    );
  }

  const status = VERIFICATION[org.verificationStatus] ?? VERIFICATION.pending!;

  return (
    <>
      <PageHeader
        title="Компания"
        subtitle={
          <>
            {org.name} · {KIND_TITLE[org.kind]} · ваша роль — {org.roleTitle.toLowerCase()}
          </>
        }
        actions={<Tag tone={status.tone}>{status.label}</Tag>}
      />

      <TabBar label="Разделы компании" className="mb-3">
        {TABS.map((item) => (
          <TabBarItem key={item.key} asChild active={item.key === tab}>
            <button
              type="button"
              onClick={() => {
                onTabChange(item.key);
              }}
            >
              {item.label}
            </button>
          </TabBarItem>
        ))}
      </TabBar>

      {tab === "details" && <DetailsTab org={org} />}
      {tab === "team" && <TeamTab />}
      {tab === "addresses" && <AddressesTab />}
      {tab === "security" && <SecurityTab />}
    </>
  );
}

function DetailsTab({ org }: { org: NonNullable<ReturnType<typeof useSession>["activeOrg"]> }) {
  return (
    /* `min-w-0` на колонках обязателен: у элемента grid минимальная ширина по умолчанию
       равна min-content, а у `<input>` она своя (атрибут size) — без этого правая
       колонка растягивала страницу и на 390 px появлялась горизонтальная прокрутка. */
    <div className="grid items-start gap-3 lg:grid-cols-2 [&>*]:min-w-0">
      <Box>
        <h2 className="font-heading text-lg font-bold">Реквизиты</h2>
        <div className="mt-2.5 grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
          <Field label="Наименование" wide>
            <Input readOnly value={org.name} />
          </Field>
          <Field label="ИНН">
            <Input readOnly numeric value={org.inn} />
          </Field>
          <Field label="Вид на платформе">
            <Input readOnly value={KIND_TITLE[org.kind]} />
          </Field>
          <Field label="Зарегистрирована">
            <Input readOnly value={new Date(org.createdAt).toLocaleDateString("ru-RU")} />
          </Field>
        </div>
        {can(org.role, "manage_requisites") ? (
          <RequisitesForm orgId={org.id} inn={org.inn} />
        ) : (
          <Alert kind="info" className="mt-3.5" title="Банковские реквизиты скрыты">
            ОГРН, юридический адрес и расчётный счёт видят и меняют только владелец и бухгалтер
            компании. КПП: {org.kpp ?? "—"}.
          </Alert>
        )}
      </Box>

      <Box>
        <h3 className="font-heading text-base font-bold">Что может каждая роль</h3>
        {/* Пять колонок ролей по 5rem не влезают в 390 px и тянули горизонтальную
            прокрутку всей страницы. Прокручиваем саму таблицу, а не документ. */}
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="mt-2 w-full min-w-[26rem] border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className="border-border border-b px-2.5 py-2 text-left" />
                {PERMISSION_TABLE_ROLES.map((role) => (
                  <th
                    key={role}
                    scope="col"
                    className="text-muted border-border w-20 border-b px-2.5 py-2 text-center text-[11.5px] font-medium tracking-[0.03em] uppercase"
                  >
                    {ROLE_TITLES[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_TABLE_ROWS.map((permission) => (
                <tr key={permission}>
                  <th
                    scope="row"
                    className="border-border border-b px-2.5 py-[11px] text-left font-normal"
                  >
                    {PERMISSION_TITLES[permission]}
                  </th>
                  {PERMISSION_TABLE_ROLES.map((role) => (
                    <td
                      key={role}
                      className="border-border border-b px-2.5 py-[11px] text-center"
                      aria-label={can(role, permission) ? "может" : "не может"}
                    >
                      {can(role, permission) ? (
                        <span className="text-success font-bold">✓</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>
    </div>
  );
}

function TeamTab() {
  const session = useSession();
  const user = session.me?.user;

  return (
    <Box>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-bold">Сотрудники</h2>
        <Button size="sm" disabled title="Эндпоинта приглашений у бэка пока нет">
          + Пригласить
        </Button>
      </div>

      <DataTable
        rows={user ? [user] : []}
        rowKey={(row) => row.id}
        minWidth={420}
        empty={<EmptyState title="Список сотрудников недоступен" />}
        columns={[
          {
            key: "who",
            header: "Сотрудник",
            cell: (row) => (
              <>
                <span className="block font-medium">{row.name ?? "Вы"}</span>
                <span className="text-muted block text-[12.5px]">
                  {row.email ?? row.phone ?? "—"}
                </span>
              </>
            ),
          },
          {
            key: "role",
            header: "Роль",
            cell: () => (session.role === null ? "—" : ROLE_TITLES[session.role]),
          },
          { key: "status", header: "Статус", cell: () => <Tag tone="ok">активен</Tag> },
        ]}
      />

      <Alert kind="info" className="mt-3" title="Приглашения в разработке">
        Модель ролей и проверки прав на бэке готовы, а эндпоинтов «пригласить сотрудника» и «сменить
        роль» ещё нет — поэтому в списке пока только вы.
      </Alert>
    </Box>
  );
}

function AddressesTab() {
  return (
    <Box>
      <EmptyState
        title="Адреса доставки появятся вместе с заказами"
        description="Адрес склада маркетплейса или свой — сохраняется при первом оформлении и потом подставляется сам. Отдельного справочника на бэке пока нет."
      />
    </Box>
  );
}

function SecurityTab() {
  const sessions = useQuery(authSessionsOptions());
  const revoke = useRevokeAuthSession();

  if (sessions.isPending) return <Skeleton className="h-40 w-full" />;

  if (sessions.isError) {
    const status = isApiError(sessions.error) ? sessions.error.status : undefined;
    return (
      <Box>
        <Alert kind="danger" title="Не получилось загрузить сеансы">
          {status === 503 ? "Модуль входа временно недоступен." : sessions.error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <h2 className="font-heading text-lg font-bold">Активные сеансы</h2>
      <p className="text-muted mt-1 mb-2.5">
        Вход хранится в защищённой куке. Если вы заходили с чужого устройства — завершите сеанс
        здесь, он перестанет работать сразу.
      </p>

      <DataTable
        rows={sessions.data.items}
        rowKey={(row) => row.id}
        minWidth={560}
        empty={<EmptyState title="Активных сеансов нет" />}
        columns={[
          {
            key: "device",
            header: "Устройство",
            cell: (row) => (
              <>
                <span className="block font-medium">
                  {shortUserAgent(row.userAgent)}
                  {row.current ? (
                    <Tag tone="ok" className="ms-2">
                      этот сеанс
                    </Tag>
                  ) : null}
                </span>
                <span className="text-muted block text-[12.5px]">{row.ip ?? "IP неизвестен"}</span>
              </>
            ),
          },
          { key: "seen", header: "Последняя активность", cell: (row) => dateTime(row.lastSeenAt) },
          { key: "created", header: "Вход", cell: (row) => dateTime(row.createdAt) },
          {
            key: "action",
            header: "",
            align: "right",
            cell: (row) =>
              row.current ? null : (
                <Button
                  size="sm"
                  disabled={revoke.isPending}
                  onClick={() => {
                    revoke.mutate(row.id);
                  }}
                >
                  Завершить
                </Button>
              ),
          },
        ]}
      />
    </Box>
  );
}

function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

/** Из User-Agent берём только то, что человек узнает: браузер и систему. */
function shortUserAgent(value: string | null): string {
  if (value === null || value.length === 0) return "Неизвестное устройство";
  const browser = /(Firefox|Edg|Chrome|Safari)\/[\d.]+/u.exec(value)?.[1];
  const platform = /\((?<platform>[^);]+)/u.exec(value)?.groups?.platform;
  const names: Record<string, string> = { Edg: "Edge" };
  const label = browser === undefined ? "Браузер" : (names[browser] ?? browser);
  return platform === undefined ? label : `${label} · ${platform}`;
}
