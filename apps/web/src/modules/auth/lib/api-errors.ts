import { isApiError } from "@/shared/api";

/* Ошибка бэка → ошибки полей формы.
 *
 * Бэк отдаёт RFC 7807 без разбивки по полям (`kernel::Problem` — это type/title/status/detail),
 * поэтому единственная зацепка — текст detail: «ИНН: контрольная сумма…», «КПП: КПП состоит
 * из 9 цифр», «телефон должен быть российским…». Раскладываем его по полям по явной таблице
 * и обязательно оставляем текст целиком в общем сообщении: если правило не сработает,
 * человек всё равно прочитает, что не так.
 *
 * Если у бэка однажды появится `errors` (поле в ProblemDetails под это уже есть), он победит
 * эвристику — читается первым. */

export interface FormErrors<TField extends string> {
  /** Ошибки по полям формы. */
  fields: Partial<Record<TField, string>>;
  /** Что показать над формой; `undefined` — всё разложилось по полям. */
  message: string | undefined;
  /** HTTP-статус, если ответ вообще пришёл от сервера. */
  status: number | undefined;
}

export type DetailRule<TField extends string> = readonly [RegExp, TField];

export function toFormErrors<TField extends string>(
  error: unknown,
  rules: readonly DetailRule<TField>[] = [],
): FormErrors<TField> {
  if (!isApiError(error)) {
    return {
      fields: {},
      message: error instanceof Error ? error.message : "Не получилось выполнить запрос",
      status: undefined,
    };
  }

  const fields: Partial<Record<TField, string>> = {};
  const serverFields = error.fieldErrors;
  if (serverFields) {
    for (const [name, messages] of Object.entries(serverFields)) {
      const first = messages[0];
      if (first !== undefined) fields[name as TField] = capitalize(first);
    }
    return { fields, message: undefined, status: error.status };
  }

  const detail = error.problem?.detail ?? error.message;
  for (const [pattern, field] of rules) {
    if (pattern.test(detail)) {
      fields[field] = capitalize(stripFieldPrefix(detail));
      return { fields, message: undefined, status: error.status };
    }
  }

  return { fields, message: capitalize(detail), status: error.status };
}

/** «ИНН: контрольная сумма не сходится» → «Контрольная сумма не сходится». */
function stripFieldPrefix(detail: string): string {
  const separator = detail.indexOf(": ");
  if (separator === -1 || separator > 12) return detail;
  return detail.slice(separator + 2);
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

/** Сколько секунд ждать до повторной отправки: бэк называет их в тексте 409
    («повторная отправка кода возможна через 42 с»). Не нашли — берём политику бэка. */
export function retryAfterSeconds(error: unknown, fallback: number): number {
  if (!isApiError(error)) return fallback;
  const detail = error.problem?.detail ?? "";
  const match = /(\d+)\s*с/u.exec(detail);
  const parsed = match?.[1] === undefined ? Number.NaN : Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
