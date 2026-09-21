import type { Kopecks } from "./common";

/* Домен «Котировки» — `POST /quotes` (ARCHITECTURE.md, 5.5).

   Считает сервер: котировка уходит в спецификацию и в эскроу, поэтому браузер не
   присылает ни цен, ни процентов скидок — только выбор покупателя. Фронтовый мок
   (`shared/lib/quote.ts`) повторяет те же правила, чтобы экран работал без бэка.

   Порядок строк фиксирован конвейером правил:
   база по ступени → опции → скидка за повтор → скидка на недозагруз → промокод → доставка.
   Скидки — отрицательные суммы, поэтому `sum(lines) === total`. */

export type QuoteLineKind =
  "base" | "option" | "repeat_discount" | "underload_discount" | "promo" | "delivery";

export interface QuoteLine {
  kind: QuoteLineKind;
  /** Текст для человека, как его сформировал сервер. Форматирование денег — на фронте. */
  title: string;
  /** Скидки приходят отрицательными. */
  amount: Kopecks;
}

/** Результат котировки. Инвариант: `sum(lines) === total === subtotal − discountTotal + delivery`. */
export interface Quote {
  lines: QuoteLine[];
  /** Цена за штуку по выбранной ступени — без опций и скидок. */
  unitPrice: Kopecks;
  /** Стоимость товара: база + опции, до скидок и без доставки. */
  subtotal: Kopecks;
  /** Суммарная скидка — неотрицательная (в строках она же со знаком минус). */
  discountTotal: Kopecks;
  delivery: Kopecks;
  total: Kopecks;
  /** id сохранённой котировки: в заказ уходит только он. Мок его не выдаёт. */
  id?: string;
  /** Срок производства, рабочих дней — считает сервер по календарю и мощности. */
  leadDays?: number;
  /** Дата отгрузки, ISO `YYYY-MM-DD`. */
  shipDate?: string;
  /** До какого момента котировка действительна, ISO 8601. */
  validUntil?: string;
}

export interface QuoteRequest {
  offerId: number;
  qty: number;
  /** Коды опций оффера в том порядке, в котором их выбрал покупатель. */
  optionIds: string[];
  /** Код варианта доставки из оффера; пусто — самовывоз, доставка 0. */
  deliveryId?: string;
  /** Повторная партия у той же фабрики: процент скидки подставляет сервер. */
  repeat?: boolean;
  /** Промокод из поля в итоге оформления. Неизвестный или неприменимый код — 422
      с `type = …/quote/unknown_promo`: экран показывает ошибку в самом поле и
      оставляет прежний расчёт, а не обнуляет весь итог. */
  promo?: string;
}
