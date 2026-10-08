import { isFeatureEnabled } from "@partiya/shared";

/* Фиче-флаги фронта. Значения — в runtime-конфиге `/config.json` (`features`), по
   умолчанию всё выключено. Имена флагов — только здесь. */

/** Промокоды (DECISIONS.md, п. 10): выключены фиче-флагом, код не удалён. У бэка тот же
    флаг — `PROMO_CODES_ENABLED`; признака в API нет (Q-343), поэтому фронт держит свой.
    Включить: `"features": { "promoCodes": true }` в config.json — синхронно с бэком. */
export const PROMO_CODES_FLAG = "promoCodes";

/** Показывать ли поле промокода. Конфиг не загружен (тесты) — выключено. */
export function promoCodesEnabled(): boolean {
  try {
    return isFeatureEnabled(PROMO_CODES_FLAG);
  } catch {
    return false;
  }
}
