import type { CategoryAttributeDef } from "@partiya/api-contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  BreadcrumbLink,
  BreadcrumbPage,
  Breadcrumbs,
  Button,
  Chip,
  Field,
  Input,
  PageHeader,
  Placeholder,
  Rating,
  Select,
  SelectItem,
  Skeleton,
  Tag,
  Toggle,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { getApiService, isApiError, SELLER_KEYS, sellerOfferEditorOptions } from "@/shared/api";
import { formatNumber, formatRub } from "@/shared/lib/format";
import { AppLink, useAppNavigate } from "@/shared/ui";

import { OFFER_STATUS_TITLE, OFFER_STATUS_TONE } from "../lib/view";
import {
  offerFormSchema,
  type OfferForm,
  parseAmount,
  toDraftBody,
  toFormValues,
} from "../lib/offer-schema";

/* Макет: экран `seller-offer-edit` — редактор предложения.

   Пять блоков макета: категория и название, фото, характеристики (по схеме категории),
   цена по объёму, опции и сроки. Правая колонка — предпросмотр карточки, готовность и
   правило модерации.

   Валидация ступеней — та же, что у движка котировок (Q-127): строго растущие объёмы,
   невозрастающая цена, первая ступень не выше MOQ. Форма показывает ошибку в той строке,
   где она сделана; сервер всё равно проверит своё. */

export function SellerOfferEditPage({ offerId }: { offerId: number | null }) {
  const queryClient = useQueryClient();
  const navigate = useAppNavigate();
  const { data, isPending, error } = useQuery(sellerOfferEditorOptions(offerId));
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const form = useForm<OfferForm>({
    resolver: zodResolver(offerFormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      categoryPath: "tekstil/futbolki",
      moq: "",
      tiers: [],
      options: [],
      leadDaysMin: "14",
      leadDaysMax: "18",
      leadDaysPer1000: "3",
      sampleAvailable: false,
      samplePrice: "",
      sampleDays: "",
      attributes: {},
    },
  });
  const tiers = useFieldArray({ control: form.control, name: "tiers" });
  const options = useFieldArray({ control: form.control, name: "options" });

  const draftId = data?.draft.id ?? offerId;

  useEffect(() => {
    if (data) form.reset(toFormValues(data.draft));
  }, [data, form]);

  const save = useMutation({
    mutationFn: (values: OfferForm) =>
      getApiService().saveSellerOffer(draftId, toDraftBody(values)),
    onSuccess: async (result) => {
      setServerError(null);
      await queryClient.invalidateQueries({ queryKey: SELLER_KEYS.offers() });
      if (result.draft.id !== null && result.draft.id !== offerId) {
        navigate({ to: `/seller/offers/${String(result.draft.id)}/edit`, replace: true });
      }
    },
    onError: (issue) => {
      setServerError(isApiError(issue) ? issue.message : "Не удалось сохранить");
      if (isApiError(issue)) applyFieldErrors(issue.fieldErrors);
    },
  });

  const submit = useMutation({
    mutationFn: async (values: OfferForm) => {
      const saved = await getApiService().saveSellerOffer(draftId, toDraftBody(values));
      const id = saved.draft.id;
      if (id === null) throw new Error("Предложение не сохранено");
      return getApiService().submitSellerOffer(id);
    },
    onSuccess: async (result) => {
      setServerError(null);
      setSubmitted(result.slaNote);
      await queryClient.invalidateQueries({ queryKey: SELLER_KEYS.offers() });
    },
    onError: (issue) => {
      setServerError(isApiError(issue) ? issue.message : "Не удалось отправить на модерацию");
      if (isApiError(issue)) applyFieldErrors(issue.fieldErrors);
    },
  });

  function applyFieldErrors(fieldErrors: Record<string, string[]> | undefined): void {
    for (const [path, messages] of Object.entries(fieldErrors ?? {})) {
      const message = messages[0];
      if (message === undefined) continue;
      form.setError(path as never, { type: "server", message });
    }
  }

  if (isPending) {
    return (
      <>
        <Skeleton className="h-16" />
        <Skeleton className="mt-3 h-96" />
      </>
    );
  }

  if (error || !data) {
    return (
      <Box className="my-3">
        <Alert kind="danger" title="Предложение не найдено">
          {isApiError(error) ? error.message : "Возможно, оно принадлежит другому заводу."}
        </Alert>
      </Box>
    );
  }

  const values = form.watch();
  const errors = form.formState.errors;
  const tierRows = values.tiers ?? [];
  const status = data.draft.status;
  const moqValue = parseAmount(values.moq ?? "");

  return (
    <>
      <Breadcrumbs className="mb-2">
        <BreadcrumbLink asChild>
          <AppLink to="/seller/offers">Предложения</AppLink>
        </BreadcrumbLink>
        <BreadcrumbPage>{values.title || "Новое предложение"}</BreadcrumbPage>
      </Breadcrumbs>

      <PageHeader
        title={offerId === null ? "Новое предложение" : "Редактирование предложения"}
        subtitle={
          offerId === null
            ? "После сохранения предложение уйдёт на модерацию — до 1 рабочего дня."
            : `арт. ${String(offerId)} · версия ${String(data.draft.version)} · правки создадут новую версию`
        }
        actions={
          <>
            <Tag tone={OFFER_STATUS_TONE[status]}>{OFFER_STATUS_TITLE[status]}</Tag>
            <Button
              disabled={save.isPending}
              onClick={() => {
                void form.handleSubmit((input) => save.mutate(input))();
              }}
            >
              {save.isPending ? "Сохраняем…" : "Сохранить черновик"}
            </Button>
            <Button
              variant="cta"
              disabled={submit.isPending}
              onClick={() => {
                void form.handleSubmit((input) => submit.mutate(input))();
              }}
            >
              {submit.isPending ? "Отправляем…" : "Отправить на модерацию"}
            </Button>
          </>
        }
      />

      {submitted === null ? null : (
        <Alert kind="info" className="mb-3" title="Предложение отправлено на модерацию">
          {submitted}
        </Alert>
      )}
      {serverError === null ? null : (
        <Alert kind="danger" className="mb-3" title="Проверьте условия предложения">
          {serverError}
        </Alert>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <Box>
            <h2 className="font-heading text-base font-bold">1 · Категория и название</h2>
            <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
              <Field label="Категория" required error={errors.categoryPath?.message}>
                <Select
                  value={values.categoryPath}
                  onValueChange={(next) => {
                    form.setValue("categoryPath", next, { shouldValidate: true });
                  }}
                  aria-label="Категория"
                >
                  {data.categories.map((category) => (
                    <SelectItem key={category.path.join("/")} value={category.path.join("/")}>
                      {category.title}
                    </SelectItem>
                  ))}
                </Select>
              </Field>
              <Field
                label="Коэффициент мощности"
                hint="усл. ед. на изделие · из раздела «Мощность»"
              >
                <Input readOnly value={String(data.draft.capacityUnitsPerItem)} />
              </Field>
              <Field
                label="Название в выдаче"
                wide
                required
                error={errors.title?.message}
                hint={`${String((values.title ?? "").length)} символов из 80 · начинайте с типа изделия`}
              >
                <Input {...form.register("title")} placeholder="Футболки 180 г/м² под СТМ" />
              </Field>
            </div>
          </Box>

          <Box className="mt-3">
            <h2 className="font-heading text-base font-bold">2 · Фото</h2>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {data.draft.images.map((image) => (
                <Placeholder
                  key={image.id}
                  tone={image.tone}
                  radius="control"
                  square
                  label={image.label}
                />
              ))}
              <div className="hatch border-border-strong rounded-control grid aspect-square place-items-center border border-dashed text-[12.5px]">
                + фото
              </div>
            </div>
            <p className="text-muted mt-2 text-[12.5px]">
              От 3 фото. Реальные изделия вашего производства, без логотипов клиентов.
            </p>
          </Box>

          <Box className="mt-3">
            <h2 className="font-heading text-base font-bold">3 · Характеристики</h2>
            <p className="text-muted mt-1 text-[12.5px]">
              Поля заданы категорией. Из них собираются фильтры каталога и конструктор заказа —
              заказчик не сможет выбрать то, чего здесь нет.
            </p>
            <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
              {data.schema.attributes.map((attribute) => (
                <AttributeField
                  key={attribute.key}
                  attribute={attribute}
                  value={values.attributes?.[attribute.key]}
                  onChange={(next) => {
                    form.setValue(
                      "attributes",
                      { ...(form.getValues("attributes") ?? {}), [attribute.key]: next },
                      { shouldValidate: true, shouldDirty: true },
                    );
                  }}
                />
              ))}
            </div>
          </Box>

          <Box className="mt-3">
            <h2 className="font-heading text-base font-bold">4 · Цена по объёму</h2>
            <Field
              label="Минимальная партия (MOQ), шт"
              className="mt-2.5 max-w-60"
              required
              error={errors.moq?.message}
            >
              <Input numeric inputMode="numeric" {...form.register("moq")} placeholder="500" />
            </Field>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-[13.5px]" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    {["От, шт", "Цена за шт, ₽", "Партия", "Вы получите (−8 %)", ""].map(
                      (header, index) => (
                        <th
                          key={header || String(index)}
                          scope="col"
                          className="text-muted border-border border-b px-2 py-2 text-left text-[11.5px] font-medium tracking-[0.03em] uppercase"
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {tiers.fields.map((field, index) => {
                    const qty = parseAmount(tierRows[index]?.fromQty ?? "");
                    const price = parseAmount(tierRows[index]?.unitPrice ?? "");
                    const batch = Number.isNaN(qty) || Number.isNaN(price) ? null : qty * price;
                    const tierErrors = errors.tiers?.[index];
                    return (
                      <tr key={field.id} className="border-border border-b last:border-0">
                        <td className="px-2 py-1.5 align-top">
                          <Input
                            size="sm"
                            numeric
                            inputMode="numeric"
                            aria-label={`Объём ступени ${String(index + 1)}`}
                            invalid={tierErrors?.fromQty !== undefined}
                            {...form.register(`tiers.${index}.fromQty` as const)}
                          />
                          {tierErrors?.fromQty?.message === undefined ? null : (
                            <p className="text-danger mt-0.5 text-xs">
                              {tierErrors.fromQty.message}
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <Input
                            size="sm"
                            numeric
                            inputMode="decimal"
                            aria-label={`Цена ступени ${String(index + 1)}`}
                            invalid={tierErrors?.unitPrice !== undefined}
                            {...form.register(`tiers.${index}.unitPrice` as const)}
                          />
                          {tierErrors?.unitPrice?.message === undefined ? null : (
                            <p className="text-danger mt-0.5 text-xs">
                              {tierErrors.unitPrice.message}
                            </p>
                          )}
                        </td>
                        <td className="num px-2 py-1.5 text-right align-top">
                          {batch === null ? "—" : formatRub(batch * 100)}
                        </td>
                        <td className="num px-2 py-1.5 text-right align-top">
                          {batch === null ? "—" : formatRub(Math.round(batch * 92))}
                        </td>
                        <td className="px-2 py-1.5 text-right align-top">
                          <button
                            type="button"
                            className="text-action text-[12.5px] hover:underline"
                            onClick={() => tiers.remove(index)}
                          >
                            убрать
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {typeof errors.tiers?.message === "string" ? (
              <p className="text-danger mt-1.5 text-[13px]">{errors.tiers.message}</p>
            ) : null}
            <Button
              size="sm"
              className="mt-2"
              onClick={() => {
                const last = tierRows.at(-1);
                const nextQty = last ? Math.max(1, parseAmount(last.fromQty) * 2) : moqValue || 500;
                tiers.append({
                  fromQty: String(Number.isNaN(nextQty) ? 500 : nextQty),
                  unitPrice: last?.unitPrice ?? "",
                });
              }}
            >
              + Ступень
            </Button>
            <p className="text-muted mt-2.5 text-[12.5px]">
              Первая ступень = MOQ.{" "}
              {data.categoryMedianPrice === null
                ? null
                : `Медиана категории при 1 000 шт — ${formatRub(data.categoryMedianPrice)}.`}
            </p>
          </Box>

          <Box className="mt-3">
            <h2 className="font-heading text-base font-bold">5 · Опции и сроки</h2>
            <div className="mt-2.5 overflow-x-auto">
              <table className="w-full border-collapse text-[13.5px]" style={{ minWidth: 520 }}>
                <thead>
                  <tr>
                    {["Опция", "Цена, ₽", "Считается", ""].map((header, index) => (
                      <th
                        key={header || String(index)}
                        scope="col"
                        className="text-muted border-border border-b px-2 py-2 text-left text-[11.5px] font-medium tracking-[0.03em] uppercase"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {options.fields.map((field, index) => (
                    <tr key={field.id} className="border-border border-b last:border-0">
                      <td className="px-2 py-1.5">
                        <Input
                          size="sm"
                          aria-label={`Опция ${String(index + 1)}`}
                          {...form.register(`options.${index}.title` as const)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          size="sm"
                          numeric
                          inputMode="decimal"
                          aria-label={`Цена опции ${String(index + 1)}`}
                          {...form.register(`options.${index}.price` as const)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select
                          size="sm"
                          value={values.options?.[index]?.unit ?? "per_batch"}
                          onValueChange={(next) => {
                            form.setValue(
                              `options.${index}.unit` as const,
                              next as "per_item" | "per_batch",
                              { shouldValidate: true },
                            );
                          }}
                          aria-label={`Как считается опция ${String(index + 1)}`}
                        >
                          <SelectItem value="per_batch">за партию</SelectItem>
                          <SelectItem value="per_item">за штуку</SelectItem>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          type="button"
                          className="text-action text-[12.5px] hover:underline"
                          onClick={() => options.remove(index)}
                        >
                          убрать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => options.append({ title: "", price: "0", unit: "per_batch" })}
            >
              + Опция
            </Button>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Срок, раб. дней (от)" required error={errors.leadDaysMin?.message}>
                <Input numeric inputMode="numeric" {...form.register("leadDaysMin")} />
              </Field>
              <Field label="Срок, раб. дней (до)" required error={errors.leadDaysMax?.message}>
                <Input numeric inputMode="numeric" {...form.register("leadDaysMax")} />
              </Field>
              <Field label="+ дней на каждую 1 000 шт" error={errors.leadDaysPer1000?.message}>
                <Input numeric inputMode="numeric" {...form.register("leadDaysPer1000")} />
              </Field>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13.5px]">
              <Toggle
                checked={values.sampleAvailable}
                onCheckedChange={(next) => {
                  form.setValue("sampleAvailable", next, { shouldValidate: true });
                }}
                label="Предлагать образец"
              />
              <Input
                size="sm"
                numeric
                className="w-24"
                aria-label="Цена образца, ₽"
                disabled={!values.sampleAvailable}
                {...form.register("samplePrice")}
              />
              <span className="text-muted">₽ ·</span>
              <Input
                size="sm"
                numeric
                className="w-16"
                aria-label="Срок образца, дней"
                disabled={!values.sampleAvailable}
                {...form.register("sampleDays")}
              />
              <span className="text-muted">дней</span>
            </div>
            {errors.samplePrice?.message === undefined ? null : (
              <p className="text-danger mt-1 text-[13px]">{errors.samplePrice.message}</p>
            )}
          </Box>
        </div>

        <aside>
          <Box>
            <h3 className="font-heading text-base font-bold">Как увидит заказчик</h3>
            <div className="border-border rounded-card mt-2.5 overflow-hidden border">
              <Placeholder tone={data.preview.tone ?? "a"} className="h-28 w-full" label="фото" />
              <div className="p-2.5">
                <div className="text-[13.5px] font-medium">
                  {values.title || data.preview.title}
                </div>
                <div className="price mt-1 text-[17px]">
                  {tierRows.length === 0
                    ? "—"
                    : `от ${formatRub(Math.round(parseAmount(tierRows.at(-1)?.unitPrice ?? "0") * 100))}/шт`}
                </div>
                <div className="text-muted mt-1 text-[12.5px]">
                  MOQ {Number.isNaN(moqValue) ? "—" : formatNumber(moqValue)} шт ·{" "}
                  {values.leadDaysMin || "—"} раб. дней
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Rating value={data.preview.rating} />
                  <span className="text-muted text-[12.5px]">
                    {data.preview.factoryName}, {data.preview.factoryCity}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {data.preview.badges.includes("audit") ? <Tag tone="ok">аудит</Tag> : null}
                  {values.sampleAvailable ? <Tag tone="smp">образец</Tag> : null}
                </div>
              </div>
            </div>
          </Box>

          <Box className="mt-3">
            <h3 className="font-heading text-base font-bold">Готовность</h3>
            <ol className="mt-2">
              {data.readiness.map((item) => (
                <li
                  key={item.key}
                  className="border-border relative border-b border-dashed py-[7px] ps-7 text-[13.5px] last:border-0"
                >
                  <span
                    aria-hidden="true"
                    className={
                      item.state === "done"
                        ? "border-success bg-success absolute start-0 top-2 size-4 rounded-full border-2"
                        : item.state === "now"
                          ? "border-action ring-action-soft absolute start-0 top-2 size-4 rounded-full border-2 ring-[3px]"
                          : "border-border-strong absolute start-0 top-2 size-4 rounded-full border-2"
                    }
                  />
                  {item.title}
                </li>
              ))}
            </ol>
          </Box>

          {data.versions.length > 0 ? (
            <Box className="mt-3">
              <h3 className="font-heading text-base font-bold">История версий</h3>
              <ul className="mt-2 grid gap-2 text-[13px]">
                {data.versions.slice(0, 5).map((version) => (
                  <li key={version.version} className="border-border border-b pb-2 last:border-0">
                    <div className="flex items-center justify-between">
                      <b>Версия {version.version}</b>
                      <Tag tone={OFFER_STATUS_TONE[version.status]}>
                        {OFFER_STATUS_TITLE[version.status]}
                      </Tag>
                    </div>
                    {version.changes.length > 0 ? (
                      <ul className="text-muted mt-1 grid gap-0.5 text-[12.5px]">
                        {version.changes.map((change) => (
                          <li key={change.field}>
                            {change.label}: {change.before ?? "—"} → {change.after ?? "—"}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {version.moderationComment == null ? null : (
                      <p className="text-danger mt-1 text-[12.5px]">
                        Оператор: {version.moderationComment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Box>
          ) : null}

          <Alert kind="info" className="mt-3" title="Модерация">
            Правки цены и сроков публикуются сразу. Название, фото и характеристики — после
            проверки, до 1 рабочего дня.
          </Alert>
        </aside>
      </div>
    </>
  );
}

/** Поле по определению атрибута категории: список, мультивыбор, число или текст. */
function AttributeField({
  attribute,
  value,
  onChange,
}: {
  attribute: CategoryAttributeDef;
  value: string | number | string[] | undefined;
  onChange: (next: string | number | string[]) => void;
}) {
  if (attribute.kind === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <Field label={attribute.label} wide required={attribute.required}>
        <div className="flex flex-wrap gap-1.5">
          {(attribute.options ?? []).map((option) => (
            <Chip
              key={option}
              on={selected.includes(option)}
              onClick={() => {
                onChange(
                  selected.includes(option)
                    ? selected.filter((item) => item !== option)
                    : [...selected, option],
                );
              }}
            >
              {option}
            </Chip>
          ))}
        </div>
      </Field>
    );
  }

  if (attribute.kind === "select") {
    return (
      <Field label={attribute.label} required={attribute.required}>
        <Select
          value={typeof value === "string" ? value : ""}
          onValueChange={onChange}
          aria-label={attribute.label}
        >
          {(attribute.options ?? []).map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </Select>
      </Field>
    );
  }

  return (
    <Field label={attribute.label} required={attribute.required}>
      <Input
        numeric={attribute.kind === "number"}
        inputMode={attribute.kind === "number" ? "numeric" : undefined}
        value={value === undefined ? "" : String(value)}
        onChange={(event) => {
          onChange(attribute.kind === "number" ? Number(event.target.value) : event.target.value);
        }}
      />
    </Field>
  );
}
