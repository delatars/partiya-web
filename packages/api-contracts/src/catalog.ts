import type { Kopecks } from "./common";

/* Домен «Каталог». Реальный бэк отдаёт GET /api/v1/catalog/search.
   Правило совместимости: поля только добавляются и только необязательными —
   иначе ломается partiya-api/crates/catalog. */

export interface PriceTier {
  fromQty: number;
  unitPrice: Kopecks;
}

export type OfferBadge = "hit" | "underload" | "audit";

export interface OfferFactory {
  id: number;
  name: string;
  city: string;
  /** Код региона для фасета: cfo, pfo, szfo, ufo. */
  region?: string;
  rating: number;
  reviews: number;
  /** Заказов, выполненных через платформу.
   *
   * Необязательное намеренно (Q-165): пока у завода нет ни одного закрытого заказа,
   * поля нет, и карточка не показывает число заказов вовсе. Выводить его из количества
   * отзывов нельзя — это разные факты, и «88 заказов» при настоящих 87 хуже пустоты. */
  completedOrders?: number;
}

export interface OfferSummary {
  id: number;
  title: string;
  priceFrom: Kopecks;
  moq: number;
  leadDaysMin: number;
  freeCapacityPct: number;
  sampleAvailable: boolean;
  badges: OfferBadge[];
  factory: OfferFactory;
  /** Путь категории от корня: ["tekstil", "futbolki"]. */
  categoryPath?: string[];
  /** Короткое описание материала — строка под названием в режиме списка. */
  material?: string;
  /** Ступени цены: в сетке показывается первая, в списке — все три. */
  tiers?: PriceTier[];
  /** Цена до скидки за недозагруз; есть только у бейджа underload. */
  priceOld?: Kopecks;
  /** Стоимость и срок образца; отсутствует, когда образца нет. */
  sample?: { price: Kopecks; days: number };
  /** Градиент заглушки фото (.ph A–D макета), пока нет реальных фотографий. */
  tone?: "a" | "b" | "c" | "d";
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export interface Facet {
  key: string;
  label: string;
  options: FacetOption[];
  /** Как рисовать группу: чекбоксы (по умолчанию) или радио — «Срок». */
  kind?: "checkbox" | "radio";
}

export interface CatalogSearchResult {
  items: OfferSummary[];
  facets: Facet[];
  total: number;
  /** Номер отданной страницы и сколько их всего; нет — значит одна страница. */
  page?: number;
  perPage?: number;
  pageCount?: number;
  /** Заголовок категории и хлебные крошки — считает бэк по таксономии. */
  category?: { path: string[]; title: string };
}

export type CatalogSort =
  "popular" | "price_asc" | "lead_asc" | "rating_desc" | "free_capacity_desc";

export interface CatalogQuery {
  /** Выбрать конкретные предложения по id — этим живёт «Избранное»: список id хранится
      у клиента, а карточки приходят из той же выдачи, что и каталог. Остальные фильтры
      при этом игнорируются. */
  ids?: number[];
  /** Путь категории через слэш: "tekstil/futbolki". */
  category?: string;
  sort?: CatalogSort;
  page?: number;
  perPage?: number;
  /** Строка поиска из шапки. */
  q?: string;
  /** Выбранные значения фасетов: ключ фасета → значения (region, material, moq, trust, lead). */
  filters?: Record<string, string[]>;
  /** Диапазон цены за штуку, копейки. */
  priceMin?: number;
  priceMax?: number;
  /** Диапазон минимальной партии, штуки. */
  moqMin?: number;
  moqMax?: number;
}
