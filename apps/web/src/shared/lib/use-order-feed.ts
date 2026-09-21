import type { OrderEvent } from "@partiya/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { getApiService, MESSAGE_KEYS, ORDER_KEYS, TRACKING_KEYS } from "@/shared/api";
import type { StreamState } from "@/shared/api";

import { hasGapBefore, lastSeqOf, mergeEvents } from "./order-feed";

/* Мост «канал заказа → экран» (ARCHITECTURE.md, 7.6: bridge-компонент патчит кэши Query).
 *
 * Что здесь важно и почему именно так:
 *
 * 1. Лента — своё состояние компонента, а не кэш Query. Кэш хранит СТРАНИЦУ ответа,
 *    а лента живёт дольше: она склеивается из страницы и потока. Класть в кэш склейку
 *    значило бы переписывать чужой ответ.
 * 2. Разрыв в `seq` лечится дочитыванием, а не перезагрузкой экрана: `?after=` отдаёт
 *    ровно пропущенное. Поэтому обработчик события проверяет `hasGapBefore`.
 * 3. Канал упал — экран не «замирает»: включается опрос того же эндпоинта тем же
 *    курсором. Никакой второй логики: источник данных один.
 * 4. Событие смены статуса, документа или денег означает, что изменился сам заказ, —
 *    инвалидируем его кэш, а не пытаемся собрать новый `Order` в браузере. */

/** Как часто дочитывать журнал, когда канала нет. */
const POLL_INTERVAL_MS = 15_000;

export interface OrderFeedState {
  events: OrderEvent[];
  /** Состояние канала: `closed` при живом опросе — это «нет связи, обновляем по запросу». */
  connection: StreamState;
  /** Идёт ли дочитывание прямо сейчас. */
  isCatchingUp: boolean;
  /** Дочитать журнал руками — кнопка «Обновить» в индикаторе связи. */
  refresh: () => void;
}

export function useOrderFeed(orderId: number, initial: OrderEvent[]): OrderFeedState {
  const queryClient = useQueryClient();
  const [events, setEvents] = useState<OrderEvent[]>(initial);
  const [connection, setConnection] = useState<StreamState>("connecting");
  const [isCatchingUp, setCatchingUp] = useState(false);

  // курсор держим в ref: обработчик канала живёт дольше одного рендера
  const cursor = useRef(lastSeqOf(initial));
  const seeded = useRef(false);
  // и саму ленту тоже: подписка создаётся один раз и не должна пересоздаваться на каждый кадр
  const eventsRef = useRef(events);
  eventsRef.current = events;

  // первая страница приехала запросом — с неё и стартуем
  useEffect(() => {
    if (seeded.current || initial.length === 0) return;
    seeded.current = true;
    setEvents((current) => {
      const merged = mergeEvents(current, initial);
      cursor.current = Math.max(cursor.current, lastSeqOf(merged));
      return merged;
    });
  }, [initial]);

  const apply = useCallback(
    (incoming: OrderEvent[]) => {
      if (incoming.length === 0) return;
      setEvents((current) => {
        const merged = mergeEvents(current, incoming);
        cursor.current = Math.max(cursor.current, lastSeqOf(merged));
        return merged;
      });
      // заказ изменился сам — его состояние считает сервер, а не браузер
      const touchesOrder = incoming.some(
        (event) =>
          event.type === "status_changed" ||
          event.type === "document" ||
          event.type === "money" ||
          event.type === "progress",
      );
      if (touchesOrder) {
        void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.detail(orderId) });
        void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
      }
      if (incoming.some((event) => event.type === "message")) {
        void queryClient.invalidateQueries({ queryKey: MESSAGE_KEYS.list(orderId, "order") });
      }
    },
    [orderId, queryClient],
  );

  const catchUp = useCallback(() => {
    setCatchingUp(true);
    void (async () => {
      try {
        const page = await getApiService().getOrderEvents(orderId, { after: cursor.current });
        apply(page.items);
      } catch {
        /* не дочитали — следующий тик опроса попробует снова */
      } finally {
        setCatchingUp(false);
      }
    })();
  }, [apply, orderId]);

  /* ───────── канал ───────── */

  useEffect(() => {
    let disposed = false;
    const unsubscribe = getApiService().streamOrderEvents(orderId, {
      lastSeq: cursor.current,
      onEvent: (event) => {
        if (disposed) return;
        // разрыв журнала: между лентой и событием потерялись кадры — дочитываем курсором
        if (hasGapBefore(eventsRef.current, event)) catchUp();
        apply([event]);
      },
      onStateChange: (state) => {
        if (!disposed) setConnection(state);
      },
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [apply, catchUp, orderId]);

  /* ───────── откат на опрос, пока канала нет ───────── */

  useEffect(() => {
    if (connection === "open") return;
    const timer = setInterval(catchUp, POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [catchUp, connection]);

  // вкладку вернули из фона — канал мог тихо умереть, дочитываем сразу
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") catchUp();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [catchUp]);

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: TRACKING_KEYS.events(orderId) });
    // только при смене заказа: перечитывать журнал на каждый рендер незачем
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return { events, connection, isCatchingUp, refresh: catchUp };
}
