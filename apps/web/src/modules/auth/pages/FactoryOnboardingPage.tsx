import type { SaveFactoryOnboardingBody } from "@partiya/api-contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, Field, Input, PageHeader, ProgressBar } from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { factoryOnboardingOptions, getApiService, SELLER_KEYS } from "@/shared/api";
import { formatNumber } from "@/shared/lib/format";
import { useSession } from "@/shared/lib/session";
import { AppLink, useAppNavigate } from "@/shared/ui";

import { HSteps, type StepItem } from "../components/HSteps";
import { capacitySchema, parseUnits, type CapacityForm } from "../lib/schemas";

/* Макет: экран onboarding-factory — «Шаг 3 из 5 · Мощность».
   Платформа продаёт только свободный остаток, поэтому план мощности — не анкета, а то,
   чем ограничен приём заказов: отсюда и пересчёт «что увидят заказчики» прямо на вводе. */

const STEPS: StepItem[] = [
  { label: "Компания", hint: "ИНН, реквизиты", state: "done" },
  { label: "Производство", hint: "профиль и фото", state: "done" },
  { label: "Мощность", hint: "план на месяц", state: "current" },
  { label: "Первое предложение", hint: "SKU с ценой", state: "todo" },
  { label: "Аудит", hint: "заявка на проверку", state: "todo" },
];

/** Коэффициенты из макета: во сколько «эквивалентов футболки» обходится изделие. */
const PRODUCTS = [
  { key: "tshirt", label: "Футболка", coefficient: "1,0" },
  { key: "polo", label: "Поло", coefficient: "1,4" },
  { key: "hoodie", label: "Худи / свитшот", coefficient: "2,4" },
  { key: "shopper", label: "Шопер", coefficient: "0,6" },
];

function parseCoefficient(raw: string): number | undefined {
  const value = Number(raw.replace(",", ".").trim());
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Сколько таких изделий влезет в свободный остаток. Округляем вниз до сотни, как в макете. */
function maxPerMonth(freeUnits: number, coefficient: number | undefined): number | undefined {
  if (coefficient === undefined || freeUnits <= 0) return undefined;
  return Math.floor(freeUnits / coefficient / 100) * 100;
}

export function FactoryOnboardingPage() {
  const navigate = useAppNavigate();
  const session = useSession();
  const orgId = session.activeOrg?.id ?? null;
  const queryClient = useQueryClient();
  /* Q-111 закрыт: черновик мастера живёт на сервере (`GET/PATCH /seller/onboarding`),
     а не в sessionStorage. Мастер длинный, его бросают и возвращаются через день —
     черновик обязан переживать смену устройства, как и черновик оформления (7.6). */
  const { data: draft } = useQuery(factoryOnboardingOptions(orgId !== null));

  const form = useForm<CapacityForm>({
    resolver: zodResolver(capacitySchema),
    defaultValues: { monthly: "40 000", busy: "12 000" },
  });

  const coefficients = useForm<Record<string, string>>({
    defaultValues: Object.fromEntries(
      PRODUCTS.map((product) => [product.key, product.coefficient]),
    ),
  });

  useEffect(() => {
    if (!draft) return;
    if (draft.capacityPerMonth !== null) form.setValue("monthly", String(draft.capacityPerMonth));
    for (const product of PRODUCTS) {
      const saved = draft.itemCoefficients[product.key];
      if (saved !== undefined) {
        coefficients.setValue(product.key, String(saved).replace(".", ","));
      }
    }
  }, [draft, form, coefficients]);

  const saveDraft = useMutation({
    mutationFn: (body: SaveFactoryOnboardingBody) => getApiService().saveFactoryOnboarding(body),
    onSuccess: (next) => {
      queryClient.setQueryData(SELLER_KEYS.onboarding(), next);
    },
  });

  const monthly = parseUnits(form.watch("monthly")) ?? 0;
  const busy = parseUnits(form.watch("busy")) ?? 0;
  const free = Math.max(0, monthly - busy);
  const freePct = monthly > 0 ? Math.round((free / monthly) * 100) : 0;
  const busyPct = 100 - freePct;

  const submit = form.handleSubmit((values) => {
    const typed = coefficients.getValues();
    saveDraft.mutate(
      {
        step: 4,
        capacityPerMonth: parseUnits(values.monthly) ?? 0,
        itemCoefficients: Object.fromEntries(
          Object.entries(typed).map(([key, value]) => [
            key,
            Number(String(value).replace(",", ".")) || 0,
          ]),
        ),
      },
      { onSettled: () => navigate({ to: "/seller/offers" }) },
    );
  });

  return (
    <>
      <PageHeader title="Подключение завода" subtitle="Шаг 3 из 5 · примерно 4 минуты" />
      <HSteps steps={STEPS} size="lg" className="mb-3.5" />

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_320px]">
        <Box>
          <h2 className="font-heading text-lg font-bold">Сколько вы можете произвести</h2>
          <p className="text-muted mt-1 mb-3.5">
            Платформа продаёт только свободный остаток и не даст принять заказов больше плана.
            Считаем в условных единицах — «эквивалент футболки».
          </p>

          <form
            noValidate
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Мощность в месяц, усл. ед."
                required
                error={form.formState.errors.monthly?.message}
                hint="Сколько базовых изделий отшивает цех за месяц"
              >
                <Input
                  {...form.register("monthly")}
                  numeric
                  inputMode="numeric"
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Уже занято вне платформы"
                error={form.formState.errors.busy?.message}
                hint="Свои клиенты, гос. заказ и т. п."
              >
                <Input {...form.register("busy")} numeric inputMode="numeric" autoComplete="off" />
              </Field>
            </div>

            <h3 className="font-heading mt-4 mb-2 text-base font-bold">Коэффициенты изделий</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="text-muted border-border border-b px-2.5 py-2 text-left text-[11.5px] font-medium tracking-[0.03em] uppercase"
                    >
                      Тип изделия
                    </th>
                    <th
                      scope="col"
                      className="text-muted border-border border-b px-2.5 py-2 text-right text-[11.5px] font-medium tracking-[0.03em] uppercase"
                    >
                      Коэффициент
                    </th>
                    <th
                      scope="col"
                      className="text-muted border-border border-b px-2.5 py-2 text-right text-[11.5px] font-medium tracking-[0.03em] uppercase"
                    >
                      Макс. в месяц
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PRODUCTS.map((product) => {
                    const max = maxPerMonth(
                      free,
                      parseCoefficient(coefficients.watch(product.key) ?? product.coefficient),
                    );
                    return (
                      <tr key={product.key}>
                        <td className="border-border border-b px-2.5 py-[11px] font-medium">
                          {product.label}
                        </td>
                        <td className="border-border border-b px-2.5 py-[11px] text-right">
                          <Input
                            {...coefficients.register(product.key)}
                            size="sm"
                            numeric
                            inputMode="decimal"
                            className="ms-auto w-21 text-right"
                            aria-label={`Коэффициент: ${product.label}`}
                          />
                        </td>
                        <td className="num border-border text-muted border-b px-2.5 py-[11px] text-right">
                          {max === undefined ? "—" : formatNumber(max)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Alert kind="info" className="mt-3.5" title="Это можно уточнить позже">
              Понедельный план и отдельные линии настраиваются в разделе «Мощность» кабинета.
            </Alert>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <Button asChild>
                <AppLink to="/company">‹ Назад</AppLink>
              </Button>
              <Button type="submit" variant="cta" size="lg">
                Дальше: первое предложение
              </Button>
            </div>
          </form>
        </Box>

        <aside className="grid gap-3">
          <Box>
            <h3 className="font-heading text-base font-bold">Что будет видно заказчикам</h3>
            <div className="mt-3">
              <span className="text-muted block text-xs">Свободно в этом месяце</span>
              <b className="price mt-0.5 block text-[22px] leading-tight whitespace-nowrap">
                {freePct} %
              </b>
              <span className="text-muted block text-xs">
                {formatNumber(free)} из {formatNumber(monthly)} усл. ед.
              </span>
            </div>
            <ProgressBar
              className="mt-2"
              label="Занято вне платформы"
              value={busyPct}
              tone="warning"
            />
          </Box>

          <Box>
            <h3 className="font-heading text-base font-bold">После подключения</h3>
            <ul className="mt-2 grid gap-1 text-[13.5px]">
              {[
                "Предложения уходят на модерацию · до 1 раб. дня",
                "Аудит: выезд в цех, 3–5 дней",
                "До аудита вы в выдаче без бейджа",
              ].map((line) => (
                <li key={line} className="relative py-1 ps-5.5">
                  <span aria-hidden="true" className="text-success absolute start-0 font-bold">
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </Box>

          <p className="text-muted text-[12.5px]">
            Черновик мастера сохраняется в этой сессии: эндпоинта для плана мощности у бэка пока
            нет.
          </p>
        </aside>
      </div>
    </>
  );
}
