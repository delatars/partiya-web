import { useCallback, useEffect, useRef } from "react";

/* Отложенный вызов: автосохранение шага не должно слать PATCH на каждую букву.

   Пауза та же, что у калькулятора карточки, — человек успевает дописать слово, а сервер
   получает одно изменение вместо десяти. Таймер снимается при размонтировании: ушёл
   со страницы — запроса быть не должно. */

/** Пауза автосохранения. Заметно больше, чем у котировки: PATCH тяжелее расчёта. */
export const AUTOSAVE_DELAY_MS = 600;

export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delayMs: number = AUTOSAVE_DELAY_MS,
): { run: (...args: A) => void; flush: () => void; cancel: () => void } {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<A | undefined>(undefined);
  // колбэк меняется каждый рендер — держим свежий в ref, чтобы не пересоздавать таймер
  const latest = useRef(callback);
  latest.current = callback;

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    pending.current = undefined;
  }, []);

  const flush = useCallback(() => {
    const args = pending.current;
    clearTimeout(timer.current);
    pending.current = undefined;
    if (args) latest.current(...args);
  }, []);

  const run = useCallback(
    (...args: A) => {
      pending.current = args;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        pending.current = undefined;
        latest.current(...args);
      }, delayMs);
    },
    [delayMs],
  );

  return { run, flush, cancel };
}

/* ─────────────────────────────── принятая оферта ─────────────────────────────── */

const ACCEPT_KEY = "partiya.checkout.accepted";

/** Принятие оферты сервер пока не хранит (см. lib/steps.ts, Q-C5), поэтому галочка
    переживает перезагрузку только здесь. Хранилище может быть запрещено — всё в try. */
export function readOfferAccepted(orderId: number): boolean {
  try {
    return sessionStorage.getItem(`${ACCEPT_KEY}.${String(orderId)}`) === "1";
  } catch {
    return false;
  }
}

export function writeOfferAccepted(orderId: number, accepted: boolean): void {
  try {
    const key = `${ACCEPT_KEY}.${String(orderId)}`;
    if (accepted) sessionStorage.setItem(key, "1");
    else sessionStorage.removeItem(key);
  } catch {
    /* приватная вкладка — галочка просто не переживёт перезагрузку */
  }
}
