import type { Kopecks } from "./common";
import type { QuoteLine } from "./quotes";
import type { ArtworkLimits, ArtworkUploadRequest, ArtworkUploadResponse } from "./orders";

/* Домен «Образцы» — `POST /samples` (ARCHITECTURE.md, 8.4; модуль-крейт `samples`).

   Образец — отдельный лёгкий тип заказа со своим жизненным циклом (раздел 1): он не
   резервирует мощность, не идёт через спецификацию и не имеет приёмки. Поэтому у него
   свой статус-автомат, а не проекция `OrderStatus`.

   ⚠ Q-13 открыт: идут ли деньги за образец через эскроу и как засчитывается стоимость
   в первую партию. Контракт написан под допущение из макета: оплата прямая (карта или
   счёт на юрлицо), зачёт — 60 дней у той же фабрики. Если решение будет другим,
   меняются `SamplePaymentMethod` и `SampleOrder.credit`. */

/** Автомат образца. `awaiting_payment` есть только у оплаты счётом: картой платят сразу. */
export type SampleStatus =
  "awaiting_payment" | "paid" | "in_production" | "shipped" | "delivered" | "cancelled";

/** Чем платят за образец. Через эскроу образец НЕ идёт (Q-13, допущение). */
export type SamplePaymentMethod = "card" | "invoice";

export interface SampleOffer {
  id: number;
  title: string;
  factoryId: number;
  factoryName: string;
  factoryCity: string;
  tone: "a" | "b" | "c" | "d" | null;
}

/** Что именно шьёт фабрика. Значения — из характеристик оффера, свободного ввода нет:
    образец должен быть воспроизводим в партии. */
export interface SampleParams {
  /** Сколько штук: 1–3 по макету. */
  qty: number;
  /** Размеры через запятую: «M, L». */
  sizes: string;
  /** Цвет ткани: «белый». */
  color: string;
  /** Нанесение: «Шелкография 2 цв.», «DTF», «Без печати». */
  print: string;
}

export interface SampleDelivery {
  /** Код варианта доставки образца — свой набор, не `OfferDetail.delivery[]`:
      образец едет службой (СДЭК, курьер), а не паллетой на склад. */
  optionId: string;
  title: string;
  price: Kopecks;
  address: string;
  recipientName: string;
  recipientPhone: string;
}

export interface SampleDeliveryOption {
  id: string;
  title: string;
  price: Kopecks;
  /** «Москва, ул. Лесная, 9 · 2–3 дня после отгрузки». */
  note: string | null;
  /** Дней на доставку после отгрузки. */
  days: number;
}

export interface SampleDeliveryInput {
  optionId: string;
  address: string;
  recipientName: string;
  recipientPhone: string;
}

/** Зачёт стоимости образца в первую партию — обещание из макета. */
export interface SampleCredit {
  amount: Kopecks;
  /** Сколько дней действует зачёт. */
  days: number;
  /** До какой даты, ISO `YYYY-MM-DD`; `null`, пока образец не оплачен. */
  validUntil: string | null;
}

/** `POST /samples`. Требует `Idempotency-Key`: запрос создаёт деньги и статус. */
export interface CreateSampleBody {
  offerId: number;
  params: SampleParams;
  delivery: SampleDeliveryInput;
  /** Макет необязателен: без него фабрика нанесёт тестовый принт. `fileId` из
      `POST /samples/artwork`. */
  artworkFileId?: string | null;
  comment?: string | null;
  payment: SamplePaymentMethod;
}

export interface SampleOrder {
  /** Публичный номер образца — своя последовательность, не пересекается с заказами. */
  id: number;
  status: SampleStatus;
  createdAt: string;
  offer: SampleOffer;
  params: SampleParams;
  delivery: SampleDelivery;
  /** Строки счёта образца: образец, печать, доставка. Порядок фиксирован сервером. */
  lines: QuoteLine[];
  total: Kopecks;
  payment: SamplePaymentMethod;
  credit: SampleCredit;
  /** Изготовление, рабочих дней. */
  leadDays: number;
  /** Имя приложенного макета; `null` — печать тестовая. */
  artworkFileName: string | null;
  /** Плановая отгрузка, ISO `YYYY-MM-DD`. */
  shipDate: string | null;
}

export interface SampleList {
  items: SampleOrder[];
  total: number;
}

/** `GET /offers/{id}/sample-options` — из чего собирается форма образца.
 *
 * Значения приходят с сервера, а не зашиты в браузер: набор цветов и видов печати
 * задаёт фабрика в редакторе SKU, и релиз фронта для нового цвета выпускать незачем. */
export interface SampleOptions {
  price: Kopecks;
  leadDays: number;
  qtyChoices: number[];
  sizeChoices: string[];
  colorChoices: string[];
  printChoices: { value: string; price: Kopecks }[];
  delivery: SampleDeliveryOption[];
  credit: Omit<SampleCredit, "validUntil">;
  artwork: ArtworkLimits;
}

/** `POST /samples/artwork` — presigned-загрузка макета образца до создания заказа.
    Форма та же, что у макета партии: одна реализация хранилища на оба случая. */
export type SampleArtworkUploadRequest = ArtworkUploadRequest;
export type SampleArtworkUploadResponse = ArtworkUploadResponse;

/** Коды problem+json домена «Образцы». */
export type SampleProblemType =
  /** 422 · у оффера нет образца. */
  | "https://partiya.ru/problems/samples/not-available"
  /** 422 · форма заполнена не полностью; `errors` — по полям. */
  | "https://partiya.ru/problems/samples/invalid"
  /** 409 · образец этой фабрики уже заказан и ещё в работе. */
  | "https://partiya.ru/problems/samples/already-ordered";
