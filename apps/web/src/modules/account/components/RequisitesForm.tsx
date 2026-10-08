import type { OrgRequisites, UpdateOrgRequisitesBody } from "@partiya/api-contracts";
import { Alert, Button, Field, Input, Skeleton } from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AUTH_KEYS, getApiService, isApiError, orgRequisitesOptions } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/dates";
import { isSoleTraderInn, validateRequisites } from "@/shared/lib/requisites";

/* Реквизиты организации (DECISIONS.md, п. 24; Q-360): ОГРН/ОГРНИП, КПП, юридический
   адрес и банковский счёт. Видят и правят только владелец и бухгалтер — экран показывает
   форму по таблице прав, а решает бэк (403 остальным).

   PUT — реквизиты целиком: пустое поле стирается. Ошибки 422 `orgs/requisites-invalid`
   приходят по полям (`ogrn`, `kpp`, `legalAddress`, `bank.*`) и раскладываются под поля;
   та же проверка (`shared/lib/requisites.ts`) срабатывает до отправки. Адрес отсюда заказ
   берёт снимком при выборе плательщика. */

interface FormState {
  ogrn: string;
  kpp: string;
  legalAddress: string;
  bankName: string;
  bik: string;
  account: string;
  correspondentAccount: string;
}

function formOf(requisites: OrgRequisites): FormState {
  return {
    ogrn: requisites.ogrn ?? "",
    kpp: requisites.kpp ?? "",
    legalAddress: requisites.legalAddress ?? "",
    bankName: requisites.bank?.bankName ?? "",
    bik: requisites.bank?.bik ?? "",
    account: requisites.bank?.account ?? "",
    correspondentAccount: requisites.bank?.correspondentAccount ?? "",
  };
}

const orNull = (value: string): string | null => (value.trim().length > 0 ? value.trim() : null);

function bodyOf(form: FormState, sole: boolean): UpdateOrgRequisitesBody {
  return {
    ogrn: orNull(form.ogrn),
    // у ИП КПП нет — поле не показывается и не отправляется
    kpp: sole ? null : orNull(form.kpp),
    legalAddress: orNull(form.legalAddress),
    bank: {
      bankName: orNull(form.bankName),
      bik: orNull(form.bik),
      account: orNull(form.account),
      correspondentAccount: orNull(form.correspondentAccount),
    },
  };
}

export function RequisitesForm({ orgId, inn }: { orgId: string; inn: string }) {
  const queryClient = useQueryClient();
  const query = useQuery(orgRequisitesOptions(orgId));
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);
  const sole = isSoleTraderInn(inn);

  useEffect(() => {
    if (query.data) setForm(formOf(query.data));
  }, [query.data]);

  const save = useMutation({
    mutationFn: (body: UpdateOrgRequisitesBody) => getApiService().updateOrgRequisites(orgId, body),
    onSuccess: (next) => {
      queryClient.setQueryData(AUTH_KEYS.requisites(orgId), next);
      setErrors({});
      setSaved(true);
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 422 && error.fieldErrors) {
        setErrors(error.fieldErrors);
      }
    },
  });

  if (query.isPending) return <Skeleton className="mt-3.5 h-40 w-full" />;
  if (query.isError) {
    const forbidden = isApiError(query.error) && query.error.status === 403;
    return (
      <Alert kind={forbidden ? "info" : "danger"} className="mt-3.5" title="Реквизиты недоступны">
        {forbidden
          ? "Реквизиты видят и меняют только владелец и бухгалтер компании."
          : query.error.message}
      </Alert>
    );
  }
  if (form === null) return null;

  const set = (key: keyof FormState) => (event: { target: { value: string } }) => {
    setSaved(false);
    setForm((current) => (current === null ? current : { ...current, [key]: event.target.value }));
  };
  const errorOf = (field: string) => errors[field]?.[0];

  return (
    <form
      className="mt-3.5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const body = bodyOf(form, sole);
        const local = validateRequisites(inn, body);
        setErrors(local);
        if (Object.keys(local).length > 0) return;
        save.mutate(body);
      }}
    >
      <h3 className="font-heading text-base font-bold">Регистрация и банк</h3>
      <div className="mt-2.5 grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
        <Field label={sole ? "ОГРНИП" : "ОГРН"} error={errorOf("ogrn")}>
          <Input
            numeric
            inputMode="numeric"
            maxLength={sole ? 15 : 13}
            value={form.ogrn}
            onChange={set("ogrn")}
          />
        </Field>
        {sole ? null : (
          <Field label="КПП" error={errorOf("kpp")}>
            <Input
              numeric
              inputMode="numeric"
              maxLength={9}
              value={form.kpp}
              onChange={set("kpp")}
            />
          </Field>
        )}
        <Field label="Юридический адрес" wide error={errorOf("legalAddress")}>
          <Input
            maxLength={500}
            placeholder="125047, Москва, ул. Лесная, д. 9, офис 412"
            value={form.legalAddress}
            onChange={set("legalAddress")}
          />
        </Field>
        <Field label="Банк" wide error={errorOf("bank.bankName")}>
          <Input maxLength={200} value={form.bankName} onChange={set("bankName")} />
        </Field>
        <Field label="БИК" error={errorOf("bank.bik")}>
          <Input numeric inputMode="numeric" maxLength={9} value={form.bik} onChange={set("bik")} />
        </Field>
        <Field label="Расчётный счёт" error={errorOf("bank.account")}>
          <Input
            numeric
            inputMode="numeric"
            maxLength={20}
            value={form.account}
            onChange={set("account")}
          />
        </Field>
        <Field
          label="Корр. счёт"
          hint="Нет только у подразделений Банка России"
          error={errorOf("bank.correspondentAccount")}
        >
          <Input
            numeric
            inputMode="numeric"
            maxLength={20}
            value={form.correspondentAccount}
            onChange={set("correspondentAccount")}
          />
        </Field>
      </div>

      {save.isError && !(isApiError(save.error) && save.error.status === 422) ? (
        <Alert kind="danger" className="mt-3" title="Не сохранилось">
          {save.error.message}
        </Alert>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted text-[12.5px]" role="status">
          {saved
            ? "Сохранено"
            : query.data.updatedAt === null
              ? "Реквизиты ещё не заполняли"
              : `Изменены ${formatDateTime(query.data.updatedAt)}`}
        </span>
        <Button type="submit" variant="cta" disabled={save.isPending}>
          {save.isPending ? "Сохраняем…" : "Сохранить реквизиты"}
        </Button>
      </div>
    </form>
  );
}
