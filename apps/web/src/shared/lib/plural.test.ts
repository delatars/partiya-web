import { describe, expect, it } from "vitest";

import { formatNumber } from "./format";
import { plural, pluralize } from "./plural";

const OFFERS = ["предложение", "предложения", "предложений"] as const;

describe("plural", () => {
  it("склоняет по русским правилам", () => {
    expect(plural(1, OFFERS)).toBe("предложение");
    expect(plural(2, OFFERS)).toBe("предложения");
    expect(plural(4, OFFERS)).toBe("предложения");
    expect(plural(5, OFFERS)).toBe("предложений");
    expect(plural(0, OFFERS)).toBe("предложений");
  });

  it("помнит про 11–14 и вторую сотню", () => {
    expect(plural(11, OFFERS)).toBe("предложений");
    expect(plural(14, OFFERS)).toBe("предложений");
    expect(plural(21, OFFERS)).toBe("предложение");
    expect(plural(22, OFFERS)).toBe("предложения");
    expect(plural(111, OFFERS)).toBe("предложений");
    expect(plural(214, OFFERS)).toBe("предложений");
  });

  it("не путается на отрицательных", () => {
    expect(plural(-1, OFFERS)).toBe("предложение");
    expect(plural(-5, OFFERS)).toBe("предложений");
  });

  it("pluralize склеивает число и слово", () => {
    expect(pluralize(126, ["отзыв", "отзыва", "отзывов"])).toBe("126 отзывов");
    expect(pluralize(1060, ["предложение", "предложения", "предложений"], formatNumber)).toBe(
      "1 060 предложений",
    );
  });
});
