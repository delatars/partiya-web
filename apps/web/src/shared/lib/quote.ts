import type {
  Kopecks,
  OfferDetail,
  OfferOption,
  PriceTier,
  Quote,
  QuoteLine,
  QuoteRequest,
} from "@partiya/api-contracts";

/* Зеркало движка котировок бэка (`partiya-api/crates/pricing`, ARCHITECTURE.md 5.5).

   Зачем оно на фронте. Авторитетен сервер: `POST /quotes` сохраняет котировку с
   `valid_until`, и в заказ уходит только её id. Но пока бэка нет, калькулятор карточки
   должен считать сам — и считать ТЕМИ ЖЕ правилами, иначе на переключении с моков
   поедут цифры. Поэтому здесь буквальный перевод `pricing::quote`: тот же порядок
   правил, те же тексты строк, то же округление и то же урезание скидок.

   Конвейер (порядок фиксирован, каждое правило добавляет строки):
   база по ступени → опции (за шт / за партию) → скидка за повтор → скидка на недозагруз
   → промокод → доставка → итог.

   ⚠ Промокода в крейте `pricing` ещё нет — правило описано только в ARCHITECTURE.md 5.5.
   Здесь оно реализовано так, как его ждёт экран оформления: процент от стоимости товара
   через тот же бюджет скидок. Бэку это место придётся повторить (см. отчёт, Q-C4).

   Скидки — отрицательные суммы, поэтому `sum(lines) === total`; «Итого» отдельной
   строкой не является. Деньги — только целые копейки.

   Файл лежит в shared, а не в модуле карточки: по этим же правилам страница сравнения
   считает строку «Партия 1 000 шт с доставкой». */

/** Потолок суммарной скидки, % (QUESTIONS.md, Q-05). Превышение урезается, а не отвергается. */
export const MAX_TOTAL_DISCOUNT_PERCENT = 30;

export type QuoteErrorCode =
  | "zero_moq"
  | "empty_tiers"
  | "unsorted_tiers"
  | "increasing_tier_price"
  | "first_tier_above_moq"
  | "negative_amount"
  | "below_moq"
  | "unknown_option"
  | "duplicate_option"
  | "percent_out_of_range"
  | "overflow";

/** Ошибка входа котировки. Внутренних сбоев у чистой функции нет — все ошибки про вход. */
export class QuoteCalcError extends Error {
  readonly code: QuoteErrorCode;

  constructor(code: QuoteErrorCode, message: string) {
    super(message);
    this.name = "QuoteCalcError";
    this.code = code;
  }
}

export function isQuoteCalcError(error: unknown): error is QuoteCalcError {
  return error instanceof QuoteCalcError;
}

/** Ценовая часть оффера — ровно то, что нужно движку. Ни сроков, ни мощности. */
export interface QuotePricing {
  moq: number;
  tiers: readonly PriceTier[];
  options: readonly OfferOption[];
}

export interface QuoteDelivery {
  /** Текст строки котировки; по умолчанию — «Доставка», как у бэка. */
  title?: string;
  amount: Kopecks;
}

/** Промокод, уже проверенный сервером: браузер процентов не выбирает. */
export interface QuotePromo {
  /** Код в том виде, в каком его ввели: он попадёт в строку котировки. */
  code: string;
  /** Скидка, %. Идёт через общий бюджет скидок наравне с повтором и недозагрузом. */
  percent: number;
}

export interface QuoteCalcInput {
  offer: QuotePricing;
  qty: number;
  /** Коды опций в порядке выбора — в этом же порядке они попадут в строки. */
  optionIds?: readonly string[];
  /** Скидка за повторный заказ у той же фабрики, %. */
  repeatDiscountPercent?: number;
  /** Скидка за загрузку простаивающей мощности, %. */
  underloadDiscountPercent?: number;
  /** Промокод, проверенный сервером; неизвестный код сюда не доходит. */
  promo?: QuotePromo;
  delivery?: QuoteDelivery;
}

/** Доля суммы в процентах с округлением до копейки «от половины вверх» (`Money::percent`). */
export function percentOf(amount: Kopecks, percent: number): Kopecks {
  if (percent < 0 || percent > 100) {
    throw new QuoteCalcError(
      "percent_out_of_range",
      `Процент вне диапазона 0..=100: ${String(percent)}`,
    );
  }
  return Math.floor((amount * percent + 50) / 100);
}

/** Ступень для объёма: последняя, чей `fromQty` не выше `qty`. */
export function tierFor(tiers: readonly PriceTier[], qty: number): PriceTier | undefined {
  let found: PriceTier | undefined;
  for (const tier of tiers) {
    if (tier.fromQty <= qty) found = tier;
  }
  return found;
}

/** Следующая ступень после текущего объёма — на ней цена упадёт. */
export function nextTier(tiers: readonly PriceTier[], qty: number): PriceTier | undefined {
  return tiers.find((tier) => tier.fromQty > qty);
}

/** Подсказка «до следующей ступени N шт — цена упадёт до X». */
export interface NextTierHint {
  /** Сколько штук осталось добрать. */
  qtyLeft: number;
  fromQty: number;
  unitPrice: Kopecks;
}

export function nextTierHint(tiers: readonly PriceTier[], qty: number): NextTierHint | undefined {
  const next = nextTier(tiers, qty);
  const current = tierFor(tiers, qty);
  // подсказку показываем, только если цена действительно падает
  if (!next || (current && next.unitPrice >= current.unitPrice)) return undefined;
  return { qtyLeft: next.fromQty - qty, fromQty: next.fromQty, unitPrice: next.unitPrice };
}

/** Считает котировку по офферу и параметрам партии. Бросает `QuoteCalcError`. */
export function calculateQuote(input: QuoteCalcInput): Quote {
  const { offer, qty } = input;
  validateOffer(offer);

  const delivery = input.delivery?.amount ?? 0;
  if (delivery < 0) {
    throw new QuoteCalcError("negative_amount", "Отрицательная сумма в поле «delivery»");
  }
  if (!Number.isInteger(qty) || qty < offer.moq) {
    throw new QuoteCalcError(
      "below_moq",
      `Количество ${String(qty)} шт меньше минимальной партии ${String(offer.moq)} шт`,
    );
  }

  const lines: QuoteLine[] = [];

  // 1. Базовая цена по ступени.
  const tier = tierFor(offer.tiers, qty);
  if (!tier) {
    throw new QuoteCalcError(
      "below_moq",
      `Количество ${String(qty)} шт меньше минимальной партии ${String(offer.moq)} шт`,
    );
  }
  const base = checked(tier.unitPrice * qty);
  lines.push({ kind: "base", title: `Партия ${String(qty)} шт`, amount: base });

  // 2. Опции — в порядке, в котором их выбрал покупатель.
  let goods = base;
  const seen = new Set<string>();
  for (const id of input.optionIds ?? []) {
    if (seen.has(id)) {
      throw new QuoteCalcError("duplicate_option", `Опция указана дважды: ${id}`);
    }
    seen.add(id);
    const option = offer.options.find((item) => item.id === id);
    if (!option) {
      throw new QuoteCalcError("unknown_option", `Неизвестная опция: ${id}`);
    }
    const amount = option.unit === "per_item" ? checked(option.price * qty) : option.price;
    goods = checked(goods + amount);
    lines.push({ kind: "option", title: option.title, amount });
  }

  // 3–5. Скидки — от стоимости товара, нарастающим итогом, в пределах бюджета.
  const budget = new DiscountBudget(goods);
  budget.apply("repeat_discount", "Скидка за повтор", input.repeatDiscountPercent, lines);
  budget.apply("underload_discount", "Скидка на недозагруз", input.underloadDiscountPercent, lines);
  if (input.promo) {
    budget.apply("promo", `Промокод ${input.promo.code}`, input.promo.percent, lines);
  }

  // 6. Доставка — после скидок, скидки её не касаются.
  lines.push({ kind: "delivery", title: input.delivery?.title ?? "Доставка", amount: delivery });

  return {
    lines,
    unitPrice: tier.unitPrice,
    subtotal: goods,
    discountTotal: budget.appliedAmount,
    delivery,
    total: checked(goods - budget.appliedAmount + delivery),
  };
}

/* ------------------------------------------------------------------ выбор покупателя */

/** Опции, которые нельзя выбрать на этом объёме (например, свой Pantone от 1 000 шт). */
export function isOptionAvailable(option: { minQty?: number }, qty: number): boolean {
  return option.minQty === undefined || qty >= option.minQty;
}

/** Выбор покупателя в калькуляторе — вход и карточки, и оформления. */
export interface QuoteSelection {
  qty: number;
  /** Коды опций в порядке выбора: он же порядок строк котировки. */
  optionIds: readonly string[];
  deliveryId?: string;
  repeat?: boolean;
  promo?: string;
}

/** Выбор покупателя + оффер → тело `POST /quotes`.
 *
 * Недоступные на текущем объёме опции отсеиваются здесь, а не в компоненте: иначе
 * ссылка с `?qty=500&options=own-pantone` уходила бы на сервер заведомо невалидной.
 * Живёт в shared, потому что тело котировки собирают и карточка, и оформление,
 * а кросс-модульных импортов правила слоёв не допускают. */
export function buildQuoteRequest(
  offer: Pick<OfferDetail, "id" | "moq" | "options" | "delivery">,
  selection: QuoteSelection,
): QuoteRequest {
  const qty = Math.max(offer.moq, Math.trunc(selection.qty));
  const available = new Set(
    offer.options.filter((option) => isOptionAvailable(option, qty)).map((option) => option.id),
  );
  const deliveryId =
    selection.deliveryId !== undefined &&
    offer.delivery.some((option) => option.id === selection.deliveryId)
      ? selection.deliveryId
      : offer.delivery[0]?.id;

  return {
    offerId: offer.id,
    qty,
    optionIds: selection.optionIds.filter((id) => available.has(id)),
    deliveryId,
    repeat: selection.repeat === true ? true : undefined,
    promo: selection.promo,
  };
}

/* ------------------------------------------------------------------ внутреннее */

/** Бюджет скидок: сумма процентов не переваливает за потолок, лишнее молча урезается. */
class DiscountBudget {
  appliedAmount = 0;
  private appliedPercent = 0;

  constructor(private readonly goods: Kopecks) {}

  apply(
    kind: "repeat_discount" | "underload_discount" | "promo",
    title: string,
    percent: number | undefined,
    lines: QuoteLine[],
  ): void {
    if (percent === undefined) return;
    if (percent < 0 || percent > 100) {
      throw new QuoteCalcError(
        "percent_out_of_range",
        `Процент скидки «${title}» вне диапазона 0..=100: ${String(percent)}`,
      );
    }
    const effective = Math.min(
      percent,
      Math.max(0, MAX_TOTAL_DISCOUNT_PERCENT - this.appliedPercent),
    );
    if (effective === 0) return;

    // нарастающий итог: округляем один раз от суммарного процента, строка — дельта
    const cumulative = percentOf(this.goods, this.appliedPercent + effective);
    const amount = cumulative - this.appliedAmount;
    this.appliedPercent += effective;
    this.appliedAmount = cumulative;

    lines.push({ kind, title: `${title} −${String(effective)} %`, amount: -amount });
  }
}

function validateOffer(offer: QuotePricing): void {
  if (offer.moq === 0) {
    throw new QuoteCalcError("zero_moq", "MOQ оффера должен быть не меньше 1 шт");
  }
  const first = offer.tiers[0];
  if (!first) {
    throw new QuoteCalcError("empty_tiers", "У оффера нет ни одной ценовой ступени");
  }
  if (first.fromQty > offer.moq) {
    throw new QuoteCalcError(
      "first_tier_above_moq",
      `Первая ступень начинается с ${String(first.fromQty)} шт — это выше MOQ ${String(offer.moq)} шт`,
    );
  }
  for (let index = 1; index < offer.tiers.length; index += 1) {
    const previous = offer.tiers[index - 1];
    const current = offer.tiers[index];
    if (!previous || !current) continue;
    if (current.fromQty <= previous.fromQty) {
      throw new QuoteCalcError(
        "unsorted_tiers",
        `Ступени не упорядочены по возрастанию: ${String(previous.fromQty)} → ${String(current.fromQty)}`,
      );
    }
    if (current.unitPrice > previous.unitPrice) {
      throw new QuoteCalcError(
        "increasing_tier_price",
        `Цена ступени от ${String(current.fromQty)} шт выше предыдущей: цена не может расти с объёмом`,
      );
    }
  }
  for (const tier of offer.tiers) {
    if (tier.unitPrice < 0) {
      throw new QuoteCalcError("negative_amount", "Отрицательная сумма в поле «tier.unitPrice»");
    }
  }
  for (const option of offer.options) {
    if (option.price < 0) {
      const field = option.unit === "per_item" ? "option.perItem" : "option.perBatch";
      throw new QuoteCalcError("negative_amount", `Отрицательная сумма в поле «${field}»`);
    }
  }
}

/** Мирроринг checked-арифметики бэка: за пределами безопасного целого считать нельзя. */
function checked(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new QuoteCalcError("overflow", "Переполнение при операции с деньгами");
  }
  return value;
}
