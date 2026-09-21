import { describe, expect, it } from "vitest";

import {
  atLeast,
  can,
  PERMISSION_TABLE_ROWS,
  ROLE_ORDER,
  ROLE_TITLES,
  type Permission,
} from "./roles";

/* Сверка с partiya-api/crates/iam/src/domain/role.rs. Та же таблица — те же тесты:
   если бэк поменяет права, а фронт нет, красным станет здесь, а не у пользователя. */

describe("роли", () => {
  it("у каждой роли есть человеческое название", () => {
    for (const role of ROLE_ORDER) expect(ROLE_TITLES[role]).toBeTruthy();
    expect(ROLE_TITLES.manager).toBe("Закупщик");
  });

  it("владелец старше всех, наблюдатель — никого", () => {
    for (const role of ROLE_ORDER) {
      expect(atLeast("owner", role)).toBe(true);
      expect(atLeast(role, "viewer")).toBe(true);
    }
    expect(atLeast("accountant", "manager")).toBe(false);
    expect(atLeast("manager", "technologist")).toBe(true);
  });

  it("равный ранг не значит равные права", () => {
    expect(can("accountant", "sign_documents")).toBe(true);
    expect(can("technologist", "sign_documents")).toBe(false);
    expect(can("technologist", "run_production")).toBe(true);
    expect(can("accountant", "run_production")).toBe(false);
  });

  /** Построчная сверка с таблицей «Что может каждая роль» из макета account.company. */
  it("совпадает с таблицей макета", () => {
    const table: [Permission, boolean, boolean, boolean][] = [
      // право, владелец, закупщик, бухгалтер
      ["place_orders", true, true, false],
      ["accept_and_dispute", true, true, false],
      ["sign_documents", true, false, true],
      ["view_finance", true, true, true],
      ["manage_organization", true, false, false],
    ];
    expect(table.map(([permission]) => permission)).toEqual([...PERMISSION_TABLE_ROWS]);
    for (const [permission, owner, manager, accountant] of table) {
      expect(can("owner", permission)).toBe(owner);
      expect(can("manager", permission)).toBe(manager);
      expect(can("accountant", permission)).toBe(accountant);
    }
  });

  it("наблюдатель видит финансы и больше ничего", () => {
    expect(can("viewer", "view_finance")).toBe(true);
    expect(can("viewer", "place_orders")).toBe(false);
    expect(can("viewer", "manage_organization")).toBe(false);
  });
});
