import { Factory } from "lucide-react";
import { describe, expect, it } from "vitest";

import { CATEGORIES } from "@/shared/lib/categories";

import { CATEGORY_ICON_SLUGS, categoryIcon } from "./category-icon";

describe("иконки категорий", () => {
  it("у каждой корневой категории — своя иконка, без повторов", () => {
    const icons = CATEGORIES.map((node) => categoryIcon(node.slug));
    expect(icons).not.toContain(Factory);
    expect(new Set(icons).size).toBe(CATEGORIES.length);
    expect([...CATEGORY_ICON_SLUGS].sort()).toEqual(CATEGORIES.map((node) => node.slug).sort());
  });

  it("неизвестная категория получает общую иконку завода", () => {
    expect(categoryIcon("nesushchestvuyushchaya")).toBe(Factory);
  });
});
