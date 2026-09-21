import { z } from "zod";

/* Схема формы претензии. Проверяет только то, что можно проверить в браузере:
   заполненность и диапазон. Сумма возврата и допустимость требования — за сервером,
   он же вернёт `errors` по полям, и они лягут в ту же форму. */

export const DISPUTE_REASONS = [
  "size_mismatch",
  "defects",
  "print_defects",
  "shortfall",
  "deadline",
  "other",
] as const;

export const DISPUTE_REMEDIES = ["rework", "partial_refund", "full_refund"] as const;

export const disputeFormSchema = z.object({
  reason: z.enum(DISPUTE_REASONS),
  /** Строкой: поле числовое, но пустое значение — это «вся партия», а не 0. */
  affectedQty: z
    .string()
    .refine(
      (value) => value === "" || (/^\d+$/.test(value) && Number(value) > 0),
      "Укажите количество изделий или оставьте поле пустым",
    ),
  description: z
    .string()
    .trim()
    .min(10, "Опишите проблему — минимум 10 символов")
    .max(2000, "Слишком длинное описание"),
  remedy: z.enum(DISPUTE_REMEDIES),
});

export type DisputeFormValues = z.infer<typeof disputeFormSchema>;
