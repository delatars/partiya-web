import type { OfferSummary, PriceTier } from "./catalog";
import type { Kopecks } from "./common";
import type { FactoryBrief } from "./factories";

/* Домен «Оффер»: `GET /offers/{id}`, `/offers/{id}/similar | /questions | /reviews`,
   `POST /offers/{id}/questions`.

   Карточка — надстройка над выдачей: всё, что уже есть в `OfferSummary`, не дублируется,
   поэтому `OfferDetail` её расширяет и в одном месте приходит и то и другое. */

/** Заглушка фото (`.ph A–D` макета) до реальных изображений. */
export interface OfferImage {
  id: string;
  /** Подпись по центру: «фото 1 · лицевая». */
  label: string;
  tone: "a" | "b" | "c" | "d";
  /** Реальное фото, когда оно появится; пока заглушка. */
  url?: string;
}

/** Строка таблицы характеристик: «Материал» → «Кулирная гладь, хлопок 100 %, 180 г/м²». */
export interface OfferSpecRow {
  name: string;
  value: string;
}

/** Как считается опция: за штуку (умножается на объём) или за партию (одна сумма). */
export type OptionPriceUnit = "per_item" | "per_batch";

export interface OfferOption {
  /** Человекочитаемый код внутри оффера: `extra-print-color`. */
  id: string;
  title: string;
  unit: OptionPriceUnit;
  price: Kopecks;
  /** Подпись из макета: «за партию», «за шт», «от 1 000 шт». */
  note?: string;
  /** Опция недоступна ниже этого объёма. */
  minQty?: number;
}

export interface DeliveryOption {
  id: string;
  /** Текст, который уйдёт в строку котировки: «Доставка до склада WB». */
  title: string;
  price: Kopecks;
  /** Дней на доставку сверх срока производства. */
  days?: number;
  note?: string;
}

export interface OfferDetail extends OfferSummary {
  /** Галерея: первая картинка — главная. */
  images: OfferImage[];
  /** В карточке ступени обязательны — на них стоит весь калькулятор. */
  tiers: PriceTier[];
  /** Верхняя граница срока: «14–18 раб. дней». */
  leadDaysMax: number;
  specs: OfferSpecRow[];
  options: OfferOption[];
  delivery: DeliveryOption[];
  factory: FactoryBrief;
  /** Артикул для строки меты: «арт. 2231». */
  article?: string;
  /** «38 % мощности · ближайший запуск 22.09». */
  capacityNote?: string;
  /** «5 раб. дней, выборка 5 % по ГОСТ». */
  acceptanceNote?: string;
  /** Скидка за повтор партии у этой фабрики, % — строка «при повторе партии −9 %». */
  repeatDiscountPercent?: number;
  /** Скидка за недозагруз, % — есть только у бейджа `underload`. */
  underloadDiscountPercent?: number;
  /** Сколько вопросов технологу уже задано — число на вкладке. */
  questionCount?: number;
  /** Сколько всего активных предложений у завода — «все предложения (3)». */
  factoryOffersCount?: number;
}

export interface OfferAnswer {
  text: string;
  /** «Технолог «Волна»». */
  author: string;
  answeredAt: string;
}

export interface OfferQuestion {
  id: number;
  text: string;
  /** Кто спросил; у анонимного вопроса пусто. */
  author?: string;
  askedAt: string;
  answer?: OfferAnswer;
}

export interface OfferReview {
  id: number;
  author: string;
  /** Человеческая дата из макета: «август 2026». */
  when: string;
  rating: number;
  text: string;
  /** Заказ, после которого оставлен отзыв. */
  orderId?: number;
}

export interface OfferQuestionList {
  items: OfferQuestion[];
  total: number;
}

export interface OfferReviewList {
  items: OfferReview[];
  total: number;
  /** Средняя оценка по отзывам оффера. */
  rating?: number;
}

/** `POST /offers/{id}/questions` — только для вошедших. */
export interface CreateQuestionBody {
  text: string;
}
