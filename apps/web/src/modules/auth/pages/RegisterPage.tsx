import { zodResolver } from "@hookform/resolvers/zod";
import type { Organization } from "@partiya/api-contracts";
import { getConfig } from "@partiya/shared";
import { Alert, Button, Checkbox, Field, Input } from "@partiya/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { AUTH_KEYS, getApiService } from "@/shared/api";
import { ensureSession, putSession, useSession } from "@/shared/lib/session";
import { AppLink, useAppNavigate } from "@/shared/ui";

import { HSteps, type StepItem } from "../components/HSteps";
import { LoginFlow } from "../components/LoginFlow";
import { PickCards } from "../components/PickCards";
import { toFormErrors } from "../lib/api-errors";
import {
  INN_PLACEHOLDER,
  KPP_PLACEHOLDER,
  organizationSchema,
  type OrganizationForm,
} from "../lib/schemas";

/* Макет: экран register. Шага два, а не один: `POST /orgs` требует вошедшего пользователя,
   поэтому «1 Контакт» из ленты шагов — это тот же вход по коду, только внутри регистрации.
   Отдельного экрана регистрации человека в продукте нет по замыслу (README бэка). */

const KIND_OPTIONS = [
  { value: "customer" as const, title: "Заказывать производство", hint: "бренд, селлер, ритейл" },
  { value: "factory" as const, title: "Принимать заказы", hint: "завод, цех, фабрика" },
];

export function RegisterPage() {
  const session = useSession();
  const queryClient = useQueryClient();

  if (session.isPending) return <p className="text-muted">Проверяем сессию…</p>;

  if (!session.isAuthenticated) {
    return (
      <>
        <h1 className="font-heading text-2xl leading-tight font-bold">Регистрация компании</h1>
        <p className="text-muted mt-1.5">
          Начнём с контакта: пришлём код на телефон или рабочую почту. Пароль не нужен.
        </p>
        <HSteps className="my-4" steps={stepsFor("contact")} />
        <LoginFlow
          demo={getConfig().useMocks}
          title={null}
          description={null}
          onAuthenticated={(me) => {
            putSession(queryClient, me);
          }}
          footer={
            <p className="text-muted mt-3.5 text-center text-[12.5px]">
              Уже есть аккаунт?{" "}
              <AppLink to="/login" className="text-action hover:underline">
                Войти
              </AppLink>
            </p>
          }
        />
      </>
    );
  }

  return <CompanyStep />;
}

function stepsFor(stage: "contact" | "company", kindChosen = false): StepItem[] {
  return [
    { label: "Контакт", state: stage === "contact" ? "current" : "done" },
    { label: "Компания", state: stage === "company" ? "current" : "todo" },
    { label: "Роль", state: kindChosen ? "done" : "todo" },
  ];
}

function CompanyStep() {
  const navigate = useAppNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | undefined>(undefined);

  const form = useForm<OrganizationForm>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { kind: "customer", name: "", inn: "", kpp: "", accepted: false },
  });

  const create = useMutation({
    mutationFn: (values: OrganizationForm) =>
      getApiService().createOrg({
        kind: values.kind,
        name: values.name,
        inn: values.inn,
        kpp: values.kpp.length > 0 ? values.kpp : null,
      }),
    onSuccess: async (org: Organization) => {
      // `/orgs` отдаёт только организацию; активной её делает сессия — перечитываем `/me`
      await queryClient.invalidateQueries({ queryKey: AUTH_KEYS.session() });
      await ensureSession(queryClient);
      navigate({
        // заводу сразу нужен профиль и мощность, иначе его никто не увидит в выдаче
        to: org.kind === "factory" ? "/onboarding/factory" : "/account/orders",
        replace: true,
      });
    },
    onError: (error) => {
      const { fields, message: general } = toFormErrors(error, [
        [/^ИНН/u, "inn" as const],
        [/^КПП/u, "kpp" as const],
        [/название/iu, "name" as const],
        [/^kind/u, "kind" as const],
      ]);
      const [field] = Object.keys(fields) as (keyof OrganizationForm)[];
      if (field !== undefined) {
        form.setError(field, { message: fields[field as "inn"] });
        form.setFocus(field);
      }
      setMessage(general);
    },
  });

  const kind = form.watch("kind");
  const errors = form.formState.errors;

  return (
    <>
      <h1 className="font-heading text-2xl leading-tight font-bold">Регистрация компании</h1>
      <p className="text-muted mt-1.5">
        Заказы, счета и эскроу привязаны к юрлицу или ИП. Сотрудников добавите позже.
      </p>
      <HSteps className="my-4" steps={stepsFor("company", kind !== undefined)} />

      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit((values) => {
            setMessage(undefined);
            create.mutate(values);
          })(event);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ИНН" required error={errors.inn?.message} wide>
            <Input
              {...form.register("inn")}
              numeric
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              placeholder={INN_PLACEHOLDER}
              disabled={create.isPending}
            />
          </Field>

          <Field label="Наименование" required error={errors.name?.message} wide>
            <Input
              {...form.register("name")}
              autoComplete="organization"
              placeholder="ООО «Кора»"
              disabled={create.isPending}
            />
          </Field>

          <Field label="КПП" error={errors.kpp?.message} hint="У ИП его нет — оставьте пустым" wide>
            <Input
              {...form.register("kpp")}
              numeric
              inputMode="numeric"
              autoComplete="off"
              maxLength={9}
              placeholder={KPP_PLACEHOLDER}
              disabled={create.isPending}
            />
          </Field>
        </div>

        <Alert kind="info" className="mt-1" title="Проверим по ЕГРЮЛ после регистрации">
          Автоматической подтяжки реквизитов пока нет — введите их руками. Компания заводится со
          статусом «на проверке»; заказы это не блокирует.
        </Alert>

        <h2 className="font-heading mt-4 text-base font-bold">Что будете делать на платформе</h2>
        <Controller
          control={form.control}
          name="kind"
          render={({ field }) => (
            <PickCards
              className="mt-2"
              label="Что будете делать на платформе"
              value={field.value}
              onChange={field.onChange}
              options={KIND_OPTIONS}
            />
          )}
        />
        {errors.kind?.message !== undefined && (
          <p className="text-danger mt-1 text-xs">{errors.kind.message}</p>
        )}

        <Controller
          control={form.control}
          name="accepted"
          render={({ field }) => (
            <Checkbox
              rowClassName="mt-3"
              checked={field.value}
              onCheckedChange={(checked) => {
                field.onChange(checked === true);
              }}
              onBlur={field.onBlur}
              label="Принимаю оферту платформы и политику обработки данных"
            />
          )}
        />
        {errors.accepted?.message !== undefined && (
          <p className="text-danger mt-1 text-xs">{errors.accepted.message}</p>
        )}

        {message !== undefined && (
          <Alert kind="danger" className="mt-3" title="Компания не создана">
            {message}
          </Alert>
        )}

        <Button
          type="submit"
          variant="cta"
          size="lg"
          wide
          className="mt-3.5"
          disabled={create.isPending}
        >
          {create.isPending ? "Создаём…" : "Создать компанию"}
        </Button>
        <p className="text-muted mt-3 text-center text-[12.5px]">
          Реквизиты для оплаты добавите при первом заказе
        </p>
      </form>
    </>
  );
}
