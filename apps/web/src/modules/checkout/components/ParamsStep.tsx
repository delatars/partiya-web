import type { OfferDetail, Order, UpdateOrderDraftBody } from "@partiya/api-contracts";
import { Button, Checkbox, Field, Input, Select, SelectItem, Textarea } from "@partiya/ui";
import { Minus, Plus } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { formatNumber, formatRub } from "@/shared/lib/format";
import { isOptionAvailable } from "@/shared/lib/quote";

import { paramsStepSchema, parseQty, type ParamsStepForm } from "../lib/schemas";
import { useDebouncedCallback } from "../lib/use-debounced";
import { ArtworkUpload, type LocalArtwork } from "./ArtworkUpload";
import { SaveBadge, type SaveState } from "./SaveBadge";

/* Макет: шаги «Параметры партии» и «Макет печати» — здесь они один шаг, как просит
   карта оформления: параметры изделия и макет к нему человек заполняет за один присест.

   Объём и опции отсюда меняют ЦЕНУ, поэтому они не сохраняются PATCH-ем напрямую:
   изменение уходит в URL → `POST /quotes` → новый `quoteId` → PATCH. Один путь для
   денег, как и на карточке. Всё остальное (цвета, размеры, крой, печать, комментарий)
   PATCH-ится с задержкой. */

const FITS = ["классический", "оверсайз", "женский приталенный"];
const PRINTS = [
  "шелкография, 1 цвет, грудь",
  "шелкография, 2 цвета, грудь",
  "шелкография, 2 цвета, грудь + спина",
  "DTF, полноцвет",
  "вышивка",
  "без печати",
];

export interface ParamsStepProps {
  order: Order;
  offer: OfferDetail;
  qty: number;
  optionIds: string[];
  saveState: SaveState;
  localArtwork: LocalArtwork[];
  artworkBusy: boolean;
  onPatch: (body: UpdateOrderDraftBody) => void;
  onQtyChange: (qty: number) => void;
  onToggleOption: (id: string, on: boolean) => void;
  onAddArtwork: (files: File[]) => void;
  onRemoveArtwork: (fileId: string) => void;
  onDismissLocalArtwork: (key: string) => void;
  onDone: () => void;
  /** Подпись кнопки перехода: её считает страница — она знает, какой шаг откроется. */
  nextLabel: string;
}

export function ParamsStep({
  order,
  offer,
  qty,
  optionIds,
  saveState,
  localArtwork,
  artworkBusy,
  onPatch,
  onQtyChange,
  onToggleOption,
  onAddArtwork,
  onRemoveArtwork,
  onDismissLocalArtwork,
  onDone,
  nextLabel,
}: ParamsStepProps) {
  const form = useForm<ParamsStepForm>({
    resolver: zodResolver(paramsStepSchema(qty)),
    mode: "onChange",
    defaultValues: {
      colors: order.params.colors.map((line) => ({
        name: line.color,
        qty: formatNumber(line.qty),
      })),
      sizes: order.params.sizes.map((line) => ({ name: line.size, qty: formatNumber(line.qty) })),
      fit: order.params.fit ?? FITS[0] ?? "",
      print: order.params.print ?? PRINTS[1] ?? "",
      comment: order.params.comment ?? "",
    },
  });

  const colors = useFieldArray({ control: form.control, name: "colors" });
  const sizes = useFieldArray({ control: form.control, name: "sizes" });

  const save = useDebouncedCallback((values: ParamsStepForm) => {
    onPatch({
      params: {
        colors: values.colors.map((line) => ({
          color: line.name,
          qty: parseQty(line.qty) ?? 0,
        })),
        sizes: values.sizes.map((line) => ({ size: line.name, qty: parseQty(line.qty) ?? 0 })),
        fit: values.fit,
        print: values.print,
        comment: values.comment.length > 0 ? values.comment : null,
      },
    });
  });

  useEffect(() => {
    const subscription = form.watch((_values, { name }) => {
      // первый вызов без имени поля — это программная установка значений, не правка
      if (name === undefined) return;
      void form.trigger().then((valid) => {
        if (valid) save.run(form.getValues());
      });
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [form, save]);

  // объём меняется снаружи (пересчётом) — разбивку по умолчанию присылает сервер
  useEffect(() => {
    form.reset({
      colors: order.params.colors.map((line) => ({
        name: line.color,
        qty: formatNumber(line.qty),
      })),
      sizes: order.params.sizes.map((line) => ({ name: line.size, qty: formatNumber(line.qty) })),
      fit: order.params.fit ?? FITS[0] ?? "",
      print: order.params.print ?? PRINTS[1] ?? "",
      comment: order.params.comment ?? "",
    });
    // сбрасываем форму только на смену объёма: иначе она затирала бы ввод на каждом PATCH
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.params.qty]);

  const errors = form.formState.errors;
  const step = qty >= 1000 ? 500 : qty >= 300 ? 100 : 50;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Объём партии, шт" hint={`минимальная партия — ${formatNumber(offer.moq)} шт`}>
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              aria-label={`Убавить на ${formatNumber(step)}`}
              disabled={qty <= offer.moq}
              onClick={() => {
                onQtyChange(Math.max(offer.moq, qty - step));
              }}
              className="px-2.5"
            >
              <Minus aria-hidden="true" className="size-4" />
            </Button>
            <Input
              numeric
              inputMode="numeric"
              defaultValue={formatNumber(qty)}
              key={qty}
              className="text-center"
              onBlur={(event) => {
                const next = parseQty(event.target.value);
                onQtyChange(next === undefined || next <= 0 ? offer.moq : next);
              }}
            />
            <Button
              variant="ghost"
              aria-label={`Добавить ${formatNumber(step)}`}
              onClick={() => {
                onQtyChange(qty + step);
              }}
              className="px-2.5"
            >
              <Plus aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </Field>

        <Field label="Крой" error={errors.fit?.message}>
          <Select
            value={form.watch("fit")}
            onValueChange={(value) => {
              form.setValue("fit", value, { shouldDirty: true, shouldValidate: true });
            }}
            aria-label="Крой"
          >
            {FITS.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </Select>
        </Field>
      </div>

      {offer.options.length > 0 && (
        <fieldset className="mt-3 border-0 p-0">
          <legend className="text-muted mb-1 text-xs">Опции фабрики</legend>
          {offer.options.map((option) => {
            const available = isOptionAvailable(option, qty);
            return (
              <Checkbox
                key={option.id}
                checked={optionIds.includes(option.id)}
                disabled={!available}
                onCheckedChange={(next) => {
                  onToggleOption(option.id, next === true);
                }}
                rowClassName="py-0.5"
                label={option.title}
                hint={
                  <span className="num">
                    {formatRub(option.price)}
                    {option.unit === "per_item" ? "/шт" : ""}
                  </span>
                }
              />
            );
          })}
        </fieldset>
      )}

      <SplitEditor
        legend="Цвета"
        namePlaceholder="цвет"
        fields={colors.fields.map((field, index) => ({ id: field.id, index }))}
        register={form.register}
        base="colors"
        error={errors.colors?.message ?? errors.colors?.root?.message}
        onAdd={() => {
          colors.append({ name: "", qty: "0" });
        }}
        onRemove={(index) => {
          colors.remove(index);
        }}
      />

      <SplitEditor
        legend="Размерный ряд"
        namePlaceholder="размер"
        fields={sizes.fields.map((field, index) => ({ id: field.id, index }))}
        register={form.register}
        base="sizes"
        error={errors.sizes?.message ?? errors.sizes?.root?.message}
        onAdd={() => {
          sizes.append({ name: "", qty: "0" });
        }}
        onRemove={(index) => {
          sizes.remove(index);
        }}
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Нанесение" error={errors.print?.message}>
          <Select
            value={form.watch("print")}
            onValueChange={(value) => {
              form.setValue("print", value, { shouldDirty: true, shouldValidate: true });
            }}
            aria-label="Нанесение"
          >
            {PRINTS.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </Select>
        </Field>
        <Field label="Комментарий технологу" error={errors.comment?.message}>
          <Textarea rows={2} {...form.register("comment")} />
        </Field>
      </div>

      <div className="mt-4">
        <h3 className="font-heading mb-1 text-sm font-bold">Макет печати</h3>
        <p className="text-muted mb-2 text-[12.5px]">
          Технолог фабрики проверит макет и пришлёт цветопробу до запуска партии.
        </p>
        <ArtworkUpload
          files={order.artwork}
          local={localArtwork}
          onAdd={onAddArtwork}
          onRemove={onRemoveArtwork}
          onDismissLocal={onDismissLocalArtwork}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <SaveBadge state={saveState} />
        <Button variant="cta" disabled={artworkBusy} onClick={onDone}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ разбивка партии */

type RegisterFn = ReturnType<typeof useForm<ParamsStepForm>>["register"];

function SplitEditor({
  legend,
  namePlaceholder,
  fields,
  register,
  base,
  error,
  onAdd,
  onRemove,
}: {
  legend: string;
  namePlaceholder: string;
  fields: { id: string; index: number }[];
  register: RegisterFn;
  base: "colors" | "sizes";
  error?: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <fieldset className="mt-3 border-0 p-0">
      <legend className="text-muted mb-1 text-xs">{legend}</legend>
      <div className="flex flex-col gap-1.5">
        {fields.map(({ id, index }) => (
          <div key={id} className="flex items-center gap-1.5">
            <Input
              size="sm"
              placeholder={namePlaceholder}
              aria-label={`${legend}: название ${String(index + 1)}`}
              {...register(`${base}.${index}.name` as const)}
            />
            <Input
              size="sm"
              numeric
              inputMode="numeric"
              className="w-24 text-right"
              aria-label={`${legend}: количество ${String(index + 1)}`}
              {...register(`${base}.${index}.qty` as const)}
            />
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Убрать строку ${String(index + 1)}`}
              disabled={fields.length <= 1}
              onClick={() => {
                onRemove(index);
              }}
              className="px-2"
            >
              <Minus aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onAdd}>
          + Добавить
        </Button>
        {error !== undefined && <span className="text-danger text-xs">{error}</span>}
      </div>
    </fieldset>
  );
}
