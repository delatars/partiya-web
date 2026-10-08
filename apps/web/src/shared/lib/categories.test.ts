// @vitest-environment node
// DOM не нужен, а в jsdom `import.meta.url` — http-адрес dev-сервера, не путь к файлу.
import { describe, expect, it } from "vitest";

import { OFFERS } from "@/shared/mocks";

import { CATEGORIES, categoryHref, resolveCategoryPath } from "./categories";

/* Сверка с бэком: та же таблица — в partiya-api/crates/catalog/src/infra/seed.rs
   (`ROOTS`), там она сверяется с миграцией 0040 и сидом `seed/catalog.json`.
   Решение продукта п. 28; объединения со старыми плитками — Q-415. */
const ROOTS: readonly (readonly [slug: string, title: string, position: number])[] = [
  ["tekstil", "Текстиль", 0],
  ["rezinotekhnicheskie-izdeliya", "Резинотехнические изделия", 1],
  ["avtozapchasti-i-aksessuary", "Автозапчасти и аксессуары", 2],
  ["laboratornoe-oborudovanie", "Лабораторное оборудование", 3],
  ["it-i-bytovaya-tekhnika", "IT и бытовая техника", 4],
  ["truboprovodnaya-armatura", "Трубопроводная арматура", 5],
  ["khimicheskaya-produktsiya", "Химическая продукция", 6],
  ["klimaticheskoe-oborudovanie", "Климатическое оборудование", 7],
  ["mebel", "Мебель", 8],
  ["masla-i-smazki", "Масла и смазки", 9],
  ["upakovka", "Упаковка и маркировка", 10],
  ["metall", "Металлы и продукция металлообработки", 11],
  ["pnevmaticheskoe-oborudovanie", "Пневматическое оборудование", 12],
  ["stroitelnye-materialy", "Строительные материалы", 13],
  ["pozharnoe-oborudovanie", "Пожарное оборудование", 14],
  ["ofisnye-i-khozyaystvennye-tovary", "Офисные и хозяйственные товары", 15],
  ["elektrotekhnika", "Электротехнические устройства и материалы", 16],
  ["gidravlicheskoe-oborudovanie", "Гидравлическое оборудование", 17],
  ["zapchasti-dlya-spetstekhniki", "Запчасти для спецтехники", 18],
  ["instrument", "Инструмент", 19],
  ["kipia", "КИПиА", 20],
  ["podshipniki", "Подшипники", 21],
  ["nasosy", "Насосы", 22],
  ["metizy-i-krepezh", "Метизы и крепёж", 23],
];

/** Старые плитки макета, убранные решением продукта (Q-415; на бэке — миграция 0042). */
const REMOVED = ["kosmetika", "svechi", "pishchevka", "plastik"] as const;

interface SeedCategory {
  slug: string;
  title: string;
  position: number;
  children: SeedCategory[];
}

/* Если рядом лежит partiya-api — сверяемся с его сидом напрямую. В CI фронта соседнего
   репозитория нет: тогда проверка опирается на таблицу выше. Файл читается через node:fs
   (тесты идут в Node), а не через import vite: тот не пускает за корень проекта.
   Имя модуля собирается строкой — в типах приложения (vite/client) Node нет. */
interface NodeFs {
  existsSync(path: URL): boolean;
  readFileSync(path: URL, encoding: "utf8"): string;
}
const SEED_URL = new URL(
  "../../../../../../partiya-api/crates/catalog/seed/catalog.json",
  import.meta.url,
);
const fs = (await import(/* @vite-ignore */ ["node", "fs"].join(":"))) as NodeFs;
const SEED_TEXT = fs.existsSync(SEED_URL) ? fs.readFileSync(SEED_URL, "utf8") : undefined;

describe("таксономия каталога (п. 28)", () => {
  it("корни — та же таблица, что на бэке, в том же порядке", () => {
    expect(CATEGORIES.map((node, index) => [node.slug, node.title, index])).toEqual(
      ROOTS.map((row) => [...row]),
    );
  });

  it("слаги — латиница через дефис, без повторов", () => {
    const slugs = CATEGORIES.map((node) => node.slug);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/u);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("счётчики и «цена от» совпадают с моками офферов — как их посчитает бэк", () => {
    const walk = (nodes: readonly (typeof CATEGORIES)[number][], parent: string[]): void => {
      for (const node of nodes) {
        const path = [...parent, node.slug];
        const inside = OFFERS.filter((offer) =>
          path.every((slug, index) => offer.categoryPath?.[index] === slug),
        );
        expect(node.offers, path.join("/")).toBe(inside.length);
        const cheapest = inside.length > 0 ? Math.min(...inside.map((o) => o.priceFrom)) : null;
        expect(node.priceFrom, path.join("/")).toBe(cheapest);
        walk(node.children ?? [], path);
      }
    };
    walk(CATEGORIES, []);
  });

  it("старых плиток макета нет ни в таблице, ни в моках офферов", () => {
    expect(CATEGORIES).toHaveLength(24);
    for (const slug of REMOVED) {
      expect(resolveCategoryPath([slug]), slug).toEqual([]);
      expect(
        OFFERS.filter((offer) => offer.categoryPath?.[0] === slug),
        slug,
      ).toEqual([]);
    }
  });

  it("пустая новая категория разрешается в крошки, как и наполненная", () => {
    expect(resolveCategoryPath(["podshipniki"]).map((node) => node.title)).toEqual(["Подшипники"]);
    expect(categoryHref(["metizy-i-krepezh"])).toBe("/catalog/metizy-i-krepezh");
  });

  it.skipIf(SEED_TEXT === undefined)("совпадает с сидом partiya-api", () => {
    const seed = JSON.parse(SEED_TEXT ?? "{}") as { categories: SeedCategory[] };
    const strip = (nodes: SeedCategory[]): unknown =>
      nodes.map((node) => ({ slug: node.slug, title: node.title, children: strip(node.children) }));
    const ours = (nodes: readonly (typeof CATEGORIES)[number][]): unknown =>
      nodes.map((node) => ({
        slug: node.slug,
        title: node.title,
        children: ours(node.children ?? []),
      }));
    expect(ours(CATEGORIES)).toEqual(strip(seed.categories));
    expect(seed.categories.map((node) => node.position)).toEqual(ROOTS.map((row) => row[2]));
  });
});
