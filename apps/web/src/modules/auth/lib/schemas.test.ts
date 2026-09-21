import { describe, expect, it } from "vitest";

import {
  capacitySchema,
  codeSchema,
  identifierSchema,
  isValidEmail,
  isValidInn,
  normalizeIdentifier,
  normalizePhone,
  organizationSchema,
  parseUnits,
} from "./schemas";

/* Те же случаи, что в partiya-api: crates/iam/src/domain/{identifier,inn,org}.rs.
   Расхождение фронта с бэком ловится здесь, а не отказом формы после отправки. */

describe("идентификатор входа", () => {
  it("все привычные записи номера сводятся к E.164", () => {
    for (const raw of [
      "+7 916 000-12-34",
      "8 (916) 000 12 34",
      "89160001234",
      "79160001234",
      "+79160001234",
      "9160001234",
      "916 000 12 34",
    ]) {
      expect(normalizePhone(raw)).toBe("+79160001234");
    }
  });

  it("кривые номера отвергаются", () => {
    for (const raw of ["12345", "+7 916 000 12 34 56", "0160001234", "звоните"]) {
      expect(normalizePhone(raw)).toBeUndefined();
    }
  });

  it("почта приводится к нижнему регистру, локальная часть не трогается", () => {
    expect(normalizeIdentifier("  A.Korableva@Kora.RU ")).toBe("a.korableva@kora.ru");
    expect(normalizeIdentifier("buh+wb@kora.ru")).toBe("buh+wb@kora.ru");
    expect(normalizeIdentifier("a.b@kora.ru")).not.toBe(normalizeIdentifier("ab@kora.ru"));
  });

  it("битая почта отвергается", () => {
    for (const raw of ["@kora.ru", "a@", "a@kora", "a@.ru", "a@kora..ru", "a@kora.ru."]) {
      expect(isValidEmail(raw)).toBe(false);
    }
    expect(isValidEmail("a.korableva@kora.ru")).toBe(true);
  });

  it("схема формы объясняет ошибку в терминах введённого", () => {
    expect(identifierSchema.safeParse({ identifier: "+79160001234" }).success).toBe(true);
    expect(identifierSchema.safeParse({ identifier: "a.korableva@kora.ru" }).success).toBe(true);

    const email = identifierSchema.safeParse({ identifier: "a@kora" });
    expect(email.success).toBe(false);
    expect(email.error?.issues[0]?.message).toContain("Почта");

    const phone = identifierSchema.safeParse({ identifier: "12345" });
    expect(phone.success).toBe(false);
    expect(phone.error?.issues[0]?.message).toContain("Телефон");

    expect(identifierSchema.safeParse({ identifier: "  " }).success).toBe(false);
  });
});

describe("ИНН", () => {
  /** Якорь алгоритма: настоящие публично известные ИНН. */
  it("настоящие ИНН проходят", () => {
    for (const raw of ["7707083893", "7736207543", "7728168971", "3702012348"]) {
      expect(isValidInn(raw)).toBe(true);
    }
  });

  it("ИНН из макета контрольную сумму НЕ проходит", () => {
    // ради этого и дублируется проверка: подставить его в форму нельзя
    expect(isValidInn("7701234567")).toBe(false);
  });

  it("двенадцатизначный проверяется по обеим цифрам", () => {
    expect(isValidInn("770123456703")).toBe(true);
    expect(isValidInn("370201234509")).toBe(true);
    expect(isValidInn("770123456713")).toBe(false);
    expect(isValidInn("770123456704")).toBe(false);
  });

  it("перестановка соседних цифр ловится", () => {
    expect(isValidInn("7707083893")).toBe(true);
    expect(isValidInn("7707088393")).toBe(false);
  });

  it("длина и состав проверяются до арифметики", () => {
    expect(isValidInn("77012345")).toBe(false);
    expect(isValidInn("77012345601")).toBe(false);
    expect(isValidInn("")).toBe(false);
    expect(isValidInn("77012345AB")).toBe(false);
    expect(isValidInn("7701 234 560")).toBe(false);
  });
});

describe("форма организации", () => {
  const base = {
    kind: "customer" as const,
    name: "ООО «Кора»",
    inn: "7707083893",
    kpp: "770101001",
    accepted: true as const,
  };

  it("принимает корректную заявку", () => {
    expect(organizationSchema.safeParse(base).success).toBe(true);
  });

  it("сообщает про контрольную сумму, а не про длину", () => {
    const result = organizationSchema.safeParse({ ...base, inn: "7701234567" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Контрольная сумма");
  });

  it("длина ИНН проверяется отдельным сообщением", () => {
    const result = organizationSchema.safeParse({ ...base, inn: "77012345" });
    expect(result.error?.issues.some((issue) => issue.message.includes("10 цифр"))).toBe(true);
  });

  it("КПП — девять цифр, и он необязателен", () => {
    expect(organizationSchema.safeParse({ ...base, kpp: "" }).success).toBe(true);
    const short = organizationSchema.safeParse({ ...base, kpp: "77010100" });
    expect(short.success).toBe(false);
    expect(short.error?.issues[0]?.path).toEqual(["kpp"]);
  });

  it("у ИП КПП отвергается, а не выбрасывается молча", () => {
    const result = organizationSchema.safeParse({
      ...base,
      inn: "770123456703",
      kpp: "770101001",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["kpp"]);
  });

  it("без названия и без оферты заявку не собрать", () => {
    expect(organizationSchema.safeParse({ ...base, name: "  " }).success).toBe(false);
    expect(organizationSchema.safeParse({ ...base, accepted: false }).success).toBe(false);
  });
});

describe("код и мощность", () => {
  it("код — ровно столько цифр, сколько сказал бэк", () => {
    const schema = codeSchema(6);
    expect(schema.safeParse({ code: "000000" }).success).toBe(true);
    expect(schema.safeParse({ code: "00000" }).success).toBe(false);
    expect(schema.safeParse({ code: "00000a" }).success).toBe(false);
    expect(codeSchema(4).safeParse({ code: "1234" }).success).toBe(true);
  });

  it("мощность читается с разделителем разрядов из макета", () => {
    expect(parseUnits("40 000")).toBe(40000);
    expect(parseUnits("40 000")).toBe(40000);
    expect(parseUnits("сорок")).toBeUndefined();
    expect(capacitySchema.safeParse({ monthly: "40 000", busy: "12 000" }).success).toBe(true);
    // «уже занято» необязательно
    expect(capacitySchema.safeParse({ monthly: "40000", busy: "" }).success).toBe(true);
  });

  it("занято не может быть больше мощности", () => {
    const result = capacitySchema.safeParse({ monthly: "10 000", busy: "12 000" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["busy"]);
    expect(capacitySchema.safeParse({ monthly: "0", busy: "" }).success).toBe(false);
  });
});
