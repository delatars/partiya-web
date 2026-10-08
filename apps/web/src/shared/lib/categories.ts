/* Таксономия каталога. Нужна и шапке (меню категорий), и главной (плитки), и каталогу
   (крошки, заголовок) — поэтому живёт в shared, а не в модуле. Позже приедет с бэка
   (`GET /catalog/categories`), а пока это та же таблица, что на бэке: порядок, слаги и
   названия — `partiya-api/migrations/0040_catalog_categories.sql` (+ `0042`, убравшая старые
   плитки) и `crates/catalog/seed/catalog.json`, счётчики и «цена от» — то, что бэк считает
   по тем же сидовым офферам (они же — моки `shared/mocks/offers.ts`). Сверка —
   `categories.test.ts`.

   Решение продукта п. 28 (DECISIONS.md, «Уточнения»): текстиль под СТМ остаётся первым,
   за ним 23 корневые категории в порядке списка продукта — всего 24 корня. «Упаковка» и
   «Металлоконструкции» слиты с категориями продукта — слаг прежний, название новое (Q-415).
   Остальные старые плитки макета (косметика, свечи, пищевка, пластик) убраны (Q-415, Q-430):
   их адреса `/catalog/<slug>` — обычная неизвестная категория. */

export interface CategoryNode {
  slug: string;
  title: string;
  /** Опубликованных предложений в ветке, включая подкатегории. 0 — «скоро появятся». */
  offers: number;
  /** «от 78 ₽» на плитке — копейки; `null` — предложений нет. */
  priceFrom: number | null;
  children?: CategoryNode[];
}

/** Пустая корневая категория: заводов ещё нет (п. 28). */
function root(slug: string, title: string): CategoryNode {
  return { slug, title, offers: 0, priceFrom: null };
}

export const CATEGORIES: CategoryNode[] = [
  {
    slug: "tekstil",
    title: "Текстиль",
    offers: 28,
    priceFrom: 7800,
    children: [
      { slug: "futbolki", title: "Футболки и худи", offers: 26, priceFrom: 9800 },
      { slug: "sumki", title: "Сумки и шоперы", offers: 2, priceFrom: 7800 },
    ],
  },
  root("rezinotekhnicheskie-izdeliya", "Резинотехнические изделия"),
  root("avtozapchasti-i-aksessuary", "Автозапчасти и аксессуары"),
  root("laboratornoe-oborudovanie", "Лабораторное оборудование"),
  root("it-i-bytovaya-tekhnika", "IT и бытовая техника"),
  root("truboprovodnaya-armatura", "Трубопроводная арматура"),
  root("khimicheskaya-produktsiya", "Химическая продукция"),
  root("klimaticheskoe-oborudovanie", "Климатическое оборудование"),
  root("mebel", "Мебель"),
  root("masla-i-smazki", "Масла и смазки"),
  root("upakovka", "Упаковка и маркировка"),
  root("metall", "Металлы и продукция металлообработки"),
  root("pnevmaticheskoe-oborudovanie", "Пневматическое оборудование"),
  root("stroitelnye-materialy", "Строительные материалы"),
  root("pozharnoe-oborudovanie", "Пожарное оборудование"),
  root("ofisnye-i-khozyaystvennye-tovary", "Офисные и хозяйственные товары"),
  root("elektrotekhnika", "Электротехнические устройства и материалы"),
  root("gidravlicheskoe-oborudovanie", "Гидравлическое оборудование"),
  root("zapchasti-dlya-spetstekhniki", "Запчасти для спецтехники"),
  root("instrument", "Инструмент"),
  root("kipia", "КИПиА"),
  root("podshipniki", "Подшипники"),
  root("nasosy", "Насосы"),
  root("metizy-i-krepezh", "Метизы и крепёж"),
];

/** Сколько корневых категорий помещается в полосу меню под шапкой: остальные — в каталоге
    плитками (24 пункта полоса не вмещает даже на широком экране, Q-418). */
export const MENU_CATEGORY_LIMIT = 6;

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
