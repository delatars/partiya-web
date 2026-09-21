import { describe, expect, it } from "vitest";

import { cabinetNav, isNavItemActive } from "./cabinet-nav";
import { canEnter, requiredOrgKind } from "./guards";

describe("меню кабинета", () => {
  it("у заказчика и завода разные наборы", () => {
    const customer = cabinetNav("customer").map((item) => item.href);
    const factory = cabinetNav("factory").map((item) => item.href);
    expect(customer).toContain("/account/orders");
    expect(customer).not.toContain("/seller");
    expect(factory).toContain("/seller");
    expect(factory).not.toContain("/account/orders");
  });

  it("«Компания» есть у обоих", () => {
    expect(cabinetNav("customer").some((item) => item.href === "/company")).toBe(true);
    expect(cabinetNav("factory").some((item) => item.href === "/company")).toBe(true);
  });

  it("без компании меню пустое", () => {
    expect(cabinetNav(null)).toHaveLength(0);
  });

  /** Главное свойство: в меню нет пунктов, в которые guard не пустит. */
  it("не показывает того, что закрыто guard-ом", () => {
    for (const area of ["customer", "factory"] as const) {
      for (const item of cabinetNav(area)) {
        const requirement = requiredOrgKind(item.href);
        expect(requirement === "any" || requirement === area).toBe(true);
      }
    }
  });

  it("оператору показывает вход в бэк-офис", () => {
    const hrefs = cabinetNav("operator").map((item) => item.href);
    expect(hrefs).toContain("/admin");
  });

  it("активный пункт сравнивается точно", () => {
    const summary = { label: "Сводка", href: "/seller" };
    expect(isNavItemActive(summary, "/seller")).toBe(true);
    expect(isNavItemActive(summary, "/seller/offers")).toBe(false);
  });

  it("оператор проходит в свой пункт меню", () => {
    const operator = {
      user: { id: "u", email: null, phone: null, name: null, createdAt: "" },
      organizations: [],
      activeOrgId: null,
      activeRole: null,
      platformOperator: true,
    };
    expect(canEnter(operator, "/admin")).toBe(true);
  });
});
