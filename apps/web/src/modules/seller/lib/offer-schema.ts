import type { SaveSellerOfferBody, SellerOfferDraft } from "@partiya/api-contracts";
import { z } from "zod";

import { validateOfferPricing } from "@/shared/lib/offer-pricing";

/* Схема редактора предложения.
 *
 * Правила ступеней — не свои: они взяты из `crates/pricing/src/lib.rs::validate_offer`
 * и живут в `shared/lib/offer-pricing.ts` одной функцией (Q-127). Здесь схема только
 * раскладывает их ошибки по путям полей формы, чтобы красным подсветилась та строка
 * таблицы, где ошибка сделана, а не форма целиком.
 *
 * Деньги в форме — РУБЛИ: завод печатает «168», а не «16800». В контракт уходят копейки
 * (`Kopecks`), перевод делает `toDraftBody` — один раз и в одном месте. */

/** Число из поля: «1 000» → 1000. `NaN` — не число. */
export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[\s\u00a0]/gu, "").replace(",", ".");
  if (cleaned.length === 0) return Number.NaN;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : Number.NaN;
}

const amount = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(parseAmount(value)), message)
    .refine((value) => parseAmount(value) >= 0, "Не может быть отрицательным");

export const tierFormSchema = z.object({
  fromQty: amount("Укажите объём числом"),
  unitPrice: amount("Укажите цену числом"),
});

export const optionFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Назовите опцию"),
  price: amount("Укажите цену числом"),
  unit: z.enum(["per_item", "per_batch"]),
});

export const offerFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Укажите название — его видит заказчик в выдаче")
      .max(80, "Не длиннее 80 символов"),
    categoryPath: z.string().min(1, "Выберите категорию"),
    moq: amount("Укажите минимальную партию числом"),
    tiers: z.array(tierFormSchema).min(1, "Добавьте хотя бы одну ступень цены"),
    options: z.array(optionFormSchema),
    leadDaysMin: amount("Укажите срок числом"),
    leadDaysMax: amount("Укажите срок числом"),
    leadDaysPer1000: amount("Укажите прибавку числом"),
    sampleAvailable: z.boolean(),
    samplePrice: z.string().trim(),
    sampleDays: z.string().trim(),
    attributes: z.record(z.union([z.string(), z.number(), z.array(z.string())])),
  })
  .superRefine((values, ctx) => {
    const moq = parseAmount(values.moq);
    const tiers = values.tiers.map((tier) => ({
      fromQty: parseAmount(tier.fromQty),
      unitPrice: Math.round(parseAmount(tier.unitPrice) * 100),
    }));
    // ступени уже разобраны в числа — их проверяет та же функция, что и мок-бэкенд
    if (tiers.every((tier) => !Number.isNaN(tier.fromQty) && !Number.isNaN(tier.unitPrice))) {
      const errors = validateOfferPricing({
        moq: Number.isNaN(moq) ? 0 : moq,
        tiers,
        options: values.options.map((option) => ({
          title: option.title,
          price: Math.round(parseAmount(option.price) * 100),
          unit: option.unit,
        })),
      });
      for (const [field, messages] of Object.entries(errors)) {
        for (const message of messages) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: field.split("."), message });
        }
      }
    }

    const min = parseAmount(values.leadDaysMin);
    const max = parseAmount(values.leadDaysMax);
    if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["leadDaysMax"],
        message: "Верхняя граница срока не может быть меньше нижней",
      });
    }

    if (values.sampleAvailable) {
      if (Number.isNaN(parseAmount(values.samplePrice))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["samplePrice"],
          message: "Укажите цену образца",
        });
      }
      if (Number.isNaN(parseAmount(values.sampleDays))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sampleDays"],
          message: "Укажите срок изготовления образца",
        });
      }
    }
  });

export type OfferForm = z.infer<typeof offerFormSchema>;

/** Черновик с сервера → значения формы (копейки → рубли). */
export function toFormValues(draft: SellerOfferDraft): OfferForm {
  const rub = (kopecks: number) => String(Math.round(kopecks) / 100);
  return {
    title: draft.title,
    categoryPath: draft.categoryPath.join("/"),
    moq: draft.moq > 0 ? String(draft.moq) : "",
    tiers: draft.tiers.map((tier) => ({
      fromQty: String(tier.fromQty),
      unitPrice: rub(tier.unitPrice),
    })),
    options: draft.options.map((option) => ({
      id: option.id,
      title: option.title,
      price: rub(option.price),
      unit: option.unit,
    })),
    leadDaysMin: String(draft.leadDaysMin),
    leadDaysMax: String(draft.leadDaysMax),
    leadDaysPer1000: String(draft.leadDaysPer1000),
    sampleAvailable: draft.sampleAvailable,
    samplePrice: draft.samplePrice === null ? "" : rub(draft.samplePrice),
    sampleDays: draft.sampleDays === null ? "" : String(draft.sampleDays),
    attributes: draft.attributes,
  };
}

/** Значения формы → тело `PATCH /seller/offers/{id}` (рубли → копейки). */
export function toDraftBody(values: OfferForm): SaveSellerOfferBody {
  const kop = (raw: string) => Math.round(parseAmount(raw) * 100);
  return {
    title: values.title.trim(),
    categoryPath: values.categoryPath.split("/"),
    moq: parseAmount(values.moq),
    tiers: values.tiers.map((tier) => ({
      fromQty: parseAmount(tier.fromQty),
      unitPrice: kop(tier.unitPrice),
    })),
    options: values.options.map((option) => ({
      id: option.id,
      title: option.title.trim(),
      price: kop(option.price),
      unit: option.unit,
    })),
    leadDaysMin: parseAmount(values.leadDaysMin),
    leadDaysMax: parseAmount(values.leadDaysMax),
    leadDaysPer1000: parseAmount(values.leadDaysPer1000),
    sampleAvailable: values.sampleAvailable,
    samplePrice: values.sampleAvailable ? kop(values.samplePrice) : null,
    sampleDays: values.sampleAvailable ? parseAmount(values.sampleDays) : null,
    attributes: values.attributes,
  };
}
