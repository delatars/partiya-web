import type { OrgBankAccount, UpdateOrgRequisitesBody } from "@partiya/api-contracts";

/* Проверка реквизитов организации — зеркало `iam::domain::requisites` (DECISIONS.md, п. 24).

   Решает всегда бэк (422 `orgs/requisites-invalid` с ошибками по полям). Копия здесь —
   для мока и для подсказки в форме до отправки: тексты и имена полей те же, что у бэка
   (`RequisitesError::field`), поэтому экран раскладывает и свои, и серверные ошибки
   одним кодом. Расхождение с бэком ловит тест рядом. */

export const MAX_ADDRESS = 500;
export const MAX_BANK_NAME = 200;

export type RequisitesErrors = Record<string, string[]>;

const present = (raw: string | null | undefined): string | null => {
  const value = raw?.trim() ?? "";
  return value.length > 0 ? value : null;
};

const isDigits = (value: string) => /^\d+$/u.test(value);

/** ИНН из 12 цифр — индивидуальный предприниматель. */
export function isSoleTraderInn(inn: string): boolean {
  return inn.trim().length === 12;
}

/** ОГРН (13 цифр, модуль 11) или ОГРНИП (15 цифр, модуль 13); `null` — всё верно. */
export function ogrnError(raw: string, inn: string): string | null {
  const value = raw.trim();
  if (!isDigits(value)) return "ОГРН состоит только из цифр";
  const sole = isSoleTraderInn(inn);
  const expected = sole ? 15 : 13;
  const modulus = sole ? 13n : 11n;
  if (value.length !== expected) {
    return `ОГРН юрлица — 13 цифр, ОГРНИП — 15; для этого ИНН нужно ${String(expected)}, получено ${String(value.length)}`;
  }
  const body = BigInt(value.slice(0, -1));
  const check = BigInt(value.slice(-1));
  return (body % modulus) % 10n === check
    ? null
    : "контрольная цифра ОГРН не сходится — проверьте, нет ли опечатки";
}

const WEIGHTS = [7, 1, 3];

/** Ключевание счёта по правилу Банка России: сумма «приставка + счёт» по весам 7 1 3 делится на 10. */
export function accountKeyOk(prefix: string, account: string): boolean {
  const digits = `${prefix}${account}`;
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    sum += Number(digits[index]) * (WEIGHTS[index % 3] ?? 0);
  }
  return sum % 10 === 0;
}

/** БИК подразделения Банка России: последние три цифры `000`–`002`. */
function isCentralBankUnit(bik: string): boolean {
  return /^\d{6}00[0-2]$/u.test(bik);
}

/** Приставка РКЦ: `0` + 5-я и 6-я цифры БИК. */
function rkcPrefix(bik: string): string {
  return `0${bik.slice(4, 6)}`;
}

function push(errors: RequisitesErrors, field: string, message: string): void {
  (errors[field] ??= []).push(message);
}

/** Все ошибки полей разом (как `Requisites::parse`); пустой объект — реквизиты верны. */
export function validateRequisites(inn: string, input: UpdateOrgRequisitesBody): RequisitesErrors {
  const errors: RequisitesErrors = {};

  const ogrn = present(input.ogrn);
  if (ogrn !== null) {
    const error = ogrnError(ogrn, inn);
    if (error !== null) push(errors, "ogrn", error);
  }

  const kpp = present(input.kpp);
  if (kpp !== null) {
    if (isSoleTraderInn(inn)) push(errors, "kpp", "у индивидуального предпринимателя нет КПП");
    else if (!/^\d{9}$/u.test(kpp)) push(errors, "kpp", "КПП состоит из 9 цифр");
  }

  const address = present(input.legalAddress);
  if (address !== null && [...address].length > MAX_ADDRESS) {
    push(errors, "legalAddress", `адрес длиннее ${String(MAX_ADDRESS)} символов`);
  }

  const bank = input.bank;
  const name = present(bank?.bankName);
  const bik = present(bank?.bik);
  const account = present(bank?.account);
  const corr = present(bank?.correspondentAccount);
  // пустой блок целиком — «счёта нет», а не четыре ошибки
  if (name === null && bik === null && account === null && corr === null) return errors;

  if (name === null) push(errors, "bank.bankName", "укажите название банка");
  else if ([...name].length > MAX_BANK_NAME) {
    push(errors, "bank.bankName", `название банка длиннее ${String(MAX_BANK_NAME)} символов`);
  }
  let bikOk: string | null = null;
  if (bik === null) push(errors, "bank.bik", "укажите БИК");
  else if (bik.length === 9 && isDigits(bik)) bikOk = bik;
  else push(errors, "bank.bik", "БИК — 9 цифр");

  let accountOk: string | null = null;
  if (account === null) push(errors, "bank.account", "укажите расчётный счёт");
  else if (account.length === 20 && isDigits(account)) accountOk = account;
  else push(errors, "bank.account", "расчётный счёт — 20 цифр");

  let corrOk: string | null = null;
  if (corr !== null) {
    if (corr.length === 20 && isDigits(corr) && corr.startsWith("30101")) corrOk = corr;
    else {
      push(
        errors,
        "bank.correspondentAccount",
        "корреспондентский счёт — 20 цифр и начинается с 30101",
      );
    }
  }

  if (bikOk !== null) {
    const central = isCentralBankUnit(bikOk);
    if (accountOk !== null) {
      const prefix = central ? rkcPrefix(bikOk) : bikOk.slice(6, 9);
      if (!accountKeyOk(prefix, accountOk)) {
        push(errors, "bank.account", "расчётный счёт не сходится с БИК — проверьте обе цифры");
      }
    }
    if (corrOk !== null) {
      if (!accountKeyOk(rkcPrefix(bikOk), corrOk)) {
        push(
          errors,
          "bank.correspondentAccount",
          "корреспондентский счёт не сходится с БИК — проверьте обе цифры",
        );
      }
    } else if (!central && corr === null) {
      push(errors, "bank.correspondentAccount", "укажите корреспондентский счёт банка");
    }
  }
  return errors;
}

/** Нормализованный банковский блок: пустой — `null` («счёта нет»). Вызывать после проверки. */
export function normalizeBank(input: UpdateOrgRequisitesBody["bank"]): OrgBankAccount | null {
  const name = present(input?.bankName);
  const bik = present(input?.bik);
  const account = present(input?.account);
  const corr = present(input?.correspondentAccount);
  if (name === null || bik === null || account === null) return null;
  return { bankName: name, bik, account, correspondentAccount: corr };
}

/** Поле может пустым — `null`; иначе обрезанная строка. */
export const presentOrNull = present;
