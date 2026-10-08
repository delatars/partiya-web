import type { OfferSummary } from "@partiya/api-contracts";

/* Фикстуры каталога — расширение mockups/lenta/data.js до объёма, на котором видно
   работу фасетов, сортировок и пагинации. Цены в фикстуре — рубли за штуку на верхней
   ступени; наружу уходят копейки.

   Лежат в shared: тот же список офферов нужен каталогу, карточке («Похожие»), витрине
   завода и странице сравнения, а кросс-модульных импортов правила слоёв не допускают. */

import type { FactoryKey } from "./factories";
import { FACTORIES, toFactoryBrief } from "./factories";

/** Ключи материалов совпадают со значениями фасета «Материал». */
export const MATERIALS = {
  cotton: "хлопок 100 %, кулирка 180 г/м²",
  futer: "футер 3-нитка с начёсом",
  pique: "пике хлопок/лайкра",
  dvunitka: "двунитка 240 г/м²",
  other: "смесовая ткань",
} as const;

type MaterialKey = keyof typeof MATERIALS;

interface OfferFixture {
  id: number;
  title: string;
  /** Рубли за штуку на верхней ступени (от 3 000 шт). */
  price: number;
  moq: number;
  lead: number;
  /** Свободная мощность в сентябре, %. */
  free: number;
  factory: FactoryKey;
  material: MaterialKey;
  tone: "a" | "b" | "c" | "d";
  category: string[];
  sample?: boolean;
  hit?: boolean;
}

const TEXTILE = ["tekstil", "futbolki"];
const BAGS = ["tekstil", "sumki"];

const FIXTURES: OfferFixture[] = [
  {
    id: 2231,
    title: "Футболки 180 г/м² под СТМ",
    price: 135,
    moq: 500,
    lead: 14,
    free: 38,
    factory: "volna",
    material: "cotton",
    tone: "a",
    category: TEXTILE,
    sample: true,
    hit: true,
  },
  {
    id: 2204,
    title: "Худи оверсайз, футер 330 г/м²",
    price: 690,
    moq: 300,
    lead: 14,
    free: 22,
    factory: "tkan",
    material: "futer",
    tone: "b",
    category: TEXTILE,
  },
  {
    id: 2144,
    title: "Поло пике 210 г/м², вышивка",
    price: 420,
    moq: 300,
    lead: 18,
    free: 15,
    factory: "volna",
    material: "pique",
    tone: "a",
    category: TEXTILE,
    sample: true,
  },
  {
    id: 2101,
    title: "Свитшоты, футер 2-нитка 280",
    price: 540,
    moq: 300,
    lead: 21,
    free: 70,
    factory: "meridian",
    material: "futer",
    tone: "b",
    category: TEXTILE,
  },
  {
    id: 2098,
    title: "Лонгсливы 200 г/м², хлопок",
    price: 240,
    moq: 500,
    lead: 16,
    free: 44,
    factory: "volna",
    material: "cotton",
    tone: "a",
    category: TEXTILE,
    sample: true,
  },
  {
    id: 2085,
    title: "Футболки оверсайз 240 г/м²",
    price: 265,
    moq: 200,
    lead: 12,
    free: 52,
    factory: "kama",
    material: "cotton",
    tone: "b",
    category: TEXTILE,
    sample: true,
  },
  {
    id: 2077,
    title: "Худи на молнии, футер 320",
    price: 810,
    moq: 200,
    lead: 20,
    free: 64,
    factory: "volga",
    material: "futer",
    tone: "c",
    category: TEXTILE,
  },
  {
    id: 2064,
    title: "Поло классическое, пике 200",
    price: 385,
    moq: 500,
    lead: 15,
    free: 27,
    factory: "neva",
    material: "pique",
    tone: "d",
    category: TEXTILE,
    sample: true,
  },
  {
    id: 2051,
    title: "Футболки детские 160 г/м²",
    price: 98,
    moq: 1000,
    lead: 14,
    free: 33,
    factory: "poshiv",
    material: "cotton",
    tone: "a",
    category: TEXTILE,
  },
  {
    id: 2043,
    title: "Свитшоты оверсайз, футер 340",
    price: 620,
    moq: 300,
    lead: 22,
    free: 71,
    factory: "uralpro",
    material: "futer",
    tone: "b",
    category: TEXTILE,
    sample: true,
  },
  {
    id: 2037,
    title: "Худи детские, футер 280 г/м²",
    price: 470,
    moq: 200,
    lead: 17,
    free: 41,
    factory: "kama",
    material: "futer",
    tone: "c",
    category: TEXTILE,
  },
  {
    id: 2029,
    title: "Футболки с DTF-печатью",
    price: 176,
    moq: 300,
    lead: 10,
    free: 58,
    factory: "poshiv",
    material: "cotton",
    tone: "d",
    category: TEXTILE,
    sample: true,
  },
  {
    id: 2018,
    title: "Лонгсливы с вышивкой, 220",
    price: 310,
    moq: 500,
    lead: 19,
    free: 12,
    factory: "neva",
    material: "cotton",
    tone: "a",
    category: TEXTILE,
  },
  {
    id: 2007,
    title: "Толстовки без капюшона 300",
    price: 505,
    moq: 500,
    lead: 21,
    free: 66,
    factory: "meridian",
    material: "futer",
    tone: "b",
    category: TEXTILE,
    sample: true,
  },
  {
    id: 1994,
    title: "Футболки премиум, 220 г/м²",
    price: 295,
    moq: 1000,
    lead: 18,
    free: 24,
    factory: "volna",
    material: "cotton",
    tone: "c",
    category: TEXTILE,
  },
  {
    id: 1982,
    title: "Поло женское приталенное",
    price: 440,
    moq: 300,
    lead: 16,
    free: 35,
    factory: "tkan",
    material: "pique",
    tone: "d",
    category: TEXTILE,
    sample: true,
  },
  {
    id: 1970,
    title: "Худи унисекс, петля 300 г/м²",
    price: 655,
    moq: 1000,
    lead: 24,
    free: 18,
    factory: "volga",
    material: "futer",
    tone: "a",
    category: TEXTILE,
  },
  {
    id: 1958,
    title: "Футболки рабочие, двунитка",
    price: 210,
    moq: 2000,
    lead: 20,
    free: 62,
    factory: "uralpro",
    material: "dvunitka",
    tone: "b",
    category: TEXTILE,
    sample: true,
  },
  {
    id: 1947,
    title: "Свитшоты с начёсом, 320 г/м²",
    price: 585,
    moq: 500,
    lead: 21,
    free: 29,
    factory: "pomorye",
    material: "futer",
    tone: "c",
    category: TEXTILE,
  },
  {
    id: 1935,
    title: "Футболки спортивные, смесовка",
    price: 158,
    moq: 1000,
    lead: 13,
    free: 47,
    factory: "kama",
    material: "other",
    tone: "d",
    category: TEXTILE,
    sample: true,
  },
  {
    id: 1923,
    title: "Худи флисовые, 340 г/м²",
    price: 735,
    moq: 200,
    lead: 26,
    free: 55,
    factory: "pomorye",
    material: "futer",
    tone: "a",
    category: TEXTILE,
  },
  {
    id: 1911,
    title: "Поло с логотипом, пике 190",
    price: 355,
    moq: 2000,
    lead: 14,
    free: 21,
    factory: "poshiv",
    material: "pique",
    tone: "b",
    category: TEXTILE,
    sample: true,
  },
  {
    id: 1902,
    title: "Футболки под сублимацию",
    price: 122,
    moq: 3000,
    lead: 11,
    free: 68,
    factory: "volga",
    material: "other",
    tone: "c",
    category: TEXTILE,
  },
  {
    id: 1894,
    title: "Худи на флисе, унисекс 350",
    price: 770,
    moq: 500,
    lead: 23,
    free: 31,
    factory: "neva",
    material: "futer",
    tone: "d",
    category: TEXTILE,
    sample: true,
  },
  {
    id: 1881,
    title: "Лонгсливы термо, 240 г/м²",
    price: 345,
    moq: 300,
    lead: 18,
    free: 49,
    factory: "meridian",
    material: "other",
    tone: "a",
    category: TEXTILE,
  },
  {
    id: 1877,
    title: "Футболки с вышивкой, 200 г/м²",
    price: 228,
    moq: 500,
    lead: 17,
    free: 26,
    factory: "tkan",
    material: "cotton",
    tone: "b",
    category: TEXTILE,
    sample: true,
  },

  {
    id: 2160,
    title: "Шоперы с шелкографией, 38×42",
    price: 96,
    moq: 1000,
    lead: 14,
    free: 45,
    factory: "poshiv",
    material: "dvunitka",
    tone: "d",
    category: BAGS,
    sample: true,
  },
  {
    id: 2155,
    title: "Сумки-мешки на затяжке",
    price: 78,
    moq: 2000,
    lead: 12,
    free: 63,
    factory: "volga",
    material: "dvunitka",
    tone: "c",
    category: BAGS,
  },
];

/** Порог бейджа «−15 % мощность»: завод продаёт недозагруз со скидкой. */
const UNDERLOAD_FROM = 60;

/** Скидка за недозагруз, % — тот же «−15 %», что в бейдже. */
export const UNDERLOAD_DISCOUNT_PERCENT = 15;

/** Скидка за повторную партию у той же фабрики, % — «Повторить партию −9 %» из макета. */
export const REPEAT_DISCOUNT_PERCENT = 9;

/* Лестница ступеней строится от MOQ, а не от фиксированных 500/1 000/3 000: ступени
   обязаны строго расти (иначе движок котировок отвергнет оффер), а MOQ у фикстур доходит
   до 3 000 шт. У сквозного примера 2231 (MOQ 500) выходит ровно макетное 500 → 1 000 → 3 000. */
function tierSteps(moq: number): [number, number, number] {
  const second = moq < 1000 ? 1000 : moq * 2;
  const third = second < 3000 ? 3000 : second * 3;
  return [moq, second, third];
}

function toOffer(fixture: OfferFixture): OfferSummary {
  const factory = FACTORIES[fixture.factory];
  const underload = fixture.free >= UNDERLOAD_FROM;
  const priceFrom = fixture.price * 100;
  const [first, second, third] = tierSteps(fixture.moq);

  return {
    id: fixture.id,
    title: fixture.title,
    priceFrom,
    moq: fixture.moq,
    leadDaysMin: fixture.lead,
    freeCapacityPct: fixture.free,
    sampleAvailable: fixture.sample === true,
    badges: [
      ...(fixture.hit === true ? (["hit"] as const) : []),
      ...(underload ? (["underload"] as const) : []),
      ...(factory.audit ? (["audit"] as const) : []),
    ],
    factory: toFactoryBrief(factory),
    categoryPath: fixture.category,
    material: MATERIALS[fixture.material],
    tiers: [
      { fromQty: first, unitPrice: (fixture.price + 47) * 100 },
      { fromQty: second, unitPrice: (fixture.price + 33) * 100 },
      { fromQty: third, unitPrice: priceFrom },
    ],
    // цена «до скидки» есть только там, где скидка действительно объявлена
    priceOld: underload ? (fixture.price + 37) * 100 : undefined,
    sample: fixture.sample === true ? { price: 150_000, days: 5 } : undefined,
    tone: fixture.tone,
  };
}

/** Ключ материала оффера — по нему считается фасет «Материал». */
export const MATERIAL_BY_OFFER = new Map<number, MaterialKey>(
  FIXTURES.map((fixture) => [fixture.id, fixture.material]),
);

/** Ключ завода оффера — по нему собирается витрина завода и карточка продавца. */
export const FACTORY_KEY_BY_OFFER = new Map<number, FactoryKey>(
  FIXTURES.map((fixture) => [fixture.id, fixture.factory]),
);

export const OFFERS: OfferSummary[] = FIXTURES.map(toOffer);

export const OFFER_BY_ID = new Map<number, OfferSummary>(OFFERS.map((offer) => [offer.id, offer]));

/** Предложения одного завода — витрина завода и ссылка «все предложения (3)». */
export function offersOfFactory(factoryId: number): OfferSummary[] {
  return OFFERS.filter((offer) => offer.factory.id === factoryId);
}
