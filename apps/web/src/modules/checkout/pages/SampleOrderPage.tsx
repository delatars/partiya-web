import type { SampleOptions, SampleOrder } from "@partiya/api-contracts";
import {
  Alert,
  Box,
  Button,
  Breadcrumbs,
  BreadcrumbLink,
  BreadcrumbPage,
  cn,
  Field,
  Input,
  Placeholder,
  Price,
  Select,
  SelectItem,
  Skeleton,
  Spinner,
  Textarea,
} from "@partiya/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  getApiService,
  isApiError,
  offerDetailOptions,
  sampleOptionsQueryOptions,
} from "@/shared/api";
import { formatIsoDayMonth } from "@/shared/lib/dates";
import { formatRub, toRubles } from "@/shared/lib/format";
import { useSession } from "@/shared/lib/session";
import { AppLink, ErrorPage, RouterLink } from "@/shared/ui";

import { ArtworkUpload, type LocalArtwork } from "../components/ArtworkUpload";
import { artworkRejection } from "../lib/artwork";
import { sampleFormSchema, type SampleForm } from "../lib/schemas";
import { isAbort, uploadArtwork } from "@/shared/lib/presigned-upload";

/* Макет: экран `sample` — «Заказ образца».

   Образец — отдельный лёгкий тип заказа: он не резервирует мощность, не идёт через
   спецификацию и не имеет приёмки (ARCHITECTURE.md, раздел 1). Поэтому здесь одна
   форма и одна кнопка, а не мастер из четырёх шагов.

   ⚠ Q-13 открыт: оплата образца сделана прямой (карта или счёт на юрлицо), не через
   эскроу; стоимость засчитывается в первую партию у той же фабрики. Если решение будет
   другим, меняются `samples.ts` и `lib/sample-options.ts` — экран не трогается. */

export interface SampleOrderPageProps {
  offerId: number | undefined;
}

export function SampleOrderPage({ offerId }: SampleOrderPageProps) {
  const session = useSession();
  const offerQuery = useQuery({
    ...offerDetailOptions(offerId ?? 0),
    enabled: offerId !== undefined,
  });
  const optionsQuery = useQuery({
    ...sampleOptionsQueryOptions(offerId ?? 0),
    enabled: offerId !== undefined,
  });
  const [created, setCreated] = useState<SampleOrder | null>(null);

  if (offerId === undefined) {
    return (
      <ErrorPage
        code="400"
        title="Не выбрано предложение"
        description="Откройте карточку предложения и нажмите «Заказать образец»."
        actions={
          <Button asChild variant="cta">
            <AppLink to="/catalog">В каталог</AppLink>
          </Button>
        }
      />
    );
  }

  if (offerQuery.isError || optionsQuery.isError) {
    return (
      <ErrorPage
        code="404"
        title="Образец недоступен"
        description="Возможно, предложение снято с публикации или фабрика не делает образцы."
        actions={
          <Button asChild variant="cta">
            <AppLink to="/catalog">В каталог</AppLink>
          </Button>
        }
      />
    );
  }

  const offer = offerQuery.data;
  const options = optionsQuery.data;
  if (!offer || !options) return <SampleSkeleton />;

  if (created) return <SampleDone sample={created} />;

  return (
    <SampleFormView
      offer={{
        id: offer.id,
        title: offer.title,
        factoryName: offer.factory.name,
        factoryCity: offer.factory.city,
        tone: offer.tone ?? "a",
      }}
      options={options}
      defaultRecipient={session.me?.user.name ?? ""}
      defaultPhone={session.me?.user.phone ?? ""}
      onCreated={setCreated}
    />
  );
}

/* ------------------------------------------------------------------ форма */

interface SampleOfferView {
  id: number;
  title: string;
  factoryName: string;
  factoryCity: string;
  tone: "a" | "b" | "c" | "d";
}

function SampleFormView({
  offer,
  options,
  defaultRecipient,
  defaultPhone,
  onCreated,
}: {
  offer: SampleOfferView;
  options: SampleOptions;
  defaultRecipient: string;
  defaultPhone: string;
  onCreated: (sample: SampleOrder) => void;
}) {
  const idempotencyKey = useRef(newIdempotencyKey());
  const [artworkId, setArtworkId] = useState<string | null>(null);
  const [artworkName, setArtworkName] = useState<string | null>(null);
  const [localArtwork, setLocalArtwork] = useState<LocalArtwork[]>([]);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const form = useForm<SampleForm>({
    resolver: zodResolver(sampleFormSchema),
    mode: "onSubmit",
    defaultValues: {
      qty: options.qtyChoices[1] ?? 1,
      sizes: "M, L",
      color: options.colorChoices[0] ?? "",
      print: options.printChoices[0]?.value ?? "",
      deliveryId: options.delivery[0]?.id ?? "",
      address: "Москва, ул. Лесная, 9",
      recipientName: defaultRecipient,
      recipientPhone: defaultPhone,
      comment: "",
      payment: "card",
    },
  });

  const values = form.watch();
  const delivery = options.delivery.find((item) => item.id === values.deliveryId);
  const print = options.printChoices.find((item) => item.value === values.print);
  const total = options.price + (print?.price ?? 0) + (delivery?.price ?? 0);

  const create = useMutation({
    mutationFn: (form_: SampleForm) =>
      getApiService().createSample(
        {
          offerId: offer.id,
          params: {
            qty: form_.qty,
            sizes: form_.sizes,
            color: form_.color,
            print: form_.print,
          },
          delivery: {
            optionId: form_.deliveryId,
            address: form_.address,
            recipientName: form_.recipientName,
            recipientPhone: form_.recipientPhone,
          },
          artworkFileId: artworkId,
          comment: form_.comment.length > 0 ? form_.comment : null,
          payment: form_.payment,
        },
        idempotencyKey.current,
      ),
    onSuccess: onCreated,
    onError: (error) => {
      if (isApiError(error) && error.fieldErrors) {
        const first = Object.entries(error.fieldErrors)[0];
        setFormError(first?.[1][0] ?? error.message);
        return;
      }
      setFormError(
        isApiError(error) ? error.message : "Не получилось заказать образец. Попробуйте ещё раз.",
      );
    },
  });

  const addArtwork = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const key = `${file.name}:${String(Date.now())}`;
    const rejection = artworkRejection(file, options.artwork);
    if (rejection !== undefined) {
      setLocalArtwork([
        { key, fileName: file.name, size: file.size, progress: null, error: rejection },
      ]);
      return;
    }
    setLocalArtwork([{ key, fileName: file.name, size: file.size, progress: 0, error: null }]);

    void (async () => {
      try {
        const target = await getApiService().requestSampleArtworkUpload({
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        });
        const handle = uploadArtwork(target, file, (percent) => {
          setLocalArtwork((rows) =>
            rows.map((row) => (row.key === key ? { ...row, progress: percent } : row)),
          );
        });
        await handle.promise;
        setArtworkId(target.fileId);
        setArtworkName(file.name);
        setLocalArtwork((rows) =>
          rows.map((row) => (row.key === key ? { ...row, progress: 100 } : row)),
        );
      } catch (error) {
        if (isAbort(error)) {
          setLocalArtwork([]);
          return;
        }
        setLocalArtwork((rows) =>
          rows.map((row) =>
            row.key === key
              ? {
                  ...row,
                  progress: null,
                  error: isApiError(error)
                    ? (error.problem?.detail ?? error.message)
                    : "Файл не загрузился",
                }
              : row,
          ),
        );
      }
    })();
  };

  const errors = form.formState.errors;

  return (
    <div className="pb-8">
      <Breadcrumbs className="py-2">
        <BreadcrumbLink asChild>
          <RouterLink href="/catalog">Каталог</RouterLink>
        </BreadcrumbLink>
        <BreadcrumbLink asChild>
          <RouterLink href={`/offer/${String(offer.id)}`}>{offer.title}</RouterLink>
        </BreadcrumbLink>
        <BreadcrumbPage>Заказ образца</BreadcrumbPage>
      </Breadcrumbs>

      <h1 className="font-heading mb-3 text-2xl font-bold">Заказ образца</h1>

      {formError !== undefined && (
        <Alert kind="danger" className="mb-2.5" title="Проверьте форму">
          {formError}
        </Alert>
      )}

      <form
        onSubmit={form.handleSubmit((data) => {
          setFormError(undefined);
          create.mutate(data);
        })}
        className="grid items-start gap-4 lg:grid-cols-[1fr_360px]"
      >
        <div className="flex flex-col gap-2.5">
          <Box>
            <h2 className="font-heading text-lg font-bold">Что пришлёт фабрика</h2>
            <p className="text-muted mt-1 mb-3">
              Образец шьётся из той же ткани и на той же линии, что и партия. Печать — по вашему
              макету или тестовая.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Количество" error={errors.qty?.message}>
                <Select
                  value={String(values.qty)}
                  onValueChange={(value) => {
                    form.setValue("qty", Number(value));
                  }}
                  aria-label="Количество образцов"
                >
                  {options.qtyChoices.map((choice) => (
                    <SelectItem key={choice} value={String(choice)}>
                      {choice} шт
                    </SelectItem>
                  ))}
                </Select>
              </Field>

              <Field label="Размеры" hint="через запятую" error={errors.sizes?.message}>
                <Input placeholder="M, L" {...form.register("sizes")} />
              </Field>

              <Field label="Цвет ткани" error={errors.color?.message}>
                <Select
                  value={values.color}
                  onValueChange={(value) => {
                    form.setValue("color", value);
                  }}
                  aria-label="Цвет ткани"
                >
                  {options.colorChoices.map((choice) => (
                    <SelectItem key={choice} value={choice}>
                      {choice}
                    </SelectItem>
                  ))}
                </Select>
              </Field>

              <Field label="Печать" error={errors.print?.message}>
                <Select
                  value={values.print}
                  onValueChange={(value) => {
                    form.setValue("print", value);
                  }}
                  aria-label="Печать"
                >
                  {options.printChoices.map((choice) => (
                    <SelectItem key={choice.value} value={choice.value}>
                      {choice.value}
                    </SelectItem>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="mt-3">
              <p className="text-muted mb-1.5 text-xs">
                Макет — необязательно. Без макета фабрика нанесёт тестовый принт.
              </p>
              <ArtworkUpload
                files={[]}
                local={localArtwork}
                limits={options.artwork}
                onAdd={addArtwork}
                onRemove={() => {
                  /* у образца файл один — удаляется через dismiss */
                }}
                onDismissLocal={() => {
                  setLocalArtwork([]);
                  setArtworkId(null);
                  setArtworkName(null);
                }}
              />
              {artworkName !== null && localArtwork.length === 0 && (
                <p className="text-muted mt-1.5 text-[12.5px]">Приложен: {artworkName}</p>
              )}
            </div>
          </Box>

          <Box>
            <h2 className="font-heading text-lg font-bold">Куда доставить</h2>
            <div
              role="radiogroup"
              aria-label="Доставка образца"
              className="mt-2.5 flex flex-col gap-2"
            >
              {options.delivery.map((option) => {
                const active = option.id === values.deliveryId;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "rounded-control flex cursor-pointer items-start gap-2.5 border px-3 py-2.5 text-[13.5px]",
                      active ? "border-action bg-action-soft" : "border-border",
                    )}
                  >
                    <input
                      type="radio"
                      className="accent-action mt-0.5 size-4 flex-none"
                      checked={active}
                      onChange={() => {
                        form.setValue("deliveryId", option.id);
                      }}
                    />
                    <span>
                      <b className="font-medium">
                        {option.title} · {formatRub(option.price)}
                      </b>
                      {option.note !== null && (
                        <span className="text-muted block text-[12.5px]">{option.note}</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Адрес" wide error={errors.address?.message} required>
                <Input {...form.register("address")} />
              </Field>
              <Field label="Получатель" error={errors.recipientName?.message} required>
                <Input placeholder="Анна Кораблёва" {...form.register("recipientName")} />
              </Field>
              <Field label="Телефон" error={errors.recipientPhone?.message} required>
                <Input
                  inputMode="tel"
                  placeholder="+7 916 000-12-34"
                  {...form.register("recipientPhone")}
                />
              </Field>
            </div>
          </Box>

          <Box>
            <h2 className="font-heading text-lg font-bold">Комментарий технологу</h2>
            <Field className="mt-2" error={errors.comment?.message}>
              <Textarea
                rows={3}
                placeholder="Важна посадка оверсайз и плотность — сравниваем с текущим поставщиком."
                {...form.register("comment")}
              />
            </Field>
          </Box>
        </div>

        <aside aria-label="Сводка заказа" className="bg-surface rounded-card sticky top-3 p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <Placeholder
              tone={offer.tone}
              className="size-14 flex-none rounded-md"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <b className="block">Образец · {offer.title}</b>
              <span className="text-muted text-[12.5px]">
                «{offer.factoryName}», {offer.factoryCity}
              </span>
            </div>
          </div>

          <SummaryLine label={`Образец × ${String(values.qty)}`} amount={options.price} />
          <SummaryLine label={values.print} amount={print?.price ?? 0} />
          <SummaryLine label={delivery?.title ?? "Доставка"} amount={delivery?.price ?? 0} />

          <div className="border-border mt-2 flex items-baseline justify-between border-t pt-3">
            <b>Итого</b>
            <Price className="text-2xl" value={toRubles(total)} />
          </div>
          <p className="text-muted mt-1 text-[12.5px]">
            Изготовление {options.leadDays} раб. дней
            {delivery === undefined ? "" : ` + доставка ${String(delivery.days)} дн.`}
          </p>

          <Button
            type="submit"
            variant="cta"
            size="lg"
            wide
            className="mt-3"
            disabled={create.isPending}
            onClick={() => {
              form.setValue("payment", "card");
            }}
          >
            {create.isPending ? <Spinner size="sm" label="Оформляем" /> : "Оплатить картой"}
          </Button>
          <Button
            type="submit"
            wide
            className="mt-1.5"
            disabled={create.isPending}
            onClick={() => {
              form.setValue("payment", "invoice");
            }}
          >
            Выставить счёт на юрлицо
          </Button>

          <div className="bg-success-soft rounded-control mt-2.5 px-2.5 py-2.5 text-[12.5px]">
            <b>{formatRub(options.credit.amount)} зачтутся</b> в первую партию у этой фабрики в
            течение {options.credit.days} дней.
          </div>
        </aside>
      </form>
    </div>
  );
}

function SummaryLine({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between gap-3 py-[5px] text-[13.5px]">
      <span>{label}</span>
      <span className="num">{formatRub(amount)}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ подтверждение */

function SampleDone({ sample }: { sample: SampleOrder }) {
  return (
    <div className="mx-auto max-w-[640px] py-8 text-center">
      <span
        aria-hidden="true"
        className="bg-success mx-auto grid size-13 place-items-center rounded-full text-white"
      >
        <Check className="size-7" strokeWidth={3} />
      </span>
      <h1 className="font-heading mt-2.5 mb-1.5 text-2xl font-bold">
        Образец № {sample.id} заказан
      </h1>
      <p className="text-muted">
        {sample.payment === "card"
          ? "Оплата прошла. Фабрика начнёт шить образец в ближайший рабочий день."
          : "Счёт придёт на почту. Образец уйдёт в работу после поступления оплаты."}
      </p>

      <Box className="mt-4 text-left">
        <dl className="grid grid-cols-[minmax(110px,150px)_1fr] gap-x-3 gap-y-1.5 text-[13.5px]">
          <dt className="text-muted">Что шьём</dt>
          <dd className="m-0">
            {sample.params.qty} шт · {sample.params.color} · {sample.params.sizes} ·{" "}
            {sample.params.print}
          </dd>
          <dt className="text-muted">Макет</dt>
          <dd className="m-0">{sample.artworkFileName ?? "тестовый принт фабрики"}</dd>
          <dt className="text-muted">Доставка</dt>
          <dd className="m-0">
            {sample.delivery.title} · {sample.delivery.address}
          </dd>
          <dt className="text-muted">Готовность</dt>
          <dd className="m-0">
            {sample.leadDays} раб. дней
            {formatIsoDayMonth(sample.shipDate ?? undefined) === undefined
              ? ""
              : ` · отгрузка ~${formatIsoDayMonth(sample.shipDate ?? undefined)}`}
          </dd>
          <dt className="text-muted">Сумма</dt>
          <dd className="m-0">
            <b className="num">{formatRub(sample.total)}</b>
          </dd>
        </dl>
        <div className="bg-success-soft rounded-control mt-3 px-2.5 py-2.5 text-[12.5px]">
          <b>{formatRub(sample.credit.amount)} зачтутся</b> в первую партию у этой фабрики
          {sample.credit.validUntil === null
            ? ""
            : ` — до ${formatIsoDayMonth(sample.credit.validUntil ?? undefined) ?? sample.credit.validUntil}`}
          .
        </div>
      </Box>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button asChild variant="cta">
          <AppLink to="/samples">Мои образцы</AppLink>
        </Button>
        <Button asChild>
          <AppLink to={`/offer/${String(sample.offer.id)}`}>Вернуться к предложению</AppLink>
        </Button>
      </div>
    </div>
  );
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `idem-${String(Date.now())}-${Math.random().toString(36).slice(2)}`;
}

function SampleSkeleton() {
  return (
    <div className="py-6">
      <Skeleton className="mb-3 h-8 w-56" />
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-96 w-full rounded-[10px]" />
        <Skeleton className="h-80 w-full rounded-[10px]" />
      </div>
    </div>
  );
}
