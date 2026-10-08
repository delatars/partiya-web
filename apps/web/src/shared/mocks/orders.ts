import type { QuotePromo } from "@/shared/lib/quote";

/* Демо-данные домена «Заказы»: промокод и нумерация.

   Лежат в shared, потому что их знают и мок карточки (котировка с промокодом), и мок
   оформления, а кросс-модульные импорты правилами слоёв запрещены. */

/* ------------------------------------------------------------------ промокод */

/** Единственный рабочий промокод моков. Любой другой код — «не найден».
    ⚠ Настоящих промокодов у бэка ещё нет: правила и справочник — открытый вопрос. */
export const DEMO_PROMO: QuotePromo & { title: string } = {
  code: "ПАРТИЯ5",
  percent: 5,
  title: "Первая партия на платформе",
};

/* DECISIONS.md, п. 10: промокоды выключены фиче-флагом (`PROMO_CODES_ENABLED=false` у бэка,
   Q-343). Мок по умолчанию ведёт себя как выключенный бэк: непустой код → 422
   `quote/unknown_promo` «промокоды сейчас не принимаются». Справочник и расчёт не удалены —
   включаются флагом (тесты проверяют обе ветки). */
let promoCodesEnabled = false;

/** Включены ли промокоды в моках. */
export function mockPromoCodesEnabled(): boolean {
  return promoCodesEnabled;
}

/** Только тесты и дев-инструменты: переключить флаг промокодов мока. */
export function setMockPromoCodesEnabled(enabled: boolean): void {
  promoCodesEnabled = enabled;
}

/** Проверка кода без учёта регистра и пробелов по краям — как её сделает сервер. */
export function resolvePromo(code: string): (QuotePromo & { title: string }) | undefined {
  const normalized = code.trim().toUpperCase();
  if (normalized.length === 0) return undefined;
  return normalized === DEMO_PROMO.code ? DEMO_PROMO : undefined;
}

/* ------------------------------------------------------------------ нумерация */

/** Номера заказов моки выдают после самого свежего из истории: 4812 уже занят.

    Сама история (пять заказов макета с журналами, фотоотчётами и чатом) лежит в
    `modules/checkout/api/mock-seed.ts`: это полноценные заказы мок-бэкенда, а не строки
    таблицы, — иначе открыть из списка было бы нечего. */
export const FIRST_MOCK_ORDER_NO = 4813;

/** Образцы нумеруются своей последовательностью — она не пересекается с заказами. */
export const FIRST_MOCK_SAMPLE_NO = 318;
