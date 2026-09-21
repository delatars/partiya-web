/* SSE-клиент на fetch + ReadableStream.
 *
 * Почему не `EventSource`: он не умеет ни заголовков, ни `credentials: "include"` в части
 * браузеров, не даёт прочитать код ответа (401 от него неотличим от обрыва) и не
 * отменяется ничем, кроме `close()`. Здесь всё это есть, а восстановление после обрыва
 * устроено так же, как в спецификации: последний увиденный `id` уходит обратно
 * заголовком `Last-Event-ID`, и сервер дочитывает журнал с него (ARCHITECTURE.md, 8.3).
 *
 * Два канала на бэке: `GET /orders/{id}/stream` и `GET /me/stream`.
 *
 * Переподключение — с нарастающей паузой и джиттером: если упал сервер, сотня вкладок
 * не должна ломиться в него одновременно каждые три секунды. */

export interface SseEvent {
  id?: string;
  event: string;
  data: string;
}

export type StreamState = "connecting" | "open" | "closed";

export interface StreamOptions {
  url: string;
  /** С какого события продолжать: у нас это `seq` последнего полученного. */
  lastEventId?: string;
  /** Первая пауза перед переподключением, мс. Дальше удваивается до `maxReconnectMs`. */
  reconnectMs?: number;
  /** Потолок паузы, мс. */
  maxReconnectMs?: number;
  signal?: AbortSignal;
  onEvent: (event: SseEvent) => void;
  onStateChange?: (state: StreamState) => void;
  /** Ошибка соединения или ответа. Поток после неё не прекращается — он переподключается. */
  onError?: (error: unknown) => void;
  /** Подменяется в тестах фейковым fetch: настоящего стрима в jsdom нет. */
  fetchImpl?: typeof fetch;
  /** Подменяется в тестах, чтобы не ждать паузу реального таймера. */
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_RECONNECT_MS = 3000;
const DEFAULT_MAX_RECONNECT_MS = 30_000;

/** Ответы, после которых переподключаться бессмысленно: ни 401, ни 404 не вылечатся
    повтором того же запроса. 429 и 5xx — вылечатся, поэтому их здесь нет. */
function isFatalStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 404 || status === 410;
}

export async function streamEvents(options: StreamOptions): Promise<void> {
  const {
    url,
    reconnectMs = DEFAULT_RECONNECT_MS,
    maxReconnectMs = DEFAULT_MAX_RECONNECT_MS,
    signal,
    onEvent,
    onStateChange,
    onError,
  } = options;
  const doFetch = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  let lastEventId = options.lastEventId;
  let attempt = 0;

  while (!signal?.aborted) {
    onStateChange?.("connecting");
    try {
      const response = await doFetch(url, {
        credentials: "include",
        headers: {
          Accept: "text/event-stream",
          ...(lastEventId === undefined ? {} : { "Last-Event-ID": lastEventId }),
        },
        signal,
      });
      if (!response.ok) {
        const error = new Error(`SSE ${String(response.status)}`);
        onError?.(error);
        if (isFatalStatus(response.status)) {
          onStateChange?.("closed");
          return;
        }
        throw error;
      }
      if (!response.body) throw new Error("SSE: пустой поток");

      onStateChange?.("open");
      // соединение состоялось — следующий обрыв снова начинает отсчёт с минимальной паузы
      attempt = 0;

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let boundary = nextBoundary(buffer);
        while (boundary) {
          const parsed = parseBlock(buffer.slice(0, boundary.index));
          buffer = buffer.slice(boundary.index + boundary.length);
          if (parsed) {
            // курсор двигаем ДО вызова обработчика: бросок из него не должен «забыть» событие
            if (parsed.id !== undefined) lastEventId = parsed.id;
            onEvent(parsed);
          }
          boundary = nextBoundary(buffer);
        }
      }
    } catch (error) {
      if (signal?.aborted) break;
      onError?.(error);
    }
    onStateChange?.("closed");
    if (signal?.aborted) break;
    await sleep(backoffMs(attempt, reconnectMs, maxReconnectMs));
    attempt += 1;
  }
  onStateChange?.("closed");
}

/** Пауза перед попыткой `attempt` (с нуля): удвоение с потолком плюс джиттер до 25 %. */
export function backoffMs(attempt: number, base: number, max: number): number {
  const exponential = Math.min(max, base * 2 ** Math.max(0, attempt));
  return Math.round(exponential * (1 + Math.random() * 0.25));
}

/** Конец кадра: пустая строка. Переводы строк бывают `\n\n` и `\r\n\r\n` — прокси и
    сервера пишут по-разному, а спецификация допускает оба. */
function nextBoundary(buffer: string): { index: number; length: number } | undefined {
  const lf = buffer.indexOf("\n\n");
  const crlf = buffer.indexOf("\r\n\r\n");
  if (lf === -1 && crlf === -1) return undefined;
  if (crlf !== -1 && (lf === -1 || crlf < lf)) return { index: crlf, length: 4 };
  return { index: lf, length: 2 };
}

/** Разбор одного кадра. Экспортируется ради тестов: это единственное место с разбором
    формата, и проверять его через настоящий стрим неудобно. */
export function parseBlock(block: string): SseEvent | undefined {
  let id: string | undefined;
  let event = "message";
  const data: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "id") id = value;
    else if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  return data.length > 0 ? { id, event, data: data.join("\n") } : undefined;
}
