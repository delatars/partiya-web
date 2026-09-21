import type {
  Kopecks,
  OfferDetail,
  SampleDeliveryOption,
  SampleOptions,
} from "@partiya/api-contracts";

import { ARTWORK_LIMITS } from "./artwork";

/* Справочник формы образца для моков — дословно из макета `sample`.

   ⚠ Q-13 и Q-133 открыты. Допущения, на которых собран этот файл:

   * цена образца — 1 500 ₽ за ЗАКАЗ (1–3 шт), а не за штуку: в макете «Образец × 2»
     стоит 1 500 ₽, и итог 1 920 ₽ сходится только так;
   * печать в цену образца включена — все варианты по 0 ₽;
   * образец не идёт через эскроу: карта или счёт на юрлицо;
   * зачёт стоимости в первую партию — 60 дней у той же фабрики.

   Когда Q-13 закроют, меняется этот файл и `samples.ts` в контрактах — экран не трогается. */

const rub = (value: number): Kopecks => value * 100;

/** Доставка образца — своя, не `OfferDetail.delivery[]`: образец едет службой, а не паллетой. */
export const SAMPLE_DELIVERY: readonly SampleDeliveryOption[] = [
  {
    id: "cdek-pvz",
    title: "СДЭК до пункта выдачи",
    price: rub(420),
    note: "2–3 дня после отгрузки",
    days: 3,
  },
  { id: "courier", title: "Курьером до двери", price: rub(780), note: null, days: 2 },
];

/** Виды нанесения на образце. Цена нулевая: печать входит в стоимость образца. */
export const SAMPLE_PRINT_PRICES: readonly { value: string; price: Kopecks }[] = [
  { value: "Шелкография 2 цв.", price: 0 },
  { value: "DTF", price: 0 },
  { value: "Без печати", price: 0 },
];

const COLORS = ["белый", "чёрный", "графит", "синий", "бежевый"];
const SIZES = ["S", "M", "L", "XL"];

/** Сколько дней действует зачёт стоимости образца в первую партию. */
const CREDIT_DAYS = 60;

export function sampleOptionsFor(offer: OfferDetail): SampleOptions {
  const sample = offer.sample ?? { price: rub(1_500), days: 5 };
  return {
    price: sample.price,
    leadDays: sample.days,
    qtyChoices: [1, 2, 3],
    sizeChoices: SIZES,
    colorChoices: COLORS,
    printChoices: [...SAMPLE_PRINT_PRICES],
    delivery: [...SAMPLE_DELIVERY],
    credit: { amount: sample.price, days: CREDIT_DAYS },
    artwork: ARTWORK_LIMITS,
  };
}
