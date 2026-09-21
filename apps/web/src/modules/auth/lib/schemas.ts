import { z } from "zod";

/* Формы входа и регистрации. Правила — те же, что в partiya-api (`domain/identifier.rs`,
   `domain/inn.rs`, `domain/org.rs`): фронт проверяет не вместо бэка, а до него, чтобы
   человек узнал про опечатку в ИНН сразу, а не после запроса.

   Всё, что бэк считает ошибкой, здесь тоже ошибка. Обратное неверно и не нужно:
   последнее слово всегда за сервером. */

/** ИНН из макета `register` — 7701234567 — контрольную сумму НЕ проходит.
    В плейсхолдерах и демо-данных используется настоящий ИНН Сбербанка. */
export const INN_PLACEHOLDER = "7707083893";
export const KPP_PLACEHOLDER = "770101001";

const W10 = [2, 4, 10, 3, 5, 9, 4, 6, 8];
const W11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
const W12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];

/** Контрольная цифра ФНС: (Σ коэффициент·цифра mod 11) mod 10. */
function checksum(digits: readonly number[], weights: readonly number[]): number {
  let sum = 0;
  for (let index = 0; index < weights.length; index += 1) {
    sum += (digits[index] ?? 0) * (weights[index] ?? 0);
  }
  return (sum % 11) % 10;
}

/** Контрольные суммы ИНН: 10 цифр — юрлицо, 12 — ИП. Длина и состав проверяются до арифметики. */
export function isValidInn(raw: string): boolean {
  const value = raw.trim();
  if (!/^\d+$/.test(value)) return false;
  const digits = [...value].map(Number);
  if (digits.length === 10) return checksum(digits.slice(0, 9), W10) === digits[9];
  if (digits.length === 12) {
    return (
      checksum(digits.slice(0, 10), W11) === digits[10] &&
      checksum(digits.slice(0, 11), W12) === digits[11]
    );
  }
  return false;
}

/** 12 цифр — ИП: у него не бывает КПП. */
export function isSoleTraderInn(raw: string): boolean {
  return raw.trim().length === 12;
}

/** Телефон или почта — одно поле, как на экране `login`. Ветка выбирается по «собаке»:
    строка с ней — заведомо попытка ввести почту, и жаловаться на телефон было бы издевательством. */
export function looksLikeEmail(raw: string): boolean {
  return raw.includes("@");
}

/** Почта → нижний регистр без пробелов по краям. Точки и +tag в локальной части не трогаем:
    у большинства корпоративных серверов «a.b@» и «ab@» — разные ящики. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[a-z\d][a-z\d.-]*\.[a-z\d-]+$/i;

export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  if (!EMAIL_RE.test(email)) return false;
  const domain = email.slice(email.indexOf("@") + 1);
  return !domain.includes("..") && !domain.startsWith(".") && !domain.endsWith(".");
}

/** Российский номер в любой записи → E.164: «8 916 …», «+7 916 …», «916 …» → «+79160001234». */
export function normalizePhone(raw: string): string | undefined {
  const value = raw.trim();
  if (/[^\d\s()+.-]/.test(value)) return undefined;
  const digits = value.replace(/\D/gu, "");
  let national: string | undefined;
  if (digits.length === 11 && (digits.startsWith("8") || digits.startsWith("7"))) {
    national = digits.slice(1);
  } else if (digits.length === 10) {
    national = digits;
  }
  // код оператора не начинается с нуля ни в одном российском плане нумерации
  if (national === undefined || national.startsWith("0")) return undefined;
  return `+7${national}`;
}

/** Нормализованный идентификатор входа — то, что уходит в `identifier`. */
export function normalizeIdentifier(raw: string): string | undefined {
  const value = raw.trim();
  if (value.length === 0) return undefined;
  if (looksLikeEmail(value)) return isValidEmail(value) ? normalizeEmail(value) : undefined;
  return normalizePhone(value);
}

export const identifierSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Укажите телефон или рабочую почту")
    .refine(
      (value) => !looksLikeEmail(value) || isValidEmail(value),
      "Почта должна быть вида name@example.com",
    )
    .refine(
      (value) => looksLikeEmail(value) || normalizePhone(value) !== undefined,
      "Телефон должен быть российским: +7 и 10 цифр",
    ),
});

export type IdentifierForm = z.infer<typeof identifierSchema>;

/** Код: ровно столько цифр, сколько сказал бэк в `codeLength`. */
export const codeSchema = (length: number) =>
  z.object({
    code: z
      .string()
      .trim()
      .regex(new RegExp(`^\\d{${String(length)}}$`), `Введите ${String(length)} цифр из сообщения`),
  });

export type CodeForm = { code: string };

/** Название организации: ограничение то же, что в `NewOrganization::parse`. */
const MAX_ORG_NAME = 300;

export const organizationSchema = z
  .object({
    kind: z.enum(["customer", "factory"], {
      errorMap: () => ({ message: "Выберите, что будете делать на платформе" }),
    }),
    name: z
      .string()
      .trim()
      .min(1, "Укажите название организации")
      .max(MAX_ORG_NAME, `Название длиннее ${String(MAX_ORG_NAME)} символов`),
    inn: z
      .string()
      .trim()
      .min(1, "Укажите ИНН")
      .refine((value) => /^\d+$/.test(value), "ИНН состоит только из цифр")
      .refine(
        (value) => !/^\d+$/.test(value) || value.length === 10 || value.length === 12,
        "ИНН состоит из 10 цифр (юрлицо) или 12 (ИП)",
      )
      .refine(
        (value) => !/^\d{10}$|^\d{12}$/.test(value) || isValidInn(value),
        "Контрольная сумма ИНН не сходится — проверьте, нет ли опечатки",
      ),
    kpp: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || /^\d{9}$/.test(value), "КПП состоит из 9 цифр"),
    accepted: z.boolean().refine((value) => value, "Без принятия оферты компанию завести нельзя"),
  })
  .superRefine((value, ctx) => {
    // КПП у ИП не игнорируем, а отвергаем: присланный КПП при 12-значном ИНН означает,
    // что человек перепутал поля, и молча выбросить значение — худший выход.
    if (value.kpp.length > 0 && isSoleTraderInn(value.inn)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kpp"],
        message: "У индивидуального предпринимателя нет КПП",
      });
    }
  });

export type OrganizationForm = z.infer<typeof organizationSchema>;

/** «40 000» (с любыми пробелами) → 40000. `undefined` — это не целое число. */
export function parseUnits(raw: string): number | undefined {
  const digits = raw.replace(/[\s\u00a0]/gu, "");
  if (!/^\d+$/.test(digits)) return undefined;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : undefined;
}

const MAX_UNITS = 10_000_000;

/* Мощность завода — шаг онбординга. Поля остаются строками: в макете там «40 000»
   с разделителем разрядов, и превращать ввод в число раньше времени — значит терять
   то, что человек видит. Эндпоинта под эти данные у бэка нет (см. отчёт). */
export const capacitySchema = z
  .object({
    monthly: z.string().trim().min(1, "Укажите мощность"),
    busy: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    const monthly = parseUnits(value.monthly);
    if (monthly === undefined || monthly === 0 || monthly > MAX_UNITS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["monthly"],
        message: "Целое число условных единиц, больше нуля",
      });
      return;
    }
    if (value.busy.length === 0) return;
    const busy = parseUnits(value.busy);
    if (busy === undefined || busy > MAX_UNITS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["busy"],
        message: "Целое число условных единиц",
      });
      return;
    }
    if (busy > monthly) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["busy"],
        message: "Занято не может быть больше мощности",
      });
    }
  });

export type CapacityForm = z.infer<typeof capacitySchema>;
