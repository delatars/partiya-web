import type { QuoteRequest } from "@partiya/api-contracts";
import { queryOptions } from "@tanstack/react-query";

import { getApiService } from "../service";

/* Котировка — это POST, но по смыслу чтение: тот же вход даёт тот же ответ и ничего
   не меняет. Поэтому она живёт как запрос, а не мутация, и получает два свойства даром:
   кэш по входу (возврат на предыдущий объём мгновенный) и `placeholderData` —
   пока считается новый итог, на экране остаётся прежний с индикатором пересчёта
   (ARCHITECTURE.md, 5.5). */
export const QUOTE_KEYS = {
  all: ["quotes"] as const,
  quote: (request: QuoteRequest) => [...QUOTE_KEYS.all, request] as const,
};

export const quoteOptions = (request: QuoteRequest, enabled = true) =>
  queryOptions({
    queryKey: QUOTE_KEYS.quote(request),
    queryFn: ({ signal }) => getApiService().createQuote(request, signal),
    enabled,
    placeholderData: (previous) => previous,
    // цена оффера может измениться, но не за время, что человек крутит калькулятор
    staleTime: 5 * 60_000,
  });
