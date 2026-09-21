import type { Facet, OfferFactory, OfferSummary } from "./catalog";

/* Домен «Заводы»: `GET /factories`, `GET /factories/{id}`.
   Правило совместимости общее для контракта — поля только добавляются и только
   необязательными. */

/** Завод в карточке оффера: к тому, что уже есть в выдаче, добавлены доверительные факты.
    `completedOrders` живёт в `OfferFactory` — его показывает и карточка каталога (Q-165). */
export interface FactoryBrief extends OfferFactory {
  /** Дата последнего аудита, ISO `YYYY-MM-DD`; нет — аудита нет. */
  auditedAt?: string;
  /** «швейное», «свечи, гипс» — одна строка для плитки и подписи. */
  specialization?: string;
  /** Год начала производства. */
  since?: number;
}

export interface FactorySummary extends FactoryBrief {
  /** Сколько активных предложений у завода. */
  offersCount: number;
  /** Свободная мощность в ближайшем месяце, %. */
  freeCapacityPct: number;
  /** Среднее время ответа технолога, минуты. */
  respondsInMinutes?: number;
  /** Ключ специализации для фильтра: tekstil, svechi… */
  specializationKey?: string;
}

/** Пункт чек-листа аудита платформы. */
export interface FactoryAuditCheck {
  label: string;
  passed: boolean;
}

export interface FactoryAudit {
  checks: FactoryAuditCheck[];
  /** До какой даты действителен аудит, ISO `YYYY-MM-DD`. */
  validUntil: string;
}

/** Загрузка недели: `label` — «1–7 сен», `loadPct` — сколько мощности уже продано. */
export interface FactoryCapacityWeek {
  label: string;
  loadPct: number;
}

/** Отзыв о заводе — тот же тип, что и у оффера. */
export interface FactoryReview {
  id: number;
  author: string;
  /** Человеческая дата из макета: «август 2026». */
  when: string;
  rating: number;
  text: string;
}

export interface FactoryDetail extends FactorySummary {
  /** Сотрудников в штате. */
  workers: number;
  /** Мощность, единиц в месяц. */
  capacityPerMonth: number;
  /** «с марта 2025» — как в макете. */
  onPlatformSince?: string;
  /** Доля заказов, отгруженных в срок, %. */
  onTimePct?: number;
  /** Сколько споров открывали по заказам завода. */
  disputes: number;
  /** Подпись к числу споров: «из 87, решён в пользу заказчика». */
  disputesNote?: string;
  /** Абзац «О производстве». */
  about?: string;
  /** Подписи заглушек фото цеха: «цех», «раскрой», «печать», «склад». */
  gallery?: { label: string; tone: "a" | "b" | "c" | "d" }[];
  audit?: FactoryAudit;
  capacityWeeks?: FactoryCapacityWeek[];
  /** Активные предложения завода — витрина показывает их сразу. */
  offers?: OfferSummary[];
  /** Последние отзывы. Имя не `reviews`: в `OfferFactory` так называется их количество. */
  recentReviews?: FactoryReview[];
}

export interface FactoryQuery {
  /** Строка поиска по названию. */
  q?: string;
  /** Город: «Иваново». */
  city?: string;
  /** Ключ специализации из фасета. */
  specialization?: string;
  /** Только заводы с аудитом платформы. */
  auditOnly?: boolean;
  page?: number;
  perPage?: number;
}

export interface FactoryListResult {
  items: FactorySummary[];
  total: number;
  /** Фасеты «Город» и «Специализация» — тот же тип, что в каталоге. */
  facets: Facet[];
  page?: number;
  perPage?: number;
  pageCount?: number;
}
