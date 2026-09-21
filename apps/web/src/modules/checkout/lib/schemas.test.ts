import { describe, expect, it } from "vitest";

import {
  deliveryStepSchema,
  paramsStepSchema,
  parseQty,
  payerPatchOf,
  payerStepSchema,
  sampleFormSchema,
  sumQty,
} from "./schemas";

/* Схемы шагов — то, что человек видит до запроса. Каждая проверка здесь имеет пару
   на сервере (мок-бэкенд, `missingFields`): расхождение означало бы форму, которая
   пропускает то, что сервер отвергнет. */

describe("количество в строке разбивки", () => {
  it("читает число с любыми пробелами", () => {
    expect(parseQty("600")).toBe(600);
    expect(parseQty("1 000")).toBe(1000);
    expect(parseQty("1 000")).toBe(1000);
  });

  it("не читает мусор и дроби", () => {
    expect(parseQty("")).toBeUndefined();
    expect(parseQty("600,5")).toBeUndefined();
    expect(parseQty("-10")).toBeUndefined();
    expect(parseQty("шесть")).toBeUndefined();
  });

  it("суммирует строки и сдаётся на первой нечитаемой", () => {
    expect(sumQty([{ qty: "600" }, { qty: "400" }])).toBe(1000);
    expect(sumQty([{ qty: "600" }, { qty: "?" }])).toBeUndefined();
  });
});

describe("шаг «Параметры партии»", () => {
  const valid = {
    colors: [
      { name: "белый", qty: "600" },
      { name: "чёрный", qty: "400" },
    ],
    sizes: [
      { name: "S", qty: "200" },
      { name: "M", qty: "300" },
      { name: "L", qty: "300" },
      { name: "XL", qty: "200" },
    ],
    fit: "классический",
    print: "шелкография, 2 цвета, грудь",
    comment: "",
  };

  it("принимает сходящуюся разбивку", () => {
    expect(paramsStepSchema(1000).safeParse(valid).success).toBe(true);
  });

  it("отвергает разбивку, которая не сходится с объёмом", () => {
    const result = paramsStepSchema(1000).safeParse({
      ...valid,
      colors: [{ name: "белый", qty: "900" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((item) => item.path[0] === "colors");
      expect(issue?.message).toContain("суммы должны сойтись");
    }
  });

  it("отвергает нечисловое количество", () => {
    const result = paramsStepSchema(1000).safeParse({
      ...valid,
      sizes: [{ name: "S", qty: "много" }],
    });
    expect(result.success).toBe(false);
  });

  it("требует непустой крой и нанесение", () => {
    expect(paramsStepSchema(1000).safeParse({ ...valid, fit: "" }).success).toBe(false);
    expect(paramsStepSchema(1000).safeParse({ ...valid, print: " " }).success).toBe(false);
  });

  it("считает разбивку под другой объём заново", () => {
    expect(paramsStepSchema(500).safeParse(valid).success).toBe(false);
  });
});

describe("шаг «Доставка»", () => {
  const base = {
    optionId: "wb",
    kind: "marketplace_warehouse" as const,
    address: "",
    recipientName: "",
    recipientPhone: "",
    comment: "",
  };

  it("склад маркетплейса не требует адреса", () => {
    expect(deliveryStepSchema.safeParse(base).success).toBe(true);
  });

  it("самовывоз тоже не требует", () => {
    expect(
      deliveryStepSchema.safeParse({ ...base, optionId: "pickup", kind: "pickup" }).success,
    ).toBe(true);
  });

  it("доставка до двери требует адрес, получателя и телефон", () => {
    const result = deliveryStepSchema.safeParse({ ...base, optionId: "address", kind: "address" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toContain("address");
      expect(fields).toContain("recipientName");
      expect(fields).toContain("recipientPhone");
    }
  });

  it("проверяет российский телефон", () => {
    const toDoor = {
      ...base,
      optionId: "address",
      kind: "address" as const,
      address: "Москва, Лесная, 9",
      recipientName: "Анна",
    };
    expect(deliveryStepSchema.safeParse({ ...toDoor, recipientPhone: "12345" }).success).toBe(
      false,
    );
    expect(
      deliveryStepSchema.safeParse({ ...toDoor, recipientPhone: "+7 916 000-12-34" }).success,
    ).toBe(true);
    expect(deliveryStepSchema.safeParse({ ...toDoor, recipientPhone: "89160001234" }).success).toBe(
      true,
    );
  });
});

describe("шаг «Плательщик и документы»", () => {
  const valid = {
    orgId: "org-1",
    legalAddress: "125047, Москва, ул. Лесная, д. 9",
    accountantEmail: "",
    accepted: true,
  };

  it("принимает заполненную форму без почты бухгалтера", () => {
    expect(payerStepSchema.safeParse(valid).success).toBe(true);
  });

  it("требует юридический адрес", () => {
    expect(payerStepSchema.safeParse({ ...valid, legalAddress: "  " }).success).toBe(false);
  });

  it("требует принятия оферты", () => {
    const result = payerStepSchema.safeParse({ ...valid, accepted: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("оферты");
    }
  });

  it("проверяет почту, если она указана", () => {
    expect(payerStepSchema.safeParse({ ...valid, accountantEmail: "buh@" }).success).toBe(false);
    expect(payerStepSchema.safeParse({ ...valid, accountantEmail: "buh@kora.ru" }).success).toBe(
      true,
    );
  });
});

describe("форма образца", () => {
  const valid = {
    qty: 2,
    sizes: "M, L",
    color: "белый",
    print: "Шелкография 2 цв.",
    deliveryId: "cdek-pvz",
    address: "Москва, ул. Лесная, 9",
    recipientName: "Анна Кораблёва",
    recipientPhone: "+7 916 000-12-34",
    comment: "",
    payment: "card" as const,
  };

  it("принимает заполненную форму", () => {
    expect(sampleFormSchema.safeParse(valid).success).toBe(true);
  });

  it("образцов не больше трёх", () => {
    expect(sampleFormSchema.safeParse({ ...valid, qty: 4 }).success).toBe(false);
    expect(sampleFormSchema.safeParse({ ...valid, qty: 0 }).success).toBe(false);
  });

  it("адрес и получатель обязательны", () => {
    expect(sampleFormSchema.safeParse({ ...valid, address: "" }).success).toBe(false);
    expect(sampleFormSchema.safeParse({ ...valid, recipientName: "" }).success).toBe(false);
  });
});

/* ─────────────────────────────── плательщик (Q-230) ─────────────────────────────── */

describe("payerPatchOf", () => {
  const filled = {
    orgId: "org-1",
    legalAddress: "125047, Москва, ул. Лесная, д. 9",
    accountantEmail: "buh@kora.ru",
  };

  it("собирает тело PATCH из заполненных реквизитов", () => {
    expect(payerPatchOf({ ...filled, accepted: true })).toEqual({
      orgId: "org-1",
      legalAddress: "125047, Москва, ул. Лесная, д. 9",
      accountantEmail: "buh@kora.ru",
    });
  });

  it("Q-230: реквизиты сохраняются и без принятой оферты — порядок действий не важен", () => {
    // адрес заполнен ДО галочки: PATCH обязан уйти, иначе «Оплатить» не разблокируется
    expect(payerPatchOf({ ...filled, accepted: false })).not.toBeNull();
    // та же форма целиком галочку не проходит — и это нормально: она на сервер не идёт
    expect(payerStepSchema.safeParse({ ...filled, accepted: false }).success).toBe(false);
  });

  it("пустая почта бухгалтера уходит как null, а не пустой строкой", () => {
    expect(payerPatchOf({ ...filled, accountantEmail: "" })?.accountantEmail).toBeNull();
  });

  it("без адреса отправлять нечего", () => {
    expect(payerPatchOf({ ...filled, legalAddress: "  " })).toBeNull();
    expect(payerPatchOf({ ...filled, orgId: "" })).toBeNull();
  });

  it("битая почта бухгалтера блокирует PATCH", () => {
    expect(payerPatchOf({ ...filled, accountantEmail: "buh@" })).toBeNull();
  });
});
