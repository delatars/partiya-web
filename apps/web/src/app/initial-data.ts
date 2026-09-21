import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { z } from "zod";

/* Засев кэша TanStack Query из SEO-слепка (ARCHITECTURE.md, 7.4).

   Модуль `seo` в partiya-api кладёт в `<head>` те же данные, которыми нарисован слепок
   внутри `#root`, в том же проводном формате, что отдаёт API. Мы раскладываем их по
   ключам кэша ДО первого рендера — и страница не идёт за ними в сеть второй раз.

   Разбор намеренно мягкий: `__INITIAL__` приходит из разметки, а разметка может быть
   устаревшей, обрезанной прокси или подменённой расширением браузера. Мусор молча
   игнорируется — приложение обязано работать и вовсе без засева. */

/** Версия формата. Держится в паре с `INITIAL_VERSION` в `crates/seo/src/page.rs`. */
export const INITIAL_VERSION = 1;

declare global {
  interface Window {
    __INITIAL__?: unknown;
  }
}

/** Одна запись: ключ кэша и данные под ним. */
const entrySchema = z.object({
  // Ключ непустой: `setQueryData([])` положил бы данные «в никуда».
  queryKey: z.array(z.unknown()).min(1),
  // Значение любое, но присутствовать обязано: `undefined` для Query значит «данных нет».
  data: z.unknown().refine((value) => value !== undefined),
});

const payloadSchema = z.object({
  version: z.number().int(),
  queries: z.array(z.unknown()),
});

export interface InitialEntry {
  queryKey: QueryKey;
  data: unknown;
}

/**
 * Разобрать содержимое `window.__INITIAL__`.
 *
 * Чужая версия схемы — засева нет вовсе: раскладывать данные по ключам, которых это
 * приложение уже не знает, хуже, чем не раскладывать ничего.
 */
export function parseInitialData(source: unknown): InitialEntry[] {
  const payload = payloadSchema.safeParse(source);
  if (!payload.success) return [];
  if (payload.data.version !== INITIAL_VERSION) return [];

  const entries: InitialEntry[] = [];
  for (const raw of payload.data.queries) {
    const entry = entrySchema.safeParse(raw);
    if (entry.success) entries.push({ queryKey: entry.data.queryKey, data: entry.data.data });
  }
  return entries;
}

/**
 * Разложить слепок по кэшу и убрать глобал.
 *
 * Глобал удаляется всегда, даже когда разбор ничего не дал: данные страницы не должны
 * оставаться висеть на `window` — ни для чужого кода, ни для повторного засева при
 * клиентской навигации.
 *
 * @returns сколько записей засеяно.
 */
export function seedQueryCache(queryClient: QueryClient, scope: Window = window): number {
  const source = scope.__INITIAL__;
  delete scope.__INITIAL__;

  const entries = parseInitialData(source);
  for (const entry of entries) queryClient.setQueryData(entry.queryKey, entry.data);
  return entries.length;
}
