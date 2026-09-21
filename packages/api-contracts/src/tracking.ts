import type { Kopecks } from "./common";
import type { OrderMessage } from "./messages";
import type { CustomerStage, OrderDocument, OrderStatus } from "./orders";

/* Домен «Трекинг заказа» — крейт `tracking` (ARCHITECTURE.md, 8.3 и 8.4):

     GET /orders/{id}/events?after=seq&limit=  → страница журнала
     GET /orders/{id}/stream                   → SSE-канал заказа

   Журнал заказа (`order_events`) — append-only таблица с монотонным `seq` внутри одного
   заказа. На нём держится всё остальное:

   1. `seq` — это И курсор дочитывания (`?after=seq`), И `Last-Event-ID` для SSE. Один
      номер на два механизма: после обрыва соединения браузер присылает последний
      полученный `seq`, сервер дочитывает журнал и досылает пропущенное. Дыр не остаётся.
   2. Порядок событий задаёт сервер, а не время: `occurredAt` может совпадать у двух
      событий одной транзакции, `seq` — никогда.
   3. Лента — проекция журнала, а не отдельная сущность. Всё, что видно на экране
      трекинга (прогресс, фотоотчёты, сообщения, документы, деньги), приходит сюда же
      событием, поэтому экран не собирает ленту из пяти источников.

   Время — RFC 3339 UTC («2026-09-21T16:10:00Z»), как в остальных доменах. */

/* ─────────────────────────────── автор события ─────────────────────────────── */

/** Кто произвёл событие. Значения — `Actor` из `crates/orders/src/domain/command.rs`. */
export type OrderActorKind = "customer" | "factory" | "operator" | "system";

export interface OrderActor {
  kind: OrderActorKind;
  /** Готовая подпись: «Технолог «Волна»», «Оператор платформы», «Система».
      Имя собирает сервер — браузер не знает ни ФИО сотрудников, ни ролей завода. */
  name: string;
  /** Организация автора; у системы и оператора — `null`. По нему экран отличает своё
      сообщение от чужого, не сравнивая имена. */
  orgId?: string | null;
}

/* ─────────────────────────────── полезная нагрузка ─────────────────────────────── */

/** Фотография из фотоотчёта завода. До появления реальных снимков `url` пуст, а рисуется
    градиентная заглушка того же тона, что и в каталоге. */
export interface OrderPhoto {
  id: string;
  /** Ссылка на изображение; `null` — пока заглушка. */
  url: string | null;
  /** Подпись: «Раскрой, партия белая». */
  label: string;
  tone: "a" | "b" | "c" | "d" | null;
  /** Когда снято, RFC 3339. */
  takenAt: string;
}

/** Строка прогресса этапа: «Отшито 650 / 1 000». Коды (`id`) задаёт завод в отчёте
    (`POST /seller/orders/{id}/progress`), поэтому набор строк у разных категорий разный. */
export interface OrderStageProgress {
  /** Код строки внутри заказа: `cut`, `sewn`, `print`. */
  id: string;
  /** «Раскроено», «Отшито», «Принт». */
  title: string;
  done: number;
  total: number;
  /** Подпись вместо чисел, когда работа ещё не начата: «с 26.09». */
  note?: string | null;
  updatedAt: string;
}

/** Движение денег, о котором сообщает лента: «Оплата зарезервирована в эскроу». */
export type OrderMoneyOperation = "hold" | "release" | "refund" | "fee" | "invoice";

/* ─────────────────────────────── событие журнала ─────────────────────────────── */

interface OrderEventCommon {
  /** Монотонный номер внутри заказа: курсор ленты и `Last-Event-ID` канала. */
  seq: number;
  orderId: number;
  occurredAt: string;
  actor: OrderActor;
  /** Заголовок строки ленты — его пишет сервер: «Отшито 650 / 1 000». */
  title: string;
  /** Вторая строка: «1-я линия, план на неделю выполняется». */
  detail?: string | null;
}

/** Смена статуса — сопровождает каждый переход автомата (5.2). */
export interface OrderStatusChangedEvent extends OrderEventCommon {
  type: "status_changed";
  from: OrderStatus | null;
  to: OrderStatus;
  /** Укрупнённая стадия после перехода; `null` — заказ вне ленты заказчика. */
  stage: CustomerStage | null;
}

/** Отчёт завода о выработке: `POST /seller/orders/{id}/progress {stage, done, total}`. */
export interface OrderProgressEvent extends OrderEventCommon {
  type: "progress";
  progress: OrderStageProgress;
}

/** Фотоотчёт: `POST /seller/orders/{id}/photo-report {files[], caption}`. */
export interface OrderPhotoReportEvent extends OrderEventCommon {
  type: "photo_report";
  photos: OrderPhoto[];
  caption?: string | null;
}

/** Сообщение чата. Лента и чат читают один журнал: сообщение видно в обоих местах,
    и порядок между сообщением и событием статуса не спорит сам с собой. */
export interface OrderMessageEvent extends OrderEventCommon {
  type: "message";
  message: OrderMessage;
}

/** Документ сформирован, подписан или оплачен. */
export interface OrderDocumentEvent extends OrderEventCommon {
  type: "document";
  document: OrderDocument;
}

/** Деньги: резерв в эскроу, выплата заводу, возврат, комиссия. */
export interface OrderMoneyEvent extends OrderEventCommon {
  type: "money";
  operation: OrderMoneyOperation;
  /** Сумма операции, всегда неотрицательная: направление задаёт `operation`. */
  amount: Kopecks;
}

/** Всё остальное, что сервер хочет показать строкой: замечание оператора, отметка
    приёмки, открытие спора. Разбирать такие события браузеру не нужно — он рисует
    `title` и `detail`. */
export interface OrderNoteEvent extends OrderEventCommon {
  type: "note";
  /** Уточнение вида для иконки и фильтра: `acceptance`, `dispute`, `delivery`. */
  topic?: string | null;
}

export type OrderEvent =
  | OrderStatusChangedEvent
  | OrderProgressEvent
  | OrderPhotoReportEvent
  | OrderMessageEvent
  | OrderDocumentEvent
  | OrderMoneyEvent
  | OrderNoteEvent;

/** Вид события — им фильтруется лента («Всё · Производство · Фото · Сообщения · Деньги»). */
export type OrderEventType = OrderEvent["type"];

/* ─────────────────────────────── чтение журнала ─────────────────────────────── */

/** `GET /orders/{id}/events`.
 *
 * Курсор односторонний и по возрастанию `seq`: лента дочитывается вперёд после обрыва
 * SSE. Первая загрузка экрана — без `after`, сервер отдаёт последние `limit` событий. */
export interface OrderEventQuery {
  /** Отдать события строго новее этого `seq`. */
  after?: number;
  /** Сколько событий вернуть; по умолчанию 50, максимум 200. */
  limit?: number;
  /** Фильтр по виду; пусто — все. */
  types?: OrderEventType[];
}

export interface OrderEventPage {
  /** По возрастанию `seq`. */
  items: OrderEvent[];
  /** Последний `seq` журнала на момент ответа — с него подключается SSE. */
  lastSeq: number;
  /** Есть ли события до `items[0]` — то есть можно ли листать в прошлое. */
  hasMore: boolean;
  /** Всего событий в журнале — «Журнал заказа · 23 события». */
  total: number;
}

/* ─────────────────────────────── проекция экрана ─────────────────────────────── */

/** Этап укрупнённой ленты `.pipe`. Состояние считает сервер: у него автомат и даты. */
export interface OrderPipelineStage {
  stage: CustomerStage;
  /** «Оплачен», «Сырьё закуплено», «Производство», «Контроль качества», «Отгрузка». */
  title: string;
  state: "done" | "active" | "todo";
  /** Доля заливки активного этапа, 0–100. У пройденных и будущих — `null`. */
  pct?: number | null;
  /** Подпись под названием: «10.09», «15.09 →», «~29.09». */
  note?: string | null;
  /** Фактический момент наступления этапа, RFC 3339; `null` — ещё не наступил. */
  at?: string | null;
}

/** Сводка трекинга — то, из чего рисуется шапка заказа и правая колонка.
 *
 * Приходит полем `Order.tracking`, а не отдельным запросом: это проекция того же
 * агрегата, и второй round-trip ради шапки экрана ничем не оправдан. Лента событий
 * при этом остаётся отдельным (и постраничным) запросом — она растёт без предела. */
export interface OrderTracking {
  /** Готовность партии, % — та же проекция, что в колонке таблицы кабинета. */
  progressPct: number;
  stages: OrderPipelineStage[];
  /** Строки `.prog`; пусто, пока завод не отчитался. */
  progress: OrderStageProgress[];
  /** Последний `seq` журнала: с него подключается SSE и дочитывается лента. */
  lastSeq: number;
  /** Когда журнал последний раз пополнялся; `null` — журнал пуст. */
  updatedAt: string | null;
  /** Всего событий — «Журнал заказа · 23 события». */
  eventCount: number;
  /** Всего фотографий в фотоотчётах — «Фотоотчёты · 11 фото». */
  photoCount: number;
  /** Непрочитанных сообщений чата. */
  unreadMessages: number;
}

/* ─────────────────────────────── SSE ───────────────────────────────

   `GET /orders/{id}/stream` — `text/event-stream`. Формат кадра:

     event: order_event
     id: 42
     data: {"seq":42,"orderId":4812,"type":"progress",…}

   * `event` — имя из `OrderStreamEventName`;
   * `id` — `seq` события; браузер вернёт его заголовком `Last-Event-ID` при переподключении;
   * `data` — ОДНА строка JSON. Многострочный JSON в SSE допустим, но каждая строка должна
     начинаться с `data:`, и лишний раз собирать его из кусков незачем.

   Кадр `ping` без `id` приходит раз в 20–30 секунд: он держит соединение через прокси
   и не сдвигает курсор. Кадр `counters` есть только в пользовательском канале `/me/stream`. */

/** Имена кадров канала заказа. */
export type OrderStreamEventName = "order_event" | "ping";

/** Имена кадров пользовательского канала `/me/stream`. */
export type UserStreamEventName = "notification" | "counters" | "ping";

/** Тело кадра `order_event`. Это ровно событие журнала: отдельного «облегчённого»
    представления нет намеренно — иначе у ленты появилось бы два формата. */
export type OrderStreamFrame = OrderEvent;

/** Коды problem+json домена «Трекинг». */
export type TrackingProblemType =
  /** 404 · заказа нет или он чужой (эти случаи снаружи неразличимы). */
  | "https://partiya.ru/problems/tracking/order-not-found"
  /** 409 · журнала ещё нет: заказ не оплачен, трекинга у него не бывает. */
  | "https://partiya.ru/problems/tracking/not-started"
  /** 422 · `after` больше текущего `lastSeq` — курсор из другого заказа или из будущего. */
  | "https://partiya.ru/problems/tracking/bad-cursor";
