import { describe, expect, it } from "vitest";

import { accountKeyOk, ogrnError, validateRequisites } from "./requisites";

/* Примеры — из тестов partiya-api/crates/iam/src/domain/requisites.rs. */

const LEGAL_INN = "7707083893";
const SOLE_INN = "770123456703";
const BIK = "044525225";
const CORR = "30101810400000000225";
const ACCOUNT = "40702810200000012345";

const bank = (account: string, corr: string | null = CORR) => ({
  bankName: "ПАО Сбербанк",
  bik: BIK,
  account,
  correspondentAccount: corr,
});

describe("реквизиты организации (п. 24)", () => {
  it("настоящие ОГРН и ОГРНИП проходят", () => {
    expect(ogrnError("1027700132195", LEGAL_INN)).toBeNull();
    expect(ogrnError("304500116000157", SOLE_INN)).toBeNull();
  });

  it("опечатка в ОГРН и не та длина для вида ИНН — ошибки", () => {
    expect(ogrnError("1027700132196", LEGAL_INN)).toMatch(/контрольная цифра/u);
    expect(ogrnError("1027700132195", SOLE_INN)).toMatch(/нужно 15/u);
    expect(ogrnError("10277OO132195", LEGAL_INN)).toMatch(/только из цифр/u);
  });

  it("полный набор принимается", () => {
    expect(
      validateRequisites(LEGAL_INN, {
        ogrn: "1027700132195",
        kpp: "773601001",
        legalAddress: "117312, г. Москва, ул. Вавилова, д. 19",
        bank: bank(ACCOUNT),
      }),
    ).toEqual({});
  });

  it("пустая форма — «реквизитов нет», а не ошибки", () => {
    expect(validateRequisites(LEGAL_INN, { bank: { bankName: " ", bik: "" } })).toEqual({});
  });

  it("счёт сверяется с БИК, корсчёт обязателен у коммерческого банка", () => {
    expect(accountKeyOk("225", ACCOUNT)).toBe(true);
    expect(validateRequisites(LEGAL_INN, { bank: bank("40702810200000012346") })).toEqual({
      "bank.account": ["расчётный счёт не сходится с БИК — проверьте обе цифры"],
    });
    expect(validateRequisites(LEGAL_INN, { bank: bank(ACCOUNT, "30101810400000000226") })).toEqual({
      "bank.correspondentAccount": [
        "корреспондентский счёт не сходится с БИК — проверьте обе цифры",
      ],
    });
    expect(validateRequisites(LEGAL_INN, { bank: bank(ACCOUNT, null) })).toEqual({
      "bank.correspondentAccount": ["укажите корреспондентский счёт банка"],
    });
  });

  it("у ИП КПП запрещён; ошибки всех полей приходят разом", () => {
    const errors = validateRequisites(SOLE_INN, {
      ogrn: "123",
      kpp: "773601001",
      bank: { bankName: "", bik: "12", account: ACCOUNT },
    });
    expect(Object.keys(errors).sort()).toEqual(["bank.bankName", "bank.bik", "kpp", "ogrn"]);
  });
});
