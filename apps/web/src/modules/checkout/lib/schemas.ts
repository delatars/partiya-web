import { z } from "zod";

/* Формы оформления: react-hook-form + zod, по схеме на шаг.

   Правила те же, что в `missingFields` мок-бэкенда и, дальше, в крейте `orders`: фронт
   проверяет не вместо сервера, а до него — чтобы человек узнал про несходящуюся
   размерную сетку сразу, а не после запроса. Последнее слово всегда за сервером. */

/** Строка разбивки: «белый · 600». Количество остаётся строкой, пока человек печатает. */
const lineSchema = z.object({
  name: z.string().trim().min(1, "Укажите название"),
  qty: z.string().trim(),
});

/** «600» (с любыми пробелами) → 600. `undefined` — это не целое неотрицательное число. */
export function parseQty(raw: string): number | undefined {
  const digits = raw.replace(/[\s\u00a0]/gu, "");
  if (!/^\d+$/.test(digits)) return undefined;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : undefined;
}

export function sumQty(lines: readonly { qty: string }[]): number | undefined {
  let total = 0;
  for (const line of lines) {
    const value = parseQty(line.qty);
    if (value === undefined) return undefined;
    total += value;
  }
  return total;
}

/** Разбивка обязана сойтись с объёмом партии: спецификация не терпит «примерно». */
function checkSplit(
  lines: readonly { name: string; qty: string }[],
  total: number,
  path: "colors" | "sizes",
  label: string,
  ctx: z.RefinementCtx,
): void {
  for (const [index, line] of lines.entries()) {
    if (parseQty(line.qty) === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path, index, "qty"],
        message: "Целое число штук",
      });
      return;
    }
  }
  const sum = sumQty(lines);
  if (sum !== undefined && sum !== total) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message: `${label}: ${formatQty(sum)} из ${formatQty(total)} шт — суммы должны сойтись`,
    });
  }
}

function formatQty(value: number): string {
  return value.toLocaleString("ru-RU").replace(/\s/gu, String.fromCharCode(0xa0));
}

/** Шаг 1 — параметры партии. Объём здесь не редактируется: он меняется пересчётом. */
export const paramsStepSchema = (qty: number) =>
  z
    .object({
      colors: z.array(lineSchema).min(1, "Добавьте хотя бы один цвет"),
      sizes: z.array(lineSchema).min(1, "Добавьте хотя бы один размер"),
      fit: z.string().trim().min(1, "Выберите крой"),
      print: z.string().trim().min(1, "Выберите нанесение"),
      comment: z.string().trim().max(2000, "Комментарий длиннее 2 000 символов"),
    })
    .superRefine((value, ctx) => {
      checkSplit(value.colors, qty, "colors", "По цветам", ctx);
      checkSplit(value.sizes, qty, "sizes", "По размерам", ctx);
    });

export type ParamsStepForm = z.infer<ReturnType<typeof paramsStepSchema>>;

/** Российский номер в любой записи — та же проверка, что на входе (`modules/auth`). */
function isRussianPhone(raw: string): boolean {
  const digits = raw.replace(/\D/gu, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return !digits.slice(1).startsWith("0");
  }
  return digits.length === 10 && !digits.startsWith("0");
}

/** Шаг 2 — доставка. Адрес и получатель нужны только доставке до двери: адрес склада
    маркетплейса платформа знает сама, а самовывоз забирают с фабрики. */
export const deliveryStepSchema = z
  .object({
    optionId: z.string().min(1, "Выберите вариант доставки"),
    kind: z.enum(["marketplace_warehouse", "address", "pickup"]),
    address: z.string().trim(),
    recipientName: z.string().trim(),
    recipientPhone: z.string().trim(),
    comment: z.string().trim().max(500, "Комментарий длиннее 500 символов"),
  })
  .superRefine((value, ctx) => {
    if (value.kind !== "address") return;
    if (value.address.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address"],
        message: "Укажите адрес доставки",
      });
    }
    if (value.recipientName.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipientName"],
        message: "Укажите получателя",
      });
    }
    if (value.recipientPhone.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipientPhone"],
        message: "Укажите телефон получателя",
      });
    } else if (!isRussianPhone(value.recipientPhone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipientPhone"],
        message: "Телефон должен быть российским: +7 и 10 цифр",
      });
    }
  });

export type DeliveryStepForm = z.infer<typeof deliveryStepSchema>;

const EMAIL_RE = /^[^\s@]+@[a-z\d][a-z\d.-]*\.[a-z\d-]+$/i;

/** Шаг 3 — плательщик и документы. Юридический адрес уйдёт в счёт и договор, поэтому
    он обязателен; почта бухгалтера — нет, счёт можно скачать самому. */
export const payerStepSchema = z.object({
  orgId: z.string().min(1, "Выберите плательщика"),
  legalAddress: z
    .string()
    .trim()
    .min(1, "Укажите юридический адрес — он уйдёт в счёт и договор")
    .max(500, "Адрес длиннее 500 символов"),
  accountantEmail: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || EMAIL_RE.test(value),
      "Почта должна быть вида name@example.com",
    ),
  accepted: z.boolean().refine((value) => value, "Без принятия оферты заказ оформить нельзя"),
});

export type PayerStepForm = z.infer<typeof payerStepSchema>;

/** Поля плательщика БЕЗ галочки оферты — ровно то, что уходит в `PATCH /orders/{id}`.
 *
 * Отдельная схема, а не `payerStepSchema`, из-за Q-230: принятие оферты на сервер не
 * отправляется вовсе (тела у `submit` нет), поэтому ставить автосохранение реквизитов
 * в зависимость от галочки нельзя. Иначе порядок действий начинает решать: заполнил
 * адрес, потом поставил галочку — PATCH не уходил, и кнопка «Оплатить» оставалась
 * заблокированной навсегда. */
export const payerFieldsSchema = payerStepSchema.omit({ accepted: true });

export type PayerFieldsForm = z.infer<typeof payerFieldsSchema>;

/** Тело PATCH по текущему состоянию формы плательщика.
 *
 * `null` — отправлять нечего: реквизиты ещё не заполнены. Галочка оферты на результат
 * не влияет: она не часть запроса (Q-230). */
export function payerPatchOf(values: Partial<PayerStepForm>): {
  orgId: string;
  legalAddress: string;
  accountantEmail: string | null;
} | null {
  const parsed = payerFieldsSchema.safeParse({
    orgId: values.orgId ?? "",
    legalAddress: values.legalAddress ?? "",
    accountantEmail: values.accountantEmail ?? "",
  });
  if (!parsed.success) return null;
  return {
    orgId: parsed.data.orgId,
    legalAddress: parsed.data.legalAddress,
    accountantEmail: parsed.data.accountantEmail.length > 0 ? parsed.data.accountantEmail : null,
  };
}

/** Шаг 4 — оплата. */
export const paymentStepSchema = z.object({
  method: z.enum(["escrow_full", "escrow_split_50_50"], {
    errorMap: () => ({ message: "Выберите способ оплаты" }),
  }),
});

export type PaymentStepForm = z.infer<typeof paymentStepSchema>;

/* ─────────────────────────────── заказ образца ─────────────────────────────── */

export const sampleFormSchema = z
  .object({
    qty: z.coerce.number().int().min(1, "От 1 штуки").max(3, "Не больше 3 штук"),
    sizes: z.string().trim().min(1, "Укажите размеры"),
    color: z.string().trim().min(1, "Выберите цвет ткани"),
    print: z.string().trim().min(1, "Выберите печать"),
    deliveryId: z.string().min(1, "Выберите доставку"),
    address: z.string().trim().min(1, "Укажите адрес доставки"),
    recipientName: z.string().trim().min(1, "Укажите получателя"),
    recipientPhone: z.string().trim().min(1, "Укажите телефон получателя"),
    comment: z.string().trim().max(2000, "Комментарий длиннее 2 000 символов"),
    payment: z.enum(["card", "invoice"]),
  })
  .superRefine((value, ctx) => {
    if (value.recipientPhone.length > 0 && !isRussianPhone(value.recipientPhone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipientPhone"],
        message: "Телефон должен быть российским: +7 и 10 цифр",
      });
    }
  });

export type SampleForm = z.infer<typeof sampleFormSchema>;
