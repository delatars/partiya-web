import type { FactoryBrief, FactoryDetail, FactorySummary } from "@partiya/api-contracts";

/* Фикстуры заводов. Живут в shared, а не в модуле: их знают и каталог (выдача),
   и карточка оффера (продавец), и витрина завода, и главная. Кросс-модульных импортов
   правила слоёв не допускают — общий словарь лежит внизу иерархии, рядом с demo.ts.

   Волна — сквозной пример из mockups/lenta/data.js (`offerDetail.factory`), остальные
   расширяют выборку до объёма, на котором видно фильтры списка заводов. */

/* `svechi` остаётся в справочнике специализаций (он же `SpecializationName` контракта и
   CHECK бэка), хотя категорию «Свечи и декор» убрали и заводов с ней в фикстурах нет — Q-433. */
export const SPECIALIZATIONS = {
  shveinoe: "Швейное производство",
  trikotazh: "Трикотаж",
  svechi: "Свечи и декор",
  sumki: "Сумки и шоперы",
} as const;

export type SpecializationKey = keyof typeof SPECIALIZATIONS;

export interface FactoryFixture {
  id: number;
  name: string;
  city: string;
  region: "cfo" | "pfo" | "szfo" | "ufo";
  rating: number;
  reviews: number;
  audit: boolean;
  specialization: SpecializationKey;
  since: number;
  workers: number;
  /** Мощность, единиц в месяц. */
  capacityPerMonth: number;
  completedOrders: number;
  onTimePct: number;
  /** Свободная мощность в сентябре, %. */
  freeCapacityPct: number;
  respondsInMinutes: number;
  onPlatformSince: string;
  about: string;
}

export const FACTORIES = {
  volna: {
    id: 17,
    name: "Волна",
    city: "Иваново",
    region: "cfo",
    rating: 4.8,
    reviews: 126,
    audit: true,
    specialization: "shveinoe",
    since: 2014,
    workers: 140,
    capacityPerMonth: 40_000,
    completedOrders: 87,
    onTimePct: 97,
    freeCapacityPct: 38,
    respondsInMinutes: 40,
    onPlatformSince: "с марта 2025",
    about:
      "Полный цикл: раскрой, пошив, печать (шелкография до 6 цветов, DTF), вышивка, маркировка «Честный знак», упаковка и отгрузка на склады маркетплейсов. Две линии: футболки/поло и худи/свитшоты.",
  },
  tkan: {
    id: 21,
    name: "Ткань+",
    city: "Кострома",
    region: "cfo",
    rating: 4.6,
    reviews: 58,
    audit: true,
    specialization: "trikotazh",
    since: 2011,
    workers: 95,
    capacityPerMonth: 26_000,
    completedOrders: 41,
    onTimePct: 94,
    freeCapacityPct: 22,
    respondsInMinutes: 90,
    onPlatformSince: "с мая 2025",
    about:
      "Вязание и пошив трикотажа: футер, кулирка, интерлок. Своя красильня, поэтому Pantone заказчика делаем от 500 шт.",
  },
  poshiv: {
    id: 29,
    name: "Пошив37",
    city: "Иваново",
    region: "cfo",
    rating: 4.7,
    reviews: 94,
    audit: true,
    specialization: "sumki",
    since: 2019,
    workers: 62,
    capacityPerMonth: 22_000,
    completedOrders: 64,
    onTimePct: 96,
    freeCapacityPct: 45,
    respondsInMinutes: 55,
    onPlatformSince: "с апреля 2025",
    about:
      "Шоперы, сумки-мешки и текстильная упаковка. Шелкография и DTF по плотным тканям, комплектация набором.",
  },
  meridian: {
    id: 33,
    name: "Меридиан",
    city: "Тверь",
    region: "cfo",
    rating: 4.4,
    reviews: 31,
    audit: false,
    specialization: "shveinoe",
    since: 2016,
    workers: 38,
    capacityPerMonth: 12_000,
    completedOrders: 19,
    onTimePct: 89,
    freeCapacityPct: 70,
    respondsInMinutes: 130,
    onPlatformSince: "с июля 2025",
    about: "Свитшоты и толстовки на футере. Небольшой цех, берут заказы от 300 шт.",
  },
  kama: {
    id: 41,
    name: "Кама",
    city: "Казань",
    region: "pfo",
    rating: 4.6,
    reviews: 72,
    audit: true,
    specialization: "trikotazh",
    since: 2013,
    workers: 110,
    capacityPerMonth: 31_000,
    completedOrders: 58,
    onTimePct: 95,
    freeCapacityPct: 52,
    respondsInMinutes: 70,
    onPlatformSince: "с февраля 2025",
    about: "Трикотаж для взрослых и детей, оверсайз-лекала, сублимация по смесовым тканям.",
  },
  volga: {
    id: 44,
    name: "Волга-Трикотаж",
    city: "Самара",
    region: "pfo",
    rating: 4.5,
    reviews: 63,
    audit: false,
    specialization: "trikotazh",
    since: 2009,
    workers: 84,
    capacityPerMonth: 24_000,
    completedOrders: 37,
    onTimePct: 91,
    freeCapacityPct: 64,
    respondsInMinutes: 110,
    onPlatformSince: "с июня 2025",
    about: "Худи и свитшоты на плотном футере, шоперы из двунитки. Работают в две смены.",
  },
  neva: {
    id: 52,
    name: "Невская нить",
    city: "Санкт-Петербург",
    region: "szfo",
    rating: 4.7,
    reviews: 88,
    audit: true,
    specialization: "shveinoe",
    since: 2015,
    workers: 73,
    capacityPerMonth: 19_000,
    completedOrders: 52,
    onTimePct: 96,
    freeCapacityPct: 27,
    respondsInMinutes: 45,
    onPlatformSince: "с марта 2025",
    about: "Поло, лонгсливы и худи премиального сегмента. Вышивальный цех на 12 голов.",
  },
  pomorye: {
    id: 55,
    name: "Поморье",
    city: "Вологда",
    region: "szfo",
    rating: 4.2,
    reviews: 19,
    audit: false,
    specialization: "shveinoe",
    since: 2020,
    workers: 26,
    capacityPerMonth: 8_000,
    completedOrders: 11,
    onTimePct: 86,
    freeCapacityPct: 55,
    respondsInMinutes: 180,
    onPlatformSince: "с августа 2025",
    about: "Флисовые худи и свитшоты с начёсом. Молодой цех, гибкие сроки под небольшие партии.",
  },
  uralpro: {
    id: 61,
    name: "Урал-Про",
    city: "Екатеринбург",
    region: "ufo",
    rating: 4.3,
    reviews: 26,
    audit: true,
    specialization: "trikotazh",
    since: 2012,
    workers: 57,
    capacityPerMonth: 15_000,
    completedOrders: 23,
    onTimePct: 92,
    freeCapacityPct: 71,
    respondsInMinutes: 95,
    onPlatformSince: "с мая 2025",
    about: "Рабочий трикотаж и корпоративная одежда: двунитка, футер, светоотражающая печать.",
  },
} satisfies Record<string, FactoryFixture>;

export type FactoryKey = keyof typeof FACTORIES;

export const FACTORY_KEYS = Object.keys(FACTORIES) as FactoryKey[];

/** Дата аудита из макета — одна на всех, у кого аудит пройден. */
const AUDITED_AT = "2026-06-12";
const AUDIT_VALID_UNTIL = "2027-06-12";

/** Короткая подпись плитки: «швейное производство · с 2014». */
export function factoryTagline(fixture: FactoryFixture): string {
  return `${SPECIALIZATIONS[fixture.specialization].toLowerCase()} · с ${String(fixture.since)}`;
}

/** Завод в карточке оффера и в выдаче каталога. */
export function toFactoryBrief(fixture: FactoryFixture): FactoryBrief {
  return {
    id: fixture.id,
    name: fixture.name,
    city: fixture.city,
    region: fixture.region,
    rating: fixture.rating,
    reviews: fixture.reviews,
    completedOrders: fixture.completedOrders,
    auditedAt: fixture.audit ? AUDITED_AT : undefined,
    specialization: SPECIALIZATIONS[fixture.specialization],
    since: fixture.since,
  };
}

export function toFactorySummary(fixture: FactoryFixture, offersCount: number): FactorySummary {
  return {
    ...toFactoryBrief(fixture),
    offersCount,
    freeCapacityPct: fixture.freeCapacityPct,
    respondsInMinutes: fixture.respondsInMinutes,
    specializationKey: fixture.specialization,
  };
}

/** Загрузка по неделям — «Оранжевым недозагруз» из витрины завода. */
function capacityWeeks(fixture: FactoryFixture) {
  const base = 100 - fixture.freeCapacityPct;
  return [
    { label: "1–7 сен", loadPct: Math.min(99, base + 26) },
    { label: "8–14 сен", loadPct: Math.min(99, base + 12) },
    { label: "15–21 сен", loadPct: base },
    { label: "22–28 сен", loadPct: Math.max(8, base - 18) },
    { label: "29–5 окт", loadPct: Math.max(5, base - 43) },
  ];
}

export function toFactoryDetail(fixture: FactoryFixture, offersCount: number): FactoryDetail {
  return {
    ...toFactorySummary(fixture, offersCount),
    workers: fixture.workers,
    capacityPerMonth: fixture.capacityPerMonth,
    onPlatformSince: fixture.onPlatformSince,
    onTimePct: fixture.onTimePct,
    disputes: fixture.audit ? 1 : 0,
    disputesNote: fixture.audit
      ? `из ${String(fixture.completedOrders)}, решён в пользу заказчика`
      : `из ${String(fixture.completedOrders)} заказов`,
    about: fixture.about,
    gallery: [
      { label: "цех", tone: "b" },
      { label: "раскрой", tone: "a" },
      { label: "печать", tone: "a" },
      { label: "склад", tone: "d" },
    ],
    audit: fixture.audit
      ? {
          validUntil: AUDIT_VALID_UNTIL,
          checks: [
            { label: "Юрлицо и реквизиты", passed: true },
            { label: "Выезд в цех", passed: true },
            { label: "Оборудование и штат", passed: true },
            { label: "Контрольные образцы", passed: true },
          ],
        }
      : undefined,
    capacityWeeks: capacityWeeks(fixture),
  };
}

export function factoryByKey(key: FactoryKey): FactoryFixture {
  return FACTORIES[key];
}

export function factoryById(id: number): FactoryFixture | undefined {
  return FACTORY_KEYS.map((key) => FACTORIES[key]).find((fixture) => fixture.id === id);
}
