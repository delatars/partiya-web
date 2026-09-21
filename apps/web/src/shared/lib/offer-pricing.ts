import type { SellerOfferOptionInput, SellerPriceTierInput } from "@partiya/api-contracts";

/* Проверка ступеней и опций предложения — зеркало `crates/pricing/src/lib.rs::validate_offer`
   (Q-127: «та же валидация нужна в редакторе SKU завода»).

   Зачем копия на фронте: показать ошибку в той строке таблицы, где она сделана, ещё до
   запроса. Решает всё равно сервер — он же отвергнет оффер при расчёте котировки; эта
   функция только избавляет от круга «отправил → 422 → ищи, где».

   Порядок правил ровно тот же, что в Rust:

     moq == 0                      → ZeroMoq
     tiers пуст                    → EmptyTiers
     tiers[0].fromQty > moq        → FirstTierAboveMoq
     fromQty не строго растёт      → UnsortedTiers
     unitPrice растёт              → IncreasingTierPrice
     unitPrice < 0                 → NegativeAmount
     price опции < 0               → NegativeAmount

   Ключи ошибок — пути полей формы (`tiers.1.fromQty`), как в `ProblemDetails.errors` у
   бэка: по ним и форма, и мок подсвечивают строку. */

export interface OfferPricingInput {
  moq: number;
  tiers: readonly SellerPriceTierInput[];
  options?: readonly SellerOfferOptionInput[];
}

/** Ошибки по полям: путь поля → сообщения. Пустой объект — предложение валидно. */
export type OfferPricingErrors = Record<string, string[]>;

function add(errors: OfferPricingErrors, field: string, message: string): void {
  (errors[field] ??= []).push(message);
}

export function validateOfferPricing(input: OfferPricingInput): OfferPricingErrors {
  const errors: OfferPricingErrors = {};
  const { moq, tiers } = input;

  if (!Number.isFinite(moq) || moq <= 0) {
    add(errors, "moq", "Минимальная партия должна быть больше нуля");
  }

  if (tiers.length === 0) {
    add(errors, "tiers", "Добавьте хотя бы одну ступень цены");
    return errors;
  }

  const first = tiers[0];
  if (first && Number.isFinite(moq) && moq > 0 && first.fromQty > moq) {
    add(
      errors,
      "tiers.0.fromQty",
      `Первая ступень (${String(first.fromQty)} шт) выше MOQ (${String(moq)} шт) — до MOQ цену считать нечем`,
    );
  }

  for (let index = 1; index < tiers.length; index += 1) {
    const previous = tiers[index - 1];
    const current = tiers[index];
    if (!previous || !current) continue;
    if (current.fromQty <= previous.fromQty) {
      add(
        errors,
        `tiers.${String(index)}.fromQty`,
        `Объём ступени должен строго расти: ${String(current.fromQty)} после ${String(previous.fromQty)}`,
      );
    }
    if (current.unitPrice > previous.unitPrice) {
      add(
        errors,
        `tiers.${String(index)}.unitPrice`,
        "Цена на большем объёме не может быть выше, чем на меньшем",
      );
    }
  }

  tiers.forEach((tier, index) => {
    if (tier.unitPrice < 0) {
      add(errors, `tiers.${String(index)}.unitPrice`, "Цена не может быть отрицательной");
    }
    if (tier.fromQty <= 0) {
      add(errors, `tiers.${String(index)}.fromQty`, "Объём ступени должен быть больше нуля");
    }
  });

  (input.options ?? []).forEach((option, index) => {
    if (option.price < 0) {
      add(errors, `options.${String(index)}.price`, "Цена опции не может быть отрицательной");
    }
    if (option.title.trim().length === 0) {
      add(errors, `options.${String(index)}.title`, "Назовите опцию");
    }
  });

  return errors;
}

/** Есть ли хоть одна ошибка — короткая форма для `if`. */
export function hasPricingErrors(errors: OfferPricingErrors): boolean {
  return Object.keys(errors).length > 0;
}
