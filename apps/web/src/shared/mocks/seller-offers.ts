import type {
  OfferSummary,
  SellerOfferChange,
  SellerOfferDraft,
  SellerOfferListItem,
  SellerOfferStatus,
  SellerOfferVersion,
} from "@partiya/api-contracts";

import { DEMO_FACTORY_ID } from "@/shared/lib/demo";
import { formatNumber } from "@/shared/lib/format";

import { FACTORIES, toFactoryBrief } from "./factories";
import { MATERIALS, OFFER_BY_ID, UNDERLOAD_DISCOUNT_PERCENT } from "./offers";

/* Реестр предложений завода — единственное хранилище SKU в моках.
 *
 * Лежит в shared, а не в модуле, по той же причине, что и фикстуры каталога: его знают
 * сразу трое — кабинет завода (редактор), бэк-офис (очередь модерации) и каталог
 * (опубликованное предложение обязано появиться в выдаче). Кросс-модульные импорты
 * правилами слоёв запрещены, поэтому общий реестр живёт внизу иерархии.
 *
 * Что реестр воспроизводит всерьёз (ARCHITECTURE.md, 5.1):
 *
 * * версия — неизменяемый снимок: правка опубликованного SKU создаёт НОВУЮ версию,
 *   а опубликованная остаётся в выдаче до решения оператора;
 * * значимые поля (название, фото, характеристики) уходят на модерацию, цена и сроки
 *   публикуются сразу — это правило и рисует подсказка в редакторе;
 * * «в выдаче» — это не статус, а отдельный тумблер: скрытое предложение остаётся
 *   опубликованным и возвращается в выдачу без повторной модерации.
 *
 * Состояние — sessionStorage, как у остальных моков: перезагрузка страницы не должна
 * терять черновик SKU. */

const STORAGE_KEY = "partiya.mock.seller-offers.v1";

/** Поля, правка которых требует модерации (остальные публикуются сразу). */
const MODERATED_FIELDS = new Set(["title", "images", "attributes", "categoryPath"]);

export interface SellerOfferRecord {
  id: number;
  /** Организация-завод, которой принадлежит предложение. */
  orgId: string;
  /** Номер завода в каталоге — по нему собирается предпросмотр карточки. */
  factoryId: number;
  status: SellerOfferStatus;
  /** Номер правящейся версии. */
  version: number;
  /** Номер версии, которая сейчас в выдаче; `null` — ничего не опубликовано. */
  publishedVersion: number | null;
  listed: boolean;
  draft: SellerOfferDraft;
  /** Снимок опубликованной версии — от него считается дифф. */
  published: SellerOfferDraft | null;
  versions: SellerOfferVersion[];
  metrics: { impressions: number; views: number; inCompare: number; orders: number };
  tone: "a" | "b" | "c" | "d";
  createdAt: string;
  updatedAt: string;
}

interface RegistryState {
  offers: SellerOfferRecord[];
  seq: number;
}

/* ─────────────────────────────── хранилище ─────────────────────────────── */

let state: RegistryState | null = null;

function storage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    sessionStorage.getItem(STORAGE_KEY);
    return sessionStorage;
  } catch {
    return null;
  }
}

function load(): RegistryState {
  if (state) return state;
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (raw != null) {
      state = JSON.parse(raw) as RegistryState;
      return state;
    }
  } catch {
    /* приватная вкладка или чужой формат — начинаем с фикстур */
  }
  state = seedRegistry();
  return state;
}

function persist(): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* хранилище недоступно — реестр живёт в памяти */
  }
}

/** Только для тестов и дев-инструментов. */
export function resetSellerOffers(): void {
  state = seedRegistry();
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    /* нечего чистить */
  }
}

/* ─────────────────────────────── фикстуры ─────────────────────────────── */

const SEEDED_AT = "2026-09-09T10:00:00.000Z";

/** Значения атрибутов сквозного примера — они же в характеристиках карточки. */
const ATTRS_2231: SellerOfferDraft["attributes"] = {
  material: "Кулирная гладь, хлопок 100 %",
  density: 180,
  fit: ["классический", "оверсайз", "женский приталенный"],
  sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  print: ["шелкография до 6 цв.", "DTF", "вышивка"],
  colors: "14 базовых",
  pantone: "от 1 000 шт",
};

function draftFromCatalog(offerId: number, listed: boolean): SellerOfferDraft {
  const offer = OFFER_BY_ID.get(offerId);
  const tiers = offer?.tiers ?? [];
  return {
    id: offerId,
    status: "published",
    version: 1,
    title: offer?.title ?? "Предложение",
    categoryPath: offer?.categoryPath ?? ["tekstil", "futbolki"],
    capacityUnitsPerItem: 1,
    images: [
      { id: `${String(offerId)}-1`, label: "главное", tone: offer?.tone ?? "a" },
      { id: `${String(offerId)}-2`, label: "шов", tone: "a" },
      { id: `${String(offerId)}-3`, label: "бирка", tone: "c" },
    ],
    attributes:
      offerId === 2231
        ? { ...ATTRS_2231 }
        : { material: offer?.material ?? MATERIALS.cotton, density: 200 },
    moq: offer?.moq ?? 500,
    tiers: tiers.map((tier) => ({ fromQty: tier.fromQty, unitPrice: tier.unitPrice })),
    options: [
      { id: "extra-print-color", title: "Доп. цвет принта", price: 600_000, unit: "per_batch" },
      { id: "own-pantone", title: "Свой Pantone ткани", price: 1_800_000, unit: "per_batch" },
      { id: "embroidery", title: "Вышивка вместо принта", price: 2_200, unit: "per_item" },
    ],
    leadDaysMin: offer?.leadDaysMin ?? 14,
    leadDaysMax: (offer?.leadDaysMin ?? 14) + 4,
    leadDaysPer1000: 3,
    sampleAvailable: offer?.sampleAvailable ?? false,
    samplePrice: offer?.sample?.price ?? 150_000,
    sampleDays: offer?.sample?.days ?? 5,
    delivery: [
      { id: "wb", title: "Доставка до склада WB", price: 940_000, days: 3 },
      { id: "address", title: "Доставка до адреса, Москва", price: 1_280_000, days: 4 },
      { id: "pickup", title: "Самовывоз с фабрики", price: 0, days: 0 },
    ],
    listed,
    updatedAt: SEEDED_AT,
  };
}

function version(
  no: number,
  status: SellerOfferStatus,
  changes: SellerOfferChange[] = [],
): SellerOfferVersion {
  return {
    version: no,
    status,
    createdAt: SEEDED_AT,
    publishedAt: status === "published" ? SEEDED_AT : null,
    changes,
  };
}

function record(
  offerId: number,
  status: SellerOfferStatus,
  versionNo: number,
  listed: boolean,
  metrics: SellerOfferRecord["metrics"],
  overrides: Partial<SellerOfferDraft> = {},
): SellerOfferRecord {
  const draft = { ...draftFromCatalog(offerId, listed), ...overrides, version: versionNo, status };
  return {
    id: offerId,
    orgId: "",
    factoryId: DEMO_FACTORY_ID,
    status,
    version: versionNo,
    publishedVersion: status === "published" ? versionNo : null,
    listed,
    draft,
    published: status === "published" ? draft : null,
    versions: Array.from({ length: versionNo }, (_, index) =>
      version(index + 1, index + 1 === versionNo ? status : "published"),
    ).reverse(),
    metrics,
    tone: OFFER_BY_ID.get(offerId)?.tone ?? "a",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  };
}

/** Пять строк таблицы «Предложения» из макета, включая «На модерации» и «Черновик». */
function seedRegistry(): RegistryState {
  return {
    offers: [
      record(2231, "published", 4, true, {
        impressions: 25_760,
        views: 1840,
        inCompare: 110,
        orders: 14,
      }),
      record(2144, "published", 2, true, {
        impressions: 8540,
        views: 610,
        inCompare: 37,
        orders: 3,
      }),
      record(2098, "published", 1, false, {
        impressions: 5880,
        views: 420,
        inCompare: 25,
        orders: 0,
      }),
      {
        ...record(2231, "moderation", 1, false, {
          impressions: 0,
          views: 0,
          inCompare: 0,
          orders: 0,
        }),
        id: 2310,
        draft: {
          ...draftFromCatalog(2231, false),
          id: 2310,
          status: "moderation",
          version: 1,
          title: "Футболки оверсайз 240 г/м²",
          moq: 300,
          tiers: [
            { fromQty: 300, unitPrice: 24_800 },
            { fromQty: 1000, unitPrice: 22_400 },
            { fromQty: 3000, unitPrice: 19_800 },
          ],
          listed: false,
        },
        published: null,
        publishedVersion: null,
      },
      {
        ...record(2231, "draft", 1, false, {
          impressions: 0,
          views: 0,
          inCompare: 0,
          orders: 0,
        }),
        id: 2311,
        draft: {
          ...draftFromCatalog(2231, false),
          id: 2311,
          status: "draft",
          version: 1,
          title: "Свитшоты 320 г/м² с начёсом",
          moq: 0,
          tiers: [],
          listed: false,
        },
        published: null,
        publishedVersion: null,
      },
    ],
    seq: 2400,
  };
}

/* ─────────────────────────────── чтение ─────────────────────────────── */

/** Привязывает фикстуры к организации при первом обращении завода. */
export function ensureSellerOffersOrg(orgId: string): void {
  const registry = load();
  let touched = false;
  for (const offer of registry.offers) {
    if (offer.orgId === "") {
      offer.orgId = orgId;
      touched = true;
    }
  }
  if (touched) persist();
}

export function listSellerOfferRecords(orgId: string): SellerOfferRecord[] {
  return load()
    .offers.filter((offer) => offer.orgId === orgId)
    .sort((a, b) => b.id - a.id);
}

export function findSellerOfferRecord(id: number): SellerOfferRecord | undefined {
  return load().offers.find((offer) => offer.id === id);
}

/** Очередь модерации бэк-офиса: всё, что ждёт решения оператора. */
export function moderationQueueRecords(): SellerOfferRecord[] {
  return load()
    .offers.filter((offer) => offer.status === "moderation")
    .sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
}

/* ─────────────────────────────── запись ─────────────────────────────── */

/** Создаёт черновик нового предложения и возвращает его. */
export function createSellerOfferRecord(orgId: string, nowIso: string): SellerOfferRecord {
  const registry = load();
  registry.seq += 1;
  const id = registry.seq;
  const draft: SellerOfferDraft = {
    ...draftFromCatalog(2231, false),
    id,
    status: "draft",
    version: 1,
    title: "",
    moq: 0,
    tiers: [],
    images: [],
    attributes: {},
    listed: false,
    updatedAt: nowIso,
  };
  const created: SellerOfferRecord = {
    id,
    orgId,
    factoryId: DEMO_FACTORY_ID,
    status: "draft",
    version: 1,
    publishedVersion: null,
    listed: false,
    draft,
    published: null,
    versions: [version(1, "draft")],
    metrics: { impressions: 0, views: 0, inCompare: 0, orders: 0 },
    tone: "b",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  registry.offers.push(created);
  persist();
  return created;
}

/** Сохраняет правку черновика. Опубликованное предложение при первой правке переходит
    к следующей версии — опубликованная остаётся в выдаче. */
export function patchSellerOfferRecord(
  id: number,
  patch: Partial<SellerOfferDraft>,
  nowIso: string,
): SellerOfferRecord | undefined {
  const offer = findSellerOfferRecord(id);
  if (!offer) return undefined;
  if (offer.status === "published" && offer.published !== null) {
    offer.version += 1;
    offer.status = "draft";
    offer.versions.unshift(version(offer.version, "draft"));
  }
  offer.draft = { ...offer.draft, ...patch, id, version: offer.version, updatedAt: nowIso };
  if (patch.listed !== undefined) offer.listed = patch.listed;
  offer.updatedAt = nowIso;
  persist();
  return offer;
}

/** Отправка версии на модерацию. */
export function submitSellerOfferRecord(id: number, nowIso: string): SellerOfferRecord | undefined {
  const offer = findSellerOfferRecord(id);
  if (!offer) return undefined;
  offer.status = "moderation";
  offer.draft = { ...offer.draft, status: "moderation" };
  offer.updatedAt = nowIso;
  const head = offer.versions[0];
  if (head && head.version === offer.version) head.status = "moderation";
  else offer.versions.unshift(version(offer.version, "moderation"));
  persist();
  return offer;
}

/** Решение оператора. `approve` публикует версию, `reject` возвращает в черновик. */
export function moderateSellerOfferRecord(
  id: number,
  approve: boolean,
  comment: string,
  nowIso: string,
): SellerOfferRecord | undefined {
  const offer = findSellerOfferRecord(id);
  if (!offer) return undefined;
  const head = offer.versions[0];
  if (approve) {
    offer.status = "published";
    offer.publishedVersion = offer.version;
    offer.listed = true;
    offer.draft = { ...offer.draft, status: "published", listed: true };
    offer.published = offer.draft;
    if (head) {
      head.status = "published";
      head.publishedAt = nowIso;
      head.moderationComment = null;
    }
  } else {
    offer.status = "draft";
    offer.draft = { ...offer.draft, status: "draft" };
    if (head) {
      head.status = "draft";
      head.moderationComment = comment;
    }
  }
  offer.updatedAt = nowIso;
  persist();
  return offer;
}

export function setSellerOfferListed(id: number, listed: boolean, nowIso: string): void {
  const offer = findSellerOfferRecord(id);
  if (!offer) return;
  offer.listed = listed;
  offer.draft = { ...offer.draft, listed };
  if (offer.published) offer.published = { ...offer.published, listed };
  offer.updatedAt = nowIso;
  persist();
}

/* ─────────────────────────────── проекции ─────────────────────────────── */

/** Дифф версии для истории и для бэк-офиса: что изменилось относительно опубликованной. */
export function offerChanges(offer: SellerOfferRecord): SellerOfferChange[] {
  const before = offer.published;
  const after = offer.draft;
  const changes: SellerOfferChange[] = [];

  const push = (field: string, label: string, was: string | null, now: string | null) => {
    if (was === now) return;
    changes.push({ field, label, before: was, after: now });
  };

  push("title", "Название", before?.title ?? null, after.title);
  push(
    "moq",
    "MOQ",
    before ? `${formatNumber(before.moq)} шт` : null,
    `${formatNumber(after.moq)} шт`,
  );
  push(
    "tiers",
    "Цена от",
    before?.tiers[0] ? `${formatNumber(before.tiers[0].unitPrice / 100)} ₽` : null,
    after.tiers[0] ? `${formatNumber(after.tiers[0].unitPrice / 100)} ₽` : null,
  );
  push(
    "leadDays",
    "Срок",
    before ? `${String(before.leadDaysMin)}–${String(before.leadDaysMax)} раб. дней` : null,
    `${String(after.leadDaysMin)}–${String(after.leadDaysMax)} раб. дней`,
  );
  const beforeDensity = before?.attributes.density;
  const afterDensity = after.attributes.density;
  push(
    "attributes.density",
    "Плотность",
    beforeDensity === undefined ? null : String(beforeDensity),
    afterDensity === undefined ? null : String(afterDensity),
  );
  if ((before?.images.length ?? 0) !== after.images.length) {
    changes.push({
      field: "images",
      label: "Фото",
      before: before ? `${String(before.images.length)} шт` : null,
      after: `${String(after.images.length)} шт`,
    });
  }
  return changes;
}

/** Требует ли набор изменений проверки оператора (ARCHITECTURE.md, 5.1). */
export function needsModeration(changes: readonly SellerOfferChange[]): boolean {
  return changes.some((change) => MODERATED_FIELDS.has(change.field.split(".")[0] ?? ""));
}

export function toOfferListItem(offer: SellerOfferRecord): SellerOfferListItem {
  const { draft, metrics } = offer;
  return {
    id: offer.id,
    title: draft.title.length > 0 ? draft.title : "Без названия",
    status: offer.status,
    version: offer.version,
    priceFrom: draft.tiers.at(-1)?.unitPrice ?? draft.tiers[0]?.unitPrice ?? null,
    moq: draft.moq > 0 ? draft.moq : null,
    impressions: metrics.impressions,
    views: metrics.views,
    inCompare: metrics.inCompare,
    orders: metrics.orders,
    conversionPct:
      metrics.views > 0 ? Math.round((metrics.orders / metrics.views) * 1000) / 10 : null,
    listed: offer.listed && offer.status === "published",
    tone: offer.tone,
    badges: OFFER_BY_ID.get(offer.id)?.badges ?? [],
    updatedAt: offer.updatedAt,
  };
}

/** Опубликованное предложение как карточка каталога. Нужна и предпросмотру редактора,
    и самой выдаче: заказчик обязан увидеть ровно то, что показывал предпросмотр. */
export function toCatalogOffer(offer: SellerOfferRecord): OfferSummary {
  const source = offer.published ?? offer.draft;
  const factory = FACTORIES.volna;
  const tiers = source.tiers.map((tier) => ({ fromQty: tier.fromQty, unitPrice: tier.unitPrice }));
  const priceFrom = tiers.at(-1)?.unitPrice ?? tiers[0]?.unitPrice ?? 0;
  return {
    id: offer.id,
    title: source.title,
    priceFrom,
    moq: source.moq,
    leadDaysMin: source.leadDaysMin,
    freeCapacityPct: factory.freeCapacityPct,
    sampleAvailable: source.sampleAvailable,
    badges: factory.audit ? ["audit"] : [],
    factory: toFactoryBrief(factory),
    categoryPath: source.categoryPath,
    material:
      typeof source.attributes.material === "string" ? source.attributes.material : undefined,
    tiers,
    sample:
      source.sampleAvailable && source.samplePrice !== null
        ? { price: source.samplePrice, days: source.sampleDays ?? 5 }
        : undefined,
    tone: offer.tone,
  };
}

/** Предложения реестра, которых нет в базовых фикстурах каталога: их добавляет выдача.
 *
 * Фикстурные SKU (2231, 2144, …) в каталоге уже есть — второй раз их класть нельзя,
 * иначе карточка задвоится. Появляется здесь только то, что завод завёл сам и что
 * оператор опубликовал. */
export function extraCatalogOffers(): OfferSummary[] {
  return load()
    .offers.filter(
      (offer) => offer.status === "published" && offer.listed && !OFFER_BY_ID.has(offer.id),
    )
    .map(toCatalogOffer);
}

/** Скидка на недозагруз, % — подпись бейджа предпросмотра. */
export const PREVIEW_UNDERLOAD_PERCENT = UNDERLOAD_DISCOUNT_PERCENT;
