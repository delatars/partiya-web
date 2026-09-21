/* Производственный календарь — на бэке (ARCHITECTURE.md, 5.5: `WorkCalendar`).
   Здесь только то, что нужно показать срок в калькуляторе, пока считает мок:
   рабочие дни без выходных и праздников. Настоящую дату отгрузки отдаёт `POST /quotes`. */

const dayMonthFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

/** Дата + N рабочих дней (суббота и воскресенье пропускаются). */
export function addWorkingDays(from: Date, days: number): Date {
  const result = new Date(from.getTime());
  let left = Math.max(0, Math.trunc(days));
  while (left > 0) {
    result.setDate(result.getDate() + 1);
    const weekday = result.getDay();
    if (weekday !== 0 && weekday !== 6) left -= 1;
  }
  return result;
}

/** «15 октября» — как в строке «отгрузка ~2 октября» макета. */
export function formatDayMonth(date: Date): string {
  return dayMonthFormatter.format(date);
}

/** ISO `YYYY-MM-DD` по местной дате: в контракте даты без времени именно такие. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(date.getFullYear())}-${month}-${day}`;
}

/** ISO `YYYY-MM-DD` → «15 октября»; мусор возвращаем как есть. */
export function formatIsoDayMonth(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? iso : formatDayMonth(date);
}

/** ISO `YYYY-MM-DD` → «12.06.2026» — так дата аудита выглядит в макете. */
export function formatIsoDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${String(date.getFullYear())}`;
}

/* ─────────────────── трекинг: время события, день ленты, окно приёмки ─────────────────── */

const timeFormatter = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });
const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** «16:10» — время слева от события ленты. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : timeFormatter.format(date);
}

/** «21 сентября, 16:10» — момент целиком: дедлайны, подписи под датами. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateTimeFormatter.format(date);
}

/** «12.09» — короткая дата под этапом ленты и слева от старого события. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Ключ дня по местному времени: `2026-09-21`. По нему лента группируется в заголовки. */
export function dayKey(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : toIsoDate(date);
}

/** Заголовок группы ленты: «Сегодня, 21 сентября», «Вчера, 20 сентября», «19 сентября».
 *
 * «Сегодня» считается от переданного момента, а не от `Date.now()`: тесты не должны
 * зависеть от того, в котором часу их запустили. */
export function formatDayGroup(key: string, now: Date = new Date()): string {
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  const today = toIsoDate(now);
  const yesterday = toIsoDate(new Date(now.getTime() - 24 * 60 * 60_000));
  const human = formatDayMonth(date);
  if (key === today) return `Сегодня, ${human}`;
  if (key === yesterday) return `Вчера, ${human}`;
  // прошлый год — иначе «19 сентября» из 2025-го неотличимо от нынешнего
  if (date.getFullYear() !== now.getFullYear()) return `${human} ${String(date.getFullYear())}`;
  return human;
}

/** Сколько рабочих дней осталось до срока; прошедший срок — 0.
 *
 * Считаются календарные дни от завтрашнего до дня дедлайна включительно: дедлайн
 * «через 5 рабочих дней» должен читаться как «осталось 5», а не 6. Время внутри дня
 * не учитывается — иначе ответ менялся бы в течение суток. */
export function workingDaysLeft(deadlineIso: string, now: Date = new Date()): number {
  const deadline = new Date(deadlineIso);
  if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= now.getTime()) return 0;
  const cursor = new Date(now.getTime());
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(deadline.getTime());
  end.setHours(0, 0, 0, 0);
  let days = 0;
  while (cursor.getTime() < end.getTime()) {
    cursor.setDate(cursor.getDate() + 1);
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}
