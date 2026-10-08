import type { OrderStatus } from "@partiya/api-contracts";
import { describe, expect, it } from "vitest";

import { isPrimaryAction, orderActions } from "./order-actions";

/* Проекция «статус → доступные действия». Она решает, какие кнопки видит заказчик, и
   должна совпадать с тем, что примет автомат (ARCHITECTURE.md, 5.2): кнопка, на которую
   сервер отвечает 409, хуже отсутствующей кнопки. */

describe("действия по статусу заказа", () => {
  it("черновик продолжают, счёт оплачивают", () => {
    expect(orderActions({ status: "draft" })).toEqual(["continue_draft"]);
    expect(orderActions({ status: "awaiting_payment" })).toEqual(["pay"]);
  });

  it("макет согласовывает заказчик — и только в artwork_review", () => {
    expect(orderActions({ status: "artwork_review" })[0]).toBe("approve_artwork");
    expect(orderActions({ status: "materials" })).not.toContain("approve_artwork");
  });

  it("спор открывают из производства и из приёмки — как в диаграмме 5.2", () => {
    expect(orderActions({ status: "in_production" })).toContain("dispute");
    expect(orderActions({ status: "acceptance" })).toContain("dispute");
    expect(orderActions({ status: "quality_control" })).not.toContain("dispute");
    expect(orderActions({ status: "shipped" })).not.toContain("dispute");
  });

  it("принять партию можно только в приёмке и только пока окно открыто", () => {
    expect(orderActions({ status: "acceptance" })[0]).toBe("accept");
    expect(orderActions({ status: "acceptance", acceptanceOpen: false })).toEqual(["message"]);
    expect(orderActions({ status: "in_production" })).not.toContain("accept");
  });

  it("открытый спор перекрывает всё: сначала решение, потом действия", () => {
    expect(orderActions({ status: "acceptance", disputeOpen: true })).toEqual([
      "view_dispute",
      "message",
    ]);
  });

  it("повторить можно завершённый заказ", () => {
    expect(orderActions({ status: "completed" })).toEqual(["repeat"]);
  });

  it("отмена — только когда её разрешил сервер (п. 17), и всегда последней", () => {
    expect(orderActions({ status: "awaiting_payment", canCancel: true })).toEqual([
      "pay",
      "cancel",
    ]);
    expect(orderActions({ status: "draft", canCancel: true })).toEqual([
      "continue_draft",
      "cancel",
    ]);
    expect(orderActions({ status: "awaiting_confirmation" })).not.toContain("cancel");
    expect(isPrimaryAction("cancel", orderActions({ status: "draft", canCancel: true }))).toBe(
      false,
    );
  });

  it("своя подпись под макетом уже стоит — кнопки «Согласовать» нет (п. 16)", () => {
    expect(orderActions({ status: "artwork_review", artworkSignedByCustomer: true })).toEqual([
      "message",
    ]);
  });

  it("у закрытых заказов действий нет", () => {
    const closed: OrderStatus[] = ["declined", "refunded", "cancelled"];
    for (const status of closed) expect(orderActions({ status })).toEqual([]);
  });

  it("первое действие — главное: оно рисуется cta", () => {
    const actions = orderActions({ status: "acceptance" });
    expect(isPrimaryAction("accept", actions)).toBe(true);
    expect(isPrimaryAction("dispute", actions)).toBe(false);
  });
});
