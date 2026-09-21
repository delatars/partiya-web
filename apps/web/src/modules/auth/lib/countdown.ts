import { useEffect, useState } from "react";

/** Секунды → «0:42», как в макете login-otp. */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  return `${String(minutes)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Сколько секунд осталось до `until` (метка времени). `null` — таймера нет.
 *
 * Считаем от абсолютной метки, а не «минус секунда в тик»: вкладку могут свернуть,
 * таймеры в фоне браузер придерживает, и счётчик «минус секунда» отстаёт от реальности. */
export function useCountdown(until: number | null): number {
  const [left, setLeft] = useState(() => remaining(until));

  useEffect(() => {
    setLeft(remaining(until));
    if (until === null) return;
    const id = setInterval(() => {
      const next = remaining(until);
      setLeft(next);
      if (next <= 0) clearInterval(id);
    }, 500);
    return () => {
      clearInterval(id);
    };
  }, [until]);

  return left;
}

function remaining(until: number | null): number {
  if (until === null) return 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}
