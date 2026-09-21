import type { OrderMessageChannel } from "@partiya/api-contracts";
import { queryOptions } from "@tanstack/react-query";

import { getApiService } from "../service";

/* Фабрика ключей домена «Сообщения». Ветка входит в ключ: чат с технологом и переписка
   по спору — разные списки, и складывать их в один кэш нельзя. */
export const MESSAGE_KEYS = {
  all: ["messages"] as const,
  list: (orderId: number, channel: OrderMessageChannel) =>
    [...MESSAGE_KEYS.all, orderId, channel] as const,
};

export const orderMessagesOptions = (orderId: number, channel: OrderMessageChannel = "order") =>
  queryOptions({
    queryKey: MESSAGE_KEYS.list(orderId, channel),
    queryFn: ({ signal }) => getApiService().getOrderMessages(orderId, { channel }, signal),
    staleTime: 0,
  });
