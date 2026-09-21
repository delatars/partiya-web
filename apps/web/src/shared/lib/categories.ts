/* Таксономия каталога. Нужна и шапке (меню категорий), и главной (плитки), и каталогу
   (крошки, заголовок) — поэтому живёт в shared, а не в модуле. Позже приедет с бэка. */

export interface CategoryNode {
  slug: string;
  title: string;
  /** Сколько предложений показывать в меню и на плитке главной. */
  offers: number;
  /** «от 96 ₽» на плитке — копейки. */
  priceFrom: number;
  tone: "a" | "b" | "c" | "d";
  children?: CategoryNode[];
}

export const CATEGORIES: CategoryNode[] = [
  {
    slug: "tekstil",
    title: "Текстиль",
    offers: 214,
    priceFrom: 9600,
    tone: "a",
    children: [
      { slug: "futbolki", title: "Футболки и худи", offers: 214, priceFrom: 9600, tone: "a" },
      { slug: "sumki", title: "Сумки и шоперы", offers: 48, priceFrom: 9600, tone: "d" },
    ],
  },
  { slug: "kosmetika", title: "Косметика и БАДы", offers: 86, priceFrom: 4500, tone: "c" },
  { slug: "svechi", title: "Свечи и декор", offers: 132, priceFrom: 12000, tone: "c" },
  { slug: "metall", title: "Металлоконструкции", offers: 58, priceFrom: 190000, tone: "b" },
  { slug: "upakovka", title: "Упаковка", offers: 167, priceFrom: 800, tone: "d" },
  { slug: "pishchevka", title: "Пищевое производство", offers: 73, priceFrom: 3200, tone: "d" },
  { slug: "mebel", title: "Мебель", offers: 41, priceFrom: 340000, tone: "b" },
  { slug: "plastik", title: "Пластик и литьё", offers: 64, priceFrom: 1400, tone: "a" },
];

/** Путь «tekstil/futbolki» → цепочка категорий от корня. Неизвестный сегмент обрывает цепочку. */
export function resolveCategoryPath(path: readonly string[]): CategoryNode[] {
  const chain: CategoryNode[] = [];
  let level = CATEGORIES;
  for (const slug of path) {
    const node = level.find((item) => item.slug === slug);
    if (!node) break;
    chain.push(node);
    level = node.children ?? [];
  }
  return chain;
}

/** Строка splat-параметра → массив сегментов без пустых. */
export function splitCategoryPath(splat: string | undefined): string[] {
  return (splat ?? "").split("/").filter(Boolean);
}

export function categoryHref(path: readonly string[]): string {
  return path.length > 0 ? `/catalog/${path.join("/")}` : "/catalog";
}
