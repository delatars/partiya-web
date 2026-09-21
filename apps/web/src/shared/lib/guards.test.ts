import type { Me, OrgKind, Organization } from "@partiya/api-contracts";
import { describe, expect, it } from "vitest";

import {
  activeOrgOf,
  areaOf,
  canEnter,
  canEnterCheckout,
  homePathFor,
  isOperator,
  postLoginPath,
  requiredOrgKind,
  safeRedirect,
} from "./guards";

function org(id: string, kind: OrgKind): Organization {
  return {
    id,
    kind,
    name: kind === "factory" ? "ООО «Волна»" : "ООО «Кора»",
    inn: "7707083893",
    kpp: "770101001",
    verificationStatus: "verified",
    role: "owner",
    roleTitle: "Владелец",
    createdAt: "2026-03-02T10:00:00Z",
  };
}

function me(organizations: Organization[], activeOrgId: string | null = null): Me {
  return {
    user: {
      id: "u1",
      email: "a.korableva@kora.ru",
      phone: null,
      name: "Анна Кораблёва",
      createdAt: "2026-03-02T10:00:00Z",
    },
    organizations,
    activeOrgId: activeOrgId ?? organizations[0]?.id ?? null,
    activeRole: organizations[0]?.role ?? null,
  };
}

const customer = me([org("c", "customer")]);
const factory = me([org("f", "factory")]);
const both = me([org("c", "customer"), org("f", "factory")], "c");
const operator = { ...me([]), platformOperator: true } as Me;

describe("requiredOrgKind", () => {
  it("делит разделы кабинета по виду организации", () => {
    expect(requiredOrgKind("/seller")).toBe("factory");
    expect(requiredOrgKind("/seller/offers")).toBe("factory");
    expect(requiredOrgKind("/capacity")).toBe("factory");
    expect(requiredOrgKind("/account/orders")).toBe("customer");
    expect(requiredOrgKind("/escrow")).toBe("customer");
  });

  it("«Компания» и «Уведомления» есть у обоих", () => {
    expect(requiredOrgKind("/company")).toBe("any");
    expect(requiredOrgKind("/notifications")).toBe("any");
  });

  /** Ловушка префиксов: /account не должен цеплять /accounting, /seller — /sellers. */
  it("сравнивает сегментами, а не подстрокой", () => {
    expect(requiredOrgKind("/accounting")).toBe("any");
    expect(requiredOrgKind("/sellers-club")).toBe("any");
  });

  it("оформление и образец требуют заказчика", () => {
    expect(requiredOrgKind("/order/new")).toBe("customer");
    expect(requiredOrgKind("/order/4813/pay")).toBe("customer");
    expect(requiredOrgKind("/sample/new")).toBe("customer");
  });

  /** `/order` и `/orders` — разные пути: иначе кабинетные заказы перехватывались бы. */
  it("«/order» не перехватывает «/account/orders»", () => {
    expect(requiredOrgKind("/account/orders/4812")).toBe("customer");
    expect(requiredOrgKind("/orders")).toBe("any");
  });
});

describe("canEnterCheckout", () => {
  it("пускает только с активной организацией-заказчиком", () => {
    expect(canEnterCheckout(customer)).toBe(true);
    expect(canEnterCheckout(both)).toBe(true);
  });

  it("не пускает завод, аноним и оператора", () => {
    expect(canEnterCheckout(factory)).toBe(false);
    expect(canEnterCheckout(null)).toBe(false);
    expect(canEnterCheckout(operator)).toBe(false);
    // заказчик есть, но активна фабрика — сделку заключать не от кого
    expect(canEnterCheckout(me([org("c", "customer"), org("f", "factory")], "f"))).toBe(false);
  });

  it("возврат после входа сохраняет адрес оформления с расчётом", () => {
    const target = "/order/new?offer=2231&qty=1000&options=extra-print-color&delivery=wb";
    expect(postLoginPath(customer, target)).toBe(target);
    // завод по этой ссылке уедет к себе, а не в чужое оформление
    expect(postLoginPath(factory, target)).toBe("/seller");
  });
});

describe("canEnter", () => {
  it("не пускает заказчика в разделы завода и наоборот", () => {
    expect(canEnter(customer, "/account/orders")).toBe(true);
    expect(canEnter(customer, "/seller")).toBe(false);
    expect(canEnter(factory, "/seller")).toBe(true);
    expect(canEnter(factory, "/account/orders")).toBe(false);
  });

  it("бэк-офис открыт только оператору", () => {
    expect(canEnter(customer, "/admin")).toBe(false);
    expect(canEnter(customer, "/admin/moderation")).toBe(false);
    expect(canEnter(operator, "/admin")).toBe(true);
  });

  it("публичные страницы открыты всем", () => {
    expect(canEnter(null, "/catalog")).toBe(true);
    expect(canEnter(customer, "/how-it-works")).toBe(true);
  });
});

describe("safeRedirect", () => {
  it("пропускает свой относительный путь", () => {
    expect(safeRedirect("/account/orders")).toBe("/account/orders");
    expect(safeRedirect("/catalog?sort=price_asc")).toBe("/catalog?sort=price_asc");
  });

  it("не пропускает чужой адрес", () => {
    expect(safeRedirect("https://evil.example/phish")).toBeUndefined();
    expect(safeRedirect("//evil.example")).toBeUndefined();
    expect(safeRedirect("/\\evil.example")).toBeUndefined();
    expect(safeRedirect("javascript:alert(1)")).toBeUndefined();
    expect(safeRedirect("http://localhost:3111/ok")).toBeUndefined();
  });

  it("не пропускает мусор", () => {
    expect(safeRedirect(undefined)).toBeUndefined();
    expect(safeRedirect(42)).toBeUndefined();
    expect(safeRedirect("")).toBeUndefined();
    expect(safeRedirect("account/orders")).toBeUndefined();
    expect(safeRedirect("/ok\nLocation: https://evil.example")).toBeUndefined();
  });
});

describe("сессия и дом", () => {
  it("активная организация ищется по activeOrgId", () => {
    expect(activeOrgOf(both)?.kind).toBe("customer");
    expect(activeOrgOf(me([org("c", "customer")], "нет-такой"))).toBeNull();
    expect(activeOrgOf(null)).toBeNull();
  });

  it("область определяется активной организацией, у оператора — признаком", () => {
    expect(areaOf(customer)).toBe("customer");
    expect(areaOf(factory)).toBe("factory");
    expect(areaOf(operator)).toBe("operator");
    expect(areaOf(null)).toBeNull();
    expect(isOperator(customer)).toBe(false);
  });

  it("дом зависит от области, а без компании ведёт в регистрацию", () => {
    expect(homePathFor(customer)).toBe("/account/orders");
    expect(homePathFor(factory)).toBe("/seller");
    expect(homePathFor(operator)).toBe("/admin");
    expect(homePathFor(me([]))).toBe("/register");
    expect(homePathFor(null)).toBe("/login");
  });
});

describe("postLoginPath", () => {
  it("возвращает на запрошенную страницу", () => {
    expect(postLoginPath(customer, "/account/orders")).toBe("/account/orders");
    expect(postLoginPath(factory, "/seller/orders")).toBe("/seller/orders");
  });

  it("не возвращает туда, откуда guard тут же выкинет", () => {
    expect(postLoginPath(customer, "/seller")).toBe("/account/orders");
    expect(postLoginPath(customer, "/admin")).toBe("/account/orders");
  });

  it("не зацикливается на страницах входа", () => {
    expect(postLoginPath(customer, "/login")).toBe("/account/orders");
    expect(postLoginPath(customer, "/login?redirect=%2Fseller")).toBe("/account/orders");
    expect(postLoginPath(customer, "/register")).toBe("/account/orders");
  });

  it("чужой адрес игнорирует молча", () => {
    expect(postLoginPath(customer, "https://evil.example")).toBe("/account/orders");
    expect(postLoginPath(customer, undefined)).toBe("/account/orders");
  });

  it("сохраняет query возврата", () => {
    expect(postLoginPath(customer, "/account/orders?tab=work")).toBe("/account/orders?tab=work");
  });
});
