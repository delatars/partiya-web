import type {
  DeliveryOption,
  OfferDetail,
  OfferImage,
  OfferOption,
  OfferQuestion,
  OfferReview,
  OfferSpecRow,
  OfferSummary,
} from "@partiya/api-contracts";

import { FACTORIES, FACTORY_KEYS, toFactoryBrief } from "./factories";
import type { FactoryKey } from "./factories";
import {
  FACTORY_KEY_BY_OFFER,
  OFFER_BY_ID,
  OFFERS,
  offersOfFactory,
  REPEAT_DISCOUNT_PERCENT,
  UNDERLOAD_DISCOUNT_PERCENT,
} from "./offers";

/* Детальные данные карточки. Генерируются из фикстур выдачи, чтобы id и цены
   не разъезжались с каталогом; у сквозного примера 2231 всё взято из макета дословно
   (mockups/lenta/data.js → offerDetail). */

/** Опции оффера — те же три, что в макете; коды совпадают с тестами крейта pricing. */
const OPTIONS: OfferOption[] = [
  {
    id: "extra-print-color",
    title: "Доп. цвет принта",
    unit: "per_batch",
    price: 600_000,
    note: "за партию",
  },
  {
    id: "own-pantone",
    title: "Свой Pantone ткани",
    unit: "per_batch",
    price: 1_800_000,
    note: "от 1 000 шт",
    minQty: 1000,
  },
  {
    id: "embroidery",
    title: "Вышивка вместо принта",
    unit: "per_item",
    price: 2_200,
    note: "за шт",
  },
];

/* Варианты доставки. Скидки на доставку не действуют (QUESTIONS.md, Q-05).

   Первый в списке выбран по умолчанию, и это отгрузка на склад маркетплейса, а не
   самовывоз: так считает макет («Доставка до склада WB · 9 400 ₽» в итоге 183 400 ₽),
   и так честнее — большинство заказчиков везут партию не к себе. */
const DELIVERY: DeliveryOption[] = [
  {
    id: "wb",
    title: "Доставка до склада WB",
    price: 940_000,
    days: 3,
    note: "WB / Ozon, паллетная отгрузка",
  },
  {
    id: "address",
    title: "Доставка до адреса, Москва",
    price: 1_280_000,
    days: 4,
    note: "до дверей, разгрузка отдельно",
  },
  { id: "pickup", title: "Самовывоз с фабрики", price: 0, days: 0, note: "своим транспортом" },
];

/** Вариант доставки по умолчанию: он же стоит в сквозном примере на 183 400 ₽. */
export const DEFAULT_DELIVERY_ID = "wb";

const IMAGE_LABELS = [
  "фото 1 · лицевая",
  "фото 2 · спинка",
  "фото 3 · ткань вблизи",
  "фото 4 · печать",
  "фото 5 · упаковка",
];

/** Порядок оттенков заглушек из макета: главная — в тоне оффера, остальные чередуются. */
const THUMB_TONES = ["a", "c", "b", "d"] as const;

function imagesFor(offer: OfferSummary): OfferImage[] {
  const main = offer.tone ?? "a";
  return IMAGE_LABELS.map((label, index) => ({
    id: `${String(offer.id)}-${String(index + 1)}`,
    label,
    tone: index === 0 ? main : (THUMB_TONES[index % THUMB_TONES.length] ?? "a"),
  }));
}

/** Характеристики сквозного примера — дословно из макета. */
const SPECS_2231: OfferSpecRow[] = [
  { name: "Материал", value: "Кулирная гладь, хлопок 100 %, 180 г/м²" },
  { name: "Крой", value: "классический / оверсайз / женский приталенный" },
  { name: "Размеры", value: "XS–3XL, сетка по ГОСТ или по вашей" },
  { name: "Цвета", value: "14 базовых в наличии, окраска в свой Pantone от 1 000 шт" },
  { name: "Печать", value: "шелкография до 6 цветов, DTF, вышивка до 10 000 стежков" },
  { name: "Маркировка", value: "вшивная бирка, навесной ярлык, «Честный знак» — включено" },
  { name: "Упаковка", value: "индивидуальный пакет, короб 50 шт" },
];

function specsFor(offer: OfferSummary): OfferSpecRow[] {
  if (offer.id === 2231) return SPECS_2231;
  return [
    { name: "Материал", value: offer.material ?? "уточняется у технолога" },
    { name: "Крой", value: "классический / оверсайз, лекала фабрики или ваши" },
    { name: "Размеры", value: "XS–3XL, сетка по ГОСТ или по вашей" },
    { name: "Цвета", value: "базовая палитра фабрики, свой Pantone — от 1 000 шт" },
    { name: "Печать", value: "шелкография, DTF, вышивка" },
    { name: "Маркировка", value: "вшивная бирка, навесной ярлык, «Честный знак» — включено" },
    { name: "Упаковка", value: "индивидуальный пакет, короб 50 шт" },
  ];
}

/** Оффер карточки по id. `undefined` — такого предложения нет (экран 404). */
export function offerDetail(id: number): OfferDetail | undefined {
  const offer = OFFER_BY_ID.get(id);
  if (!offer) return undefined;

  const factoryKey = FACTORY_KEY_BY_OFFER.get(id);
  const factory = factoryKey ? FACTORIES[factoryKey] : undefined;
  const underload = offer.badges.includes("underload");

  return {
    ...offer,
    images: imagesFor(offer),
    tiers: offer.tiers ?? [],
    leadDaysMax: offer.leadDaysMin + 4,
    specs: specsFor(offer),
    options: OPTIONS,
    delivery: DELIVERY,
    factory: factory ? toFactoryBrief(factory) : offer.factory,
    article: String(offer.id),
    capacityNote: `${String(offer.freeCapacityPct)} % мощности · ближайший запуск 22.09`,
    acceptanceNote: "5 раб. дней, выборка 5 % по ГОСТ",
    repeatDiscountPercent: REPEAT_DISCOUNT_PERCENT,
    underloadDiscountPercent: underload ? UNDERLOAD_DISCOUNT_PERCENT : undefined,
    questionCount: questionsOf(id).length,
    factoryOffersCount: offersOfFactory(offer.factory.id).length,
  };
}

/** Похожие: тот же путь категории, кроме самого оффера. */
export function similarOffers(id: number, limit = 6): OfferSummary[] {
  const offer = OFFER_BY_ID.get(id);
  if (!offer) return [];
  const path = (offer.categoryPath ?? []).join("/");
  return OFFERS.filter(
    (item) => item.id !== id && (item.categoryPath ?? []).join("/") === path,
  ).slice(0, limit);
}

/* ------------------------------------------------------------------ вопросы и отзывы */

const QUESTIONS_2231: OfferQuestion[] = [
  {
    id: 1,
    text: "Можно свой Pantone на 500 шт?",
    author: "ООО «Кора», Москва",
    askedAt: "2026-08-14",
    answer: {
      text: "От 1 000 шт — окраска ткани в свой цвет, на 500 подберём ближайший из 14 базовых.",
      author: "Технолог «Волна»",
      answeredAt: "2026-08-14",
    },
  },
  {
    id: 2,
    text: "Усадка после стирки?",
    author: "ИП Сафонов, Казань",
    askedAt: "2026-07-30",
    answer: {
      text: "До 3 % по длине, ткань предварительно декатирована. Отчёт по ГОСТ в документах.",
      author: "Технолог «Волна»",
      answeredAt: "2026-07-31",
    },
  },
  {
    id: 3,
    text: "Успеете отгрузить до 20 октября, если макет согласуем на этой неделе?",
    author: "«ЭкоДом», Тверь",
    askedAt: "2026-09-15",
  },
];

export function questionsOf(offerId: number): OfferQuestion[] {
  if (offerId === 2231) return QUESTIONS_2231;
  const offer = OFFER_BY_ID.get(offerId);
  if (!offer) return [];
  return [
    {
      id: offerId * 10 + 1,
      text: "Какая минимальная партия на один цвет?",
      author: "ИП Лебедева, Иваново",
      askedAt: "2026-08-22",
      answer: {
        text: `Делим партию на цвета без доплаты, минимум ${String(Math.max(50, Math.round(offer.moq / 5)))} шт на цвет.`,
        author: `Технолог «${offer.factory.name}»`,
        answeredAt: "2026-08-23",
      },
    },
  ];
}

const REVIEWS_2231: OfferReview[] = [
  {
    id: 1,
    author: "ООО «Кора», Москва",
    when: "август 2026",
    rating: 5,
    text: "Вторая партия подряд — плотность держат, принт без сдвига. Отгрузили на 2 дня раньше плана.",
    orderId: 4601,
  },
  {
    id: 2,
    author: "ИП Лебедева, Иваново",
    when: "июль 2026",
    rating: 4,
    text: "На 500 шт был перекос по размерной сетке, фабрика допечатала за свой счёт через эскроу-спор.",
  },
];

/** Тексты отзывов-заглушек: у каждого оффера свой, иначе витрина завода
    показывает один и тот же отзыв несколько раз подряд. */
const REVIEW_TEXTS = [
  "Партия пришла в срок, качество соответствует образцу. Фотоотчёты присылали каждые два дня.",
  "Брали пробные 300 шт, потом основную партию — отличий нет, лекала сохранили.",
  "Технолог сам предложил заменить ткань на более плотную в том же бюджете.",
  "Небольшая задержка на печати, предупредили заранее и компенсировали доставку.",
  "Маркировку «Честный знак» сделали сами, нам осталось только принять партию.",
];

const REVIEW_AUTHORS = [
  "ООО «Кора», Москва",
  "ИП Сафонов, Казань",
  "«ЭкоДом», Тверь",
  "ООО «Смена», Екатеринбург",
  "ИП Лебедева, Иваново",
];

const REVIEW_MONTHS = ["август 2026", "июль 2026", "июнь 2026", "май 2026", "апрель 2026"];

export function reviewsOf(offerId: number): OfferReview[] {
  if (offerId === 2231) return REVIEWS_2231;
  const offer = OFFER_BY_ID.get(offerId);
  if (!offer) return [];
  const slot = offerId % REVIEW_TEXTS.length;
  return [
    {
      id: offerId * 10 + 1,
      author: REVIEW_AUTHORS[slot] ?? "ООО «Кора», Москва",
      when: REVIEW_MONTHS[slot] ?? "август 2026",
      rating: offer.factory.rating >= 4.7 ? 5 : 4,
      text: REVIEW_TEXTS[slot] ?? "",
    },
  ];
}

/** Отзывы о заводе — объединение отзывов по всем его предложениям. */
export function factoryReviews(factoryId: number) {
  return offersOfFactory(factoryId)
    .flatMap((offer) => reviewsOf(offer.id))
    .slice(0, 6);
}

/** Сколько предложений у каждого завода — число для списка заводов. */
export const OFFERS_COUNT_BY_FACTORY = new Map<FactoryKey, number>(
  FACTORY_KEYS.map((key) => [key, offersOfFactory(FACTORIES[key].id).length]),
);
