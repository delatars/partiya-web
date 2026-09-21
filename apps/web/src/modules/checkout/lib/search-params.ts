import { z } from "zod";

/* Адрес оформления: `/order/new?offer=2231&qty=1000&options=…&delivery=wb&draft=4813`.

   Что здесь делает каждый параметр:

   * `offer`, `qty`, `options`, `delivery`, `repeat` — расчёт, с которым человек пришёл
     с карточки. Они же уходят в `POST /quotes`, поэтому ссылка воспроизводит цену;
   * `promo` — применённый промокод: он часть котировки, а не отдельная скидка;
   * `draft` — номер черновика на сервере. Появляется в адресе сразу после создания,
     поэтому возврат на страницу (и вообще открытие адреса заново) продолжает начатое
     оформление, а не заводит второй черновик.

   Значения по умолчанию в URL не пишутся — они выражены отсутствием параметра. */

/** Роутер приводит «1000» к числу — строковые поля принимают и то и другое. */
const text = z
  .preprocess((value) => (typeof value === "number" ? String(value) : value), z.string().min(1))
  .optional()
  .catch(undefined);

const positiveInt = z.coerce.number().int().positive().optional().catch(undefined);

const flag = z
  .union([z.boolean(), z.literal("1"), z.literal("true")])
  .transform((value) => value === true || value === "1" || value === "true")
  .optional()
  .catch(undefined);

export const checkoutSearchSchema = z.object({
  offer: positiveInt,
  qty: positiveInt,
  options: text,
  delivery: text,
  repeat: flag,
  promo: text,
  draft: positiveInt,
});

export type CheckoutSearch = z.infer<typeof checkoutSearchSchema>;

export function parseCheckoutSearch(input: Record<string, unknown>): CheckoutSearch {
  return checkoutSearchSchema.parse(input);
}

export const sampleSearchSchema = z.object({ offer: positiveInt });

export type SampleSearch = z.infer<typeof sampleSearchSchema>;

export function parseSampleSearch(input: Record<string, unknown>): SampleSearch {
  return sampleSearchSchema.parse(input);
}

/** Выбранные опции в порядке, в котором они попали в URL, — он же порядок строк котировки. */
export function selectedOptionIds(search: CheckoutSearch): string[] {
  return (search.options ?? "").split(",").filter(Boolean);
}

/** Адрес с изменённым расчётом: объём, опции, доставка и промокод живут в URL, поэтому
    «назад» возвращает предыдущую цену, а ссылку можно переслать коллеге. */
export function withCheckoutPatch(
  search: CheckoutSearch,
  patch: Partial<CheckoutSearch>,
): CheckoutSearch {
  return { ...search, ...patch };
}

export function withCheckoutOption(
  search: CheckoutSearch,
  id: string,
  on: boolean,
): CheckoutSearch {
  const current = selectedOptionIds(search);
  const next = on ? [...new Set([...current, id])] : current.filter((item) => item !== id);
  return { ...search, options: next.length > 0 ? next.join(",") : undefined };
}
