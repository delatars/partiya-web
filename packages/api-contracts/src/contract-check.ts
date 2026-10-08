/* Сверка рукописного контракта фронта со сгенерированным из openapi.json.
 *
 * Рантайма в файле нет — только объявления типов. Он существует ради `tsc`: как только
 * бэкенд разойдётся с фронтом, `pnpm typecheck` покажет операцию и поле. Файл лежит
 * внутри `src`, поэтому попадает в `tsconfig` пакета автоматически; в `index.ts` он
 * намеренно НЕ реэкспортируется — это проверка, а не часть публичного контракта.
 *
 * Что проверяем для каждой пары «операция ↔ экран», которая реально ходит по HTTP
 * (см. `apps/web/src/shared/api/http/*.ts`):
 *   1. ответ бэка присваивается рукописному типу фронта — бэк отдаёт всё обязательное,
 *      имена и типы полей совпадают, лишние поля бэка допустимы;
 *   2. рукописное тело запроса присваивается телу, которое принимает бэк.
 *
 * Решение по Q-141 («`null` против `?`»). Рукописные типы фронта НЕ правим: вместо этого
 * сверка нормализует стороны утилитой `Loose`. Свойство, которое допускает `null` или
 * `undefined` либо объявлено через `?`, считается «необязательным, и `null` тоже годится»:
 * `null` ≡ «поля нет». Так проверка ловит то, что действительно ломает экран, — другое имя
 * поля, другой тип, отсутствующее у бэка обязательное поле, чужой enum, — и не спотыкается
 * о то, что бэк пишет `null`, а моки ключ не присылают.
 * Остаточный риск записан в QUESTIONS.md (Q-141): код фронта везде читает такие поля
 * через `??` / `?.`.
 *
 * Почему «ослабляется» только ОДНА сторона (цель присваивания), а вторая идёт как есть.
 * Первая версия нормализовала обе; `tsc` при сравнении двух глубоко вложенных
 * инстанцирований ОДНОГО псевдонима включает защиту от бесконечной рекурсии
 * (`isDeeplyNestedType`) и, когда «глубоко вложены» и источник, и цель, СЧИТАЕТ ИХ
 * СОВМЕСТИМЫМИ. Проверка молча пропускала расхождения глубже третьего уровня
 * (поймано на `listOfferQuestions`: у бэка в `answer` нет `author`). Когда псевдоним
 * стоит только на цели, а источник — обычные сгенерированные типы, защита не срабатывает,
 * и расхождение на 4-м уровне вложенности честно падает (проверено).
 *
 * Чего проверка НЕ ловит (сознательно): лишнее поле в теле запроса фронта — структурная
 * присваиваемость его пропускает, а serde на бэке неизвестные поля игнорирует.
 * Переименованное или пропущенное поле запроса ловится.
 */

import type { operations } from "./generated";
import type * as C from "./index";

/* ── Нормализация (Q-141) ─────────────────────────────────────────────────── */

/** Скаляры контракта: глубже рекурсия не идёт. */
type Scalar = string | number | boolean | bigint | symbol | null | undefined;

/** Ключи, значение которых допускает `null` или `undefined` (в том числе из-за `?`). */
type NullableKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : null extends T[K] ? K : never;
}[keyof T];

/** Остальные ключи — по-настоящему обязательные. */
type StrictKeys<T> = Exclude<keyof T, NullableKeys<T>>;

type LooseObject<T> = { [K in StrictKeys<T>]: Loose<T[K]> } & {
  [K in NullableKeys<T>]?: Loose<NonNullable<T[K]>> | null;
};

/** Рекурсивно ослабляет тип-ЦЕЛЬ: `поле: T | null`, `поле?: T` и `поле?: T | null`
    принимают и значение, и `null`, и отсутствие ключа. Обязательные поля остаются
    обязательными — именно их пропажа и ломает экран. */
type Loose<T> = T extends Scalar
  ? T
  : T extends readonly (infer E)[]
    ? Loose<E>[]
    : T extends object
      ? LooseObject<T>
      : T;

/* ── Извлечение типов из сгенерированных операций ─────────────────────────── */

/** Тело `application/json` из описания ответа или запроса. */
type Json<R> = R extends { content: { "application/json": infer B } } ? B : never;

/** Тело успешного ответа операции (по умолчанию 200). */
type Res<
  K extends keyof operations,
  S extends keyof operations[K]["responses"] = 200 & keyof operations[K]["responses"],
> = Json<operations[K]["responses"][S]>;

/** Тело запроса операции. */
type Req<K extends keyof operations> = Json<NonNullable<operations[K]["requestBody"]>>;

/* ── Утверждения ──────────────────────────────────────────────────────────── */
/* Ограничение висит на собственном параметре псевдонима — только так `tsc` проверяет его
   в КАЖДОЙ строке ниже, а не один раз на объявлении. */

/** Ответ бэка (`Back`) обязан подходить под рукописный тип фронта (`Front`).
    Ошибка читается как «Back не удовлетворяет ограничению Front» + имя поля. */
type Response<Front, Back extends Loose<Front>> = [Front, Back];

/** Рукописное тело запроса (`Front`) обязано подходить под то, что принимает бэк (`Back`). */
type Request<Back, Front extends Loose<Back>> = [Back, Front];

/** Известное расхождение: присваиваемость не проверяется, причина — в комментарии над
    строкой (`ИСКЛЮЧЕНИЕ · …`). Оба типа остаются связанными, поэтому переименование или
    удаление любого из них всё равно валит сборку — молча разойтись они не могут. */
type Known<Front, Back> = [Front, Back];

/** Бэк обязан ОБЪЯВИТЬ каждое поле рукописного типа — хотя бы необязательным.
    `Response` по Q-141 считает «необязательного поля нет» нормой, и так незаметно
    пропали шесть полей «Повторных партий» в `OrderListItem` (Q-435): моки их отдавали,
    бэк — нет, экран рисовал «Было 0 ₽ · Повторить −0 %». Для типов, где экран живёт
    на необязательных полях, `Declares` ловит именно пропажу ключа из схемы бэка. */
type Declares<Back, K extends keyof Back> = [Back, K];

/* ── Самотесты нормализации ───────────────────────────────────────────────── */
/* Проверяют саму утилиту: совместимые пары компилируются, несовместимые обязаны падать
   (`@ts-expect-error` — если такая строка вдруг станет валидной, tsc ругнётся на
   неиспользованную директиву, и молчаливой деградации проверки не будет). */

interface SelfFrontOptional {
  id: number;
  note?: string;
}
interface SelfBackNullable {
  id: number;
  note: string | null;
}
interface SelfBackOptionalNullable {
  id: number;
  note?: string | null;
}
interface SelfBackMissing {
  id: number;
}
interface SelfBackRenamed {
  id: number;
  comment: string | null;
}
interface SelfFrontRequired {
  id: number;
  note: string;
}
interface SelfFrontNested {
  rows: { title: string; tone?: "warn" | "ok" }[];
}
interface SelfBackNested {
  rows: { title: string; tone: "warn" | "ok" | null }[];
}
interface SelfBackNestedWrongEnum {
  rows: { title: string; tone: "warn" | "ok" | "bad" | null }[];
}
interface SelfBackNestedWrongType {
  rows: { title: number; tone: "warn" | "ok" | null }[];
}
interface SelfBackBodyRenamed {
  id: number;
  comment: string;
}
/* Четыре уровня вложенности: список → строка → ответ → автор. */
interface SelfFrontDeep {
  items: { id: number; answer?: { text: string; author: string } }[];
}
interface SelfBackDeep {
  items: { id: number; answer: { text: string; author: string } | null }[];
}
interface SelfBackDeepMissing {
  items: { id: number; answer: { text: string } | null }[];
}
/* Совместимые: `| null` у бэка ≡ `?` у фронта, на любой глубине. */
export type SelfNullEqualsOptional = Response<SelfFrontOptional, SelfBackNullable>;
export type SelfOptionalNullable = Response<SelfFrontOptional, SelfBackOptionalNullable>;
export type SelfMissingIsOk = Response<SelfFrontOptional, SelfBackMissing>;
export type SelfNestedNull = Response<SelfFrontNested, SelfBackNested>;
/* Лишнее поле бэка не мешает: фронт читает только своё. */
export type SelfExtraBackField = Response<SelfBackMissing, SelfBackNullable>;
/* Тело запроса: фронт не шлёт ключ там, где бэк объявил `| null`. */
export type SelfRequestOk = Request<SelfBackNullable, SelfFrontOptional>;
/* Глубокое расхождение (4-й уровень) обязано ловиться — ради этого `Loose` только на цели. */
export type SelfDeepOk = Response<SelfFrontDeep, SelfBackDeep>;

/* Несовместимые: нормализация не должна их пропускать. */
// @ts-expect-error — бэк переименовал поле: `note` → `comment`.
export type SelfRenamed = Response<SelfFrontRequired, SelfBackRenamed>;
// @ts-expect-error — фронту поле обязательно, бэк его не отдаёт.
export type SelfMissingRequired = Response<SelfFrontRequired, SelfBackMissing>;
// @ts-expect-error — фронту поле обязательно, бэк может прислать `null`.
export type SelfNullForRequired = Response<SelfFrontRequired, SelfBackNullable>;
// @ts-expect-error — у бэка в enum лишнее значение, экран его не разбирает.
export type SelfWrongEnum = Response<SelfFrontNested, SelfBackNestedWrongEnum>;
// @ts-expect-error — другой тип вложенного поля: number вместо string.
export type SelfWrongType = Response<SelfFrontNested, SelfBackNestedWrongType>;
// @ts-expect-error — расхождение на 4-м уровне вложенности: `author` в ответе бэка нет.
export type SelfDeepMissing = Response<SelfFrontDeep, SelfBackDeepMissing>;
// @ts-expect-error — тело запроса: фронт не шлёт поле, которое бэк требует.
export type SelfRequestMissing = Request<SelfFrontRequired, SelfBackMissing>;
// @ts-expect-error — тело запроса: поле переименовано, бэк ждёт `comment`, фронт шлёт `note`.
export type SelfRequestRenamed = Request<SelfBackBodyRenamed, SelfFrontRequired>;
/* `Declares`: необязательное поле фронта бэк обязан хотя бы объявить. */
export type SelfDeclaresOk = Declares<SelfBackNullable, keyof SelfFrontOptional>;
// @ts-expect-error — бэк не объявил необязательное поле `note`, которое читает экран.
export type SelfDeclaresMissing = Declares<SelfBackMissing, keyof SelfFrontOptional>;

/* ══════════════════════════════════════════════════════════════════════════
   iam · вход, организации, сессии  (http/auth.ts)
   ══════════════════════════════════════════════════════════════════════════ */

export type RequestLoginCode = Request<Req<"requestLoginCode">, C.RequestCodeBody>;
export type RequestLoginCodeRes = Response<C.CodeRequested, Res<"requestLoginCode", 202>>;

export type VerifyLoginCode = Request<Req<"verifyLoginCode">, C.VerifyCodeBody>;
export type VerifyLoginCodeRes = Response<C.Me, Res<"verifyLoginCode">>;

export type GetMe = Response<C.Me, Res<"getMe">>;

export type SwitchActiveOrg = Request<Req<"switchActiveOrg">, C.SwitchOrgBody>;
export type SwitchActiveOrgRes = Response<C.Me, Res<"switchActiveOrg">>;

export type ListSessions = Response<C.AuthSessionList, Res<"listSessions">>;

export type CreateOrg = Request<Req<"createOrg">, C.CreateOrgBody>;
export type CreateOrgRes = Response<C.Organization, Res<"createOrg", 201>>;
/* п. 24: реквизиты организации — экран «Компания». */
export type GetOrgRequisites = Response<C.OrgRequisites, Res<"getOrgRequisites">>;
export type UpdateOrgRequisites = Request<Req<"updateOrgRequisites">, C.UpdateOrgRequisitesBody>;
export type UpdateOrgRequisitesRes = Response<C.OrgRequisites, Res<"updateOrgRequisites">>;

/* ══════════════════════════════════════════════════════════════════════════
   catalog · каталог, карточка, заводы  (http/catalog.ts, offers.ts, factories.ts)
   ══════════════════════════════════════════════════════════════════════════ */

export type CatalogSearch = Response<C.CatalogSearchResult, Res<"catalogSearch">>;

export type GetOffer = Response<C.OfferDetail, Res<"getOffer">>;
export type GetSimilarOffers = Response<C.OfferSummary[], Res<"getSimilarOffers">>;
export type ListOfferQuestions = Response<C.OfferQuestionList, Res<"listOfferQuestions">>;
export type ListOfferReviews = Response<C.OfferReviewList, Res<"listOfferReviews">>;
export type AskOfferQuestion = Request<Req<"askOfferQuestion">, C.CreateQuestionBody>;
export type AskOfferQuestionRes = Response<C.OfferQuestion, Res<"askOfferQuestion">>;

export type ListFactories = Response<C.FactoryListResult, Res<"listFactories">>;
export type GetFactory = Response<C.FactoryDetail, Res<"getFactory">>;

/* ══════════════════════════════════════════════════════════════════════════
   quotes · котировка  (http/quotes.ts)
   ══════════════════════════════════════════════════════════════════════════ */

export type CreateQuote = Request<Req<"createQuote">, C.QuoteRequest>;
export type CreateQuoteRes = Response<C.Quote, Res<"createQuote">>;

/* ══════════════════════════════════════════════════════════════════════════
   orders · заказы, макет, приёмка, повтор  (http/orders.ts)
   ══════════════════════════════════════════════════════════════════════════ */

export type CreateOrderDraft = Request<Req<"createOrderDraft">, C.CreateOrderDraftBody>;
export type CreateOrderDraftRes = Response<C.Order, Res<"createOrderDraft", 201>>;

export type GetOrder = Response<C.Order, Res<"getOrder">>;
export type ListOrders = Response<C.OrderList, Res<"listOrders">>;
/* Раздел «Повторные партии» целиком на необязательных полях строки (Q-435). */
export type ListOrdersItemKeys = Declares<
  Res<"listOrders">["items"][number],
  keyof C.OrderListItem
>;

export type UpdateOrderDraft = Request<Req<"updateOrderDraft">, C.UpdateOrderDraftBody>;
export type UpdateOrderDraftRes = Response<C.Order, Res<"updateOrderDraft">>;

export type RequestArtworkUpload = Request<Req<"requestArtworkUpload">, C.ArtworkUploadRequest>;
export type RequestArtworkUploadRes = Response<
  C.ArtworkUploadResponse,
  Res<"requestArtworkUpload">
>;
export type CompleteArtworkUpload = Response<C.OrderArtwork, Res<"completeArtworkUpload">>;

export type SubmitOrder = Response<C.SubmitOrderResponse, Res<"submitOrder">>;
/* п. 12: принятие оферты в теле `submit`. */
export type SubmitOrderBody = Request<Req<"submitOrder">, C.SubmitOrderBody>;
/* п. 17: отмена заказчиком до оплаты. */
export type CancelOrder = Request<Req<"cancelOrder">, C.CancelOrderBody>;
export type CancelOrderRes = Response<C.Order, Res<"cancelOrder">>;
export type ApproveArtwork = Response<C.Order, Res<"approveArtwork">>;

/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `marks` и `review` в теле приёмки описаны свободным объектом. По проводу
    едут настоящие структуры — расходится только спецификация. */
export type AcceptOrder = Known<Req<"acceptOrder">, C.AcceptOrderBody>;
export type AcceptOrderRes = Response<C.Order, Res<"acceptOrder">>;

export type RepeatOrder = Response<C.RepeatOrderResponse, Res<"repeatOrder">>;

/* ══════════════════════════════════════════════════════════════════════════
   samples · образцы  (http/orders.ts, хвост)
   ══════════════════════════════════════════════════════════════════════════ */

export type GetSampleOptions = Response<C.SampleOptions, Res<"getSampleOptions">>;
export type RequestSampleArtworkUpload = Request<
  Req<"requestSampleArtworkUpload">,
  C.SampleArtworkUploadRequest
>;
export type RequestSampleArtworkUploadRes = Response<
  C.SampleArtworkUploadResponse,
  Res<"requestSampleArtworkUpload">
>;
export type CreateSample = Request<Req<"createSample">, C.CreateSampleBody>;
/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `params` и `delivery` образца — свободные объекты. */
export type CreateSampleRes = Known<C.SampleOrder, Res<"createSample", 201>>;
/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `params` и `delivery` образца — свободные объекты. */
export type ListSamples = Known<C.SampleList, Res<"listSamples">>;

/* ══════════════════════════════════════════════════════════════════════════
   tracking · журнал заказа  (http/tracking.ts)
   ══════════════════════════════════════════════════════════════════════════ */

/** ИСКЛЮЧЕНИЕ · `#[serde(flatten)]` в `EventDto`: utoipa не раскрывает поля вариантов
    (`from`/`to`/`stage`/`photos`), и вместо размеченного объединения в схеме остаётся
    свободный объект. Форма самих событий проверена тестами `tracking` на обеих сторонах. */
export type GetOrderEvents = Known<C.OrderEventPage, Res<"getOrderEvents">>;

/* ══════════════════════════════════════════════════════════════════════════
   messaging · чат по заказу  (http/messages.ts)
   ══════════════════════════════════════════════════════════════════════════ */

export type GetOrderMessages = Response<C.OrderMessageList, Res<"getOrderMessages">>;
export type SendOrderMessage = Request<Req<"sendOrderMessage">, C.SendOrderMessageBody>;
export type SendOrderMessageRes = Response<C.OrderMessage, Res<"sendOrderMessage">>;
export type MarkOrderMessagesRead = Request<Req<"markOrderMessagesRead">, C.MarkMessagesReadBody>;
export type MarkOrderMessagesReadRes = Response<C.OrderMessageList, Res<"markOrderMessagesRead">>;
export type RequestMessageAttachmentUpload = Request<
  Req<"requestMessageAttachmentUpload">,
  C.MessageAttachmentUploadRequest
>;
/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `headers` (Record<string,string>) и `limits`
    (ArtworkLimits) в билете загрузки — свободные объекты. */
export type RequestMessageAttachmentUploadRes = Known<
  C.MessageAttachmentUploadResponse,
  Res<"requestMessageAttachmentUpload">
>;

/* ══════════════════════════════════════════════════════════════════════════
   notifications · лента, счётчики, настройки  (http/notifications.ts)
   ══════════════════════════════════════════════════════════════════════════ */

export type ListNotifications = Response<C.NotificationList, Res<"listNotifications">>;
export type MarkNotificationsRead = Request<
  Req<"markNotificationsRead">,
  C.MarkNotificationsReadBody
>;
export type MarkNotificationsReadRes = Response<C.NotificationList, Res<"markNotificationsRead">>;
/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `channels` (sms/email/telegram) — свободный объект. */
export type GetNotificationSettings = Known<C.NotificationSettings, Res<"getNotificationSettings">>;
/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `channels` в теле запроса — свободный объект. */
export type UpdateNotificationSettings = Known<
  Req<"updateNotificationSettings">,
  C.UpdateNotificationSettingsBody
>;
/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `channels` — свободный объект. */
export type UpdateNotificationSettingsRes = Known<
  C.NotificationSettings,
  Res<"updateNotificationSettings">
>;
export type GetUserCounters = Response<C.UserCounters, Res<"getUserCounters">>;

/* ══════════════════════════════════════════════════════════════════════════
   disputes · спор по заказу  (http/disputes.ts)
   ══════════════════════════════════════════════════════════════════════════ */

/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `evidence` (ArtworkLimits) — свободный объект. */
export type GetDisputeOptions = Known<C.DisputeOptions, Res<"getDisputeOptions">>;
export type GetDispute = Response<C.Dispute, Res<"getDispute">>;
export type OpenDispute = Request<Req<"openDispute">, C.OpenDisputeBody>;
export type OpenDisputeRes = Response<C.Dispute, Res<"openDispute">>;
export type WithdrawDispute = Response<C.Dispute, Res<"withdrawDispute">>;
export type RequestDisputeEvidenceUpload = Request<
  Req<"requestDisputeEvidenceUpload">,
  C.DisputeEvidenceUploadRequest
>;
/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `headers` и `limits` — свободные объекты. */
export type RequestDisputeEvidenceUploadRes = Known<
  C.DisputeEvidenceUploadResponse,
  Res<"requestDisputeEvidenceUpload">
>;

/* ══════════════════════════════════════════════════════════════════════════
   payments · эскроу заказчика  (http/payments.ts)
   ══════════════════════════════════════════════════════════════════════════ */

export type GetEscrowOverview = Response<C.EscrowOverview, Res<"getEscrowOverview">>;
export type GetOrderEscrow = Response<C.EscrowDeal, Res<"getOrderEscrow">>;

/* ══════════════════════════════════════════════════════════════════════════
   documents · документы и ЭДО  (http/documents.ts)
   ══════════════════════════════════════════════════════════════════════════ */

export type ListDocuments = Response<C.DocumentList, Res<"listDocuments">>;
export type SignDocument = Response<C.SignDocumentResponse, Res<"signDocument">>;
export type GetEdoConnection = Response<C.EdoConnection, Res<"getEdoConnection">>;

/* ══════════════════════════════════════════════════════════════════════════
   capacity · мощность завода  (http/capacity.ts)
   ══════════════════════════════════════════════════════════════════════════ */

export type GetCapacityPlan = Response<C.CapacityPlan, Res<"getCapacityPlan">>;
export type UpdateCapacityPlan = Request<Req<"updateCapacityPlan">, C.UpdateCapacityBody>;
export type UpdateCapacityPlanRes = Response<C.CapacityPlan, Res<"updateCapacityPlan">>;
export type CopyCapacityPlan = Request<Req<"copyCapacityPlan">, C.CopyCapacityBody>;
export type CopyCapacityPlanRes = Response<C.CapacityPlan, Res<"copyCapacityPlan">>;

/* ══════════════════════════════════════════════════════════════════════════
   seller · кабинет завода  (http/seller.ts)
   ══════════════════════════════════════════════════════════════════════════ */

/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `ranking` (позиция, категория, изменение за неделю) —
    свободный объект. */
export type GetSellerDashboard = Known<C.SellerDashboard, Res<"getSellerDashboard">>;

export type ListSellerOrders = Response<C.SellerOrderList, Res<"listSellerOrders">>;
export type GetSellerOrder = Response<C.SellerOrder, Res<"getSellerOrder">>;
export type ConfirmSellerOrder = Response<C.SellerOrder, Res<"confirmSellerOrder">>;
export type DeclineSellerOrder = Request<Req<"declineSellerOrder">, C.DeclineOrderBody>;
export type DeclineSellerOrderRes = Response<C.SellerOrder, Res<"declineSellerOrder">>;
export type ReportSellerProgress = Request<Req<"reportSellerProgress">, C.ReportProgressBody>;
export type ReportSellerProgressRes = Response<C.SellerOrder, Res<"reportSellerProgress">>;
export type AdvanceSellerStage = Request<Req<"advanceSellerStage">, C.AdvanceStageBody>;
export type AdvanceSellerStageRes = Response<C.SellerOrder, Res<"advanceSellerStage">>;
/* п. 13: «Доставлено» заводом по трек-номеру. */
export type MarkSellerOrderDelivered = Request<
  Req<"markSellerOrderDelivered">,
  C.MarkDeliveredBody
>;
export type MarkSellerOrderDeliveredRes = Response<C.SellerOrder, Res<"markSellerOrderDelivered">>;
export type RequestPhotoUpload = Request<Req<"requestPhotoUpload">, C.PhotoReportUploadRequest>;
export type RequestPhotoUploadRes = Response<
  C.PhotoReportUploadResponse,
  Res<"requestPhotoUpload">
>;
export type ReportPhotos = Request<Req<"reportPhotos">, C.PhotoReportBody>;
export type ReportPhotosRes = Response<C.SellerOrder, Res<"reportPhotos">>;

export type ListSellerOffers = Response<C.SellerOfferList, Res<"listSellerOffers">>;
/** ИСКЛЮЧЕНИЕ · `#[serde(flatten)]` в `DraftDto`: поля черновика SKU в схему не попадают. */
export type NewSellerOfferEditor = Known<C.SellerOfferEditor, Res<"newSellerOfferEditor">>;
/** ИСКЛЮЧЕНИЕ · `#[serde(flatten)]` в `DraftDto`: поля черновика SKU в схему не попадают. */
export type GetSellerOfferEditor = Known<C.SellerOfferEditor, Res<"getSellerOfferEditor">>;
/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `delivery` в теле сохранения SKU — свободный объект. */
export type CreateSellerOffer = Known<Req<"createSellerOffer">, C.SaveSellerOfferBody>;
/** ИСКЛЮЧЕНИЕ · `#[serde(flatten)]` в `DraftDto`: поля черновика SKU в схему не попадают. */
export type CreateSellerOfferRes = Known<C.SellerOfferEditor, Res<"createSellerOffer">>;
/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `delivery` в теле сохранения SKU — свободный объект. */
export type SaveSellerOffer = Known<Req<"saveSellerOffer">, C.SaveSellerOfferBody>;
/** ИСКЛЮЧЕНИЕ · `#[serde(flatten)]` в `DraftDto`: поля черновика SKU в схему не попадают. */
export type SaveSellerOfferRes = Known<C.SellerOfferEditor, Res<"saveSellerOffer">>;
export type SubmitSellerOffer = Response<C.SubmitSellerOfferResponse, Res<"submitSellerOffer">>;
export type SetSellerOfferListed = Request<Req<"setSellerOfferListed">, C.SetOfferListedBody>;
export type SetSellerOfferListedRes = Response<C.SellerOfferListItem, Res<"setSellerOfferListed">>;

export type ListSellerSamples = Response<C.SellerSampleList, Res<"listSellerSamples">>;
export type AdvanceSellerSampleRes = Response<C.SellerSampleList, Res<"advanceSellerSample">>;

export type GetSellerFinanceSummary = Response<
  C.SellerFinanceSummary,
  Res<"getSellerFinanceSummary">
>;
export type ListSellerPayouts = Response<C.SellerPayoutsPage, Res<"listSellerPayouts">>;

export type GetSellerFeedback = Response<C.SellerFeedback, Res<"getSellerFeedback">>;
export type AnswerSellerQuestion = Request<Req<"answerSellerQuestion">, C.AnswerBody>;
export type AnswerSellerQuestionRes = Response<C.SellerFeedback, Res<"answerSellerQuestion">>;
export type ReplySellerReview = Request<Req<"replySellerReview">, C.AnswerBody>;
export type ReplySellerReviewRes = Response<C.SellerFeedback, Res<"replySellerReview">>;

export type GetSellerAudit = Response<C.SellerAudit, Res<"getSellerAudit">>;
export type RequestSellerAudit = Request<Req<"requestSellerAudit">, C.RequestAuditBody>;
export type RequestSellerAuditRes = Response<C.SellerAudit, Res<"requestSellerAudit">>;

export type GetSellerProfile = Response<C.SellerProfile, Res<"getSellerProfile">>;
export type UpdateSellerProfile = Request<Req<"updateSellerProfile">, C.UpdateSellerProfileBody>;
export type UpdateSellerProfileRes = Response<C.SellerProfile, Res<"updateSellerProfile">>;

export type GetFactoryOnboarding = Response<C.FactoryOnboardingDraft, Res<"getFactoryOnboarding">>;
export type SaveFactoryOnboarding = Request<
  Req<"saveFactoryOnboarding">,
  C.SaveFactoryOnboardingBody
>;
export type SaveFactoryOnboardingRes = Response<
  C.FactoryOnboardingDraft,
  Res<"saveFactoryOnboarding">
>;

/* ══════════════════════════════════════════════════════════════════════════
   backoffice · бэк-офис оператора  (http/backoffice.ts)
   ══════════════════════════════════════════════════════════════════════════ */

export type AdminOverview = Response<C.AdminOverview, Res<"adminOverview">>;

export type AdminListFactories = Response<C.AdminFactoryList, Res<"adminListFactories">>;
export type AdminFactoryDecision = Request<Req<"adminFactoryDecision">, C.AdminFactoryDecisionBody>;
export type AdminFactoryDecisionRes = Response<C.AdminFactoryList, Res<"adminFactoryDecision">>;
export type AdminScheduleAuditVisit = Request<
  Req<"adminScheduleAuditVisit">,
  C.ScheduleAuditVisitBody
>;
export type AdminScheduleAuditVisitRes = Response<
  C.AdminFactoryList,
  Res<"adminScheduleAuditVisit">
>;

export type AdminListOffers = Response<C.AdminOfferList, Res<"adminListOffers">>;
export type AdminOfferDecision = Request<Req<"adminOfferDecision">, C.AdminOfferDecisionBody>;
export type AdminOfferDecisionRes = Response<C.AdminOfferList, Res<"adminOfferDecision">>;

/** ИСКЛЮЧЕНИЕ · остаток Q-318: сам список и карточка приведены к контракту, но внутри
    карточки лежит `events[]` — тот же `#[serde(flatten)]`, что и у `getOrderEvents`. */
export type ListDisputes = Known<C.AdminDisputeList, Res<"listDisputes">>;
/** ИСКЛЮЧЕНИЕ · остаток Q-318: `events[]` в карточке — `#[serde(flatten)]`
    (см. `GetOrderEvents`). Остальные поля карточки сходятся. */
export type GetDisputeForOperator = Known<C.AdminDisputeCard, Res<"getDisputeForOperator">>;
export type ResolveDispute = Request<Req<"resolveDispute">, C.ResolveDisputeBody>;
/** ИСКЛЮЧЕНИЕ · остаток Q-318: `events[]` в карточке — `#[serde(flatten)]`. */
export type ResolveDisputeRes = Known<C.AdminDisputeCard, Res<"resolveDispute">>;

/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `tranches` в сводке финансов — свободный объект. */
export type AdminFinance = Known<C.AdminFinanceOverview, Res<"adminFinance">>;
export type ListAdminTranches = Response<C.AdminTranchesPage, Res<"listAdminTranches">>;
export type ConfirmTrancheFunds = Request<Req<"confirmTrancheFunds">, C.ConfirmFundsRequest>;
/** ИСКЛЮЧЕНИЕ · бэк отдаёт сделку `payments` (`PaymentsDeal`), экран ждёт пересчитанную
    сводку финансов. Привести можно только перенеся маршрут в `backoffice` — `payments`
    не может зависеть от бэк-офиса (цикл крейтов). Рантайму это не мешает:
    `AdminFinancePage` ответ не читает, а инвалидирует запросы бэк-офиса. */
export type ConfirmTrancheFundsRes = Known<C.AdminFinanceOverview, Res<"confirmTrancheFunds">>;
export type ConfirmDealPayout = Request<Req<"confirmDealPayout">, C.PayoutConfirmedRequest>;
/** ИСКЛЮЧЕНИЕ · то же, что у `ConfirmTrancheFundsRes`: ответ — сделка `payments`,
    экран его не читает. */
export type ConfirmDealPayoutRes = Known<C.AdminFinanceOverview, Res<"confirmDealPayout">>;

/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: дерево категорий рекурсивно (`children: Vec<Object>`), utoipa
    рекурсию не разворачивает. */
export type AdminTaxonomy = Known<C.AdminTaxonomy, Res<"adminTaxonomy">>;
export type AdminUpdateTaxonomyCategory = Request<
  Req<"adminUpdateTaxonomyCategory">,
  C.UpdateTaxonomyCategoryBody
>;
/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: рекурсивное дерево категорий. */
export type AdminUpdateTaxonomyCategoryRes = Known<
  C.AdminTaxonomy,
  Res<"adminUpdateTaxonomyCategory">
>;

/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `promos` — свободный объект. */
export type AdminRanking = Known<C.AdminRanking, Res<"adminRanking">>;
export type AdminUpdateRanking = Request<Req<"adminUpdateRanking">, C.UpdateRankingBody>;
/** ИСКЛЮЧЕНИЕ · `#[schema(value_type = Object)]` на бэке: `promos` — свободный объект. */
export type AdminUpdateRankingRes = Known<C.AdminRanking, Res<"adminUpdateRanking">>;
export type AdminRankingPreview = Request<Req<"adminRankingPreview">, C.RankingPreviewBody>;
export type AdminRankingPreviewRes = Response<C.RankingPreview, Res<"adminRankingPreview">>;
/* п. 13, Q-332: «Доставлено» оператора — запасной путь. */
export type MarkOrderDeliveredRes = Response<C.Order, Res<"markOrderDelivered">>;
/* п. 35: «Зависшие». */
export type AdminListStuck = Response<C.AdminStuckPage, Res<"adminListStuck">>;
export type AdminStuckCount = Response<C.AdminStuckCount, Res<"adminStuckCount">>;
/** ИСКЛЮЧЕНИЕ · `actions[].action` у бэка — `String` (имя записи аудит-лога), фронт сужает до
    `"stuck.retry" | "stuck.resolve"`. Экран неизвестное значение показывает как «Решено»
    и не падает; остальные поля карточки сходятся (Q-386). */
export type AdminStuckCard = Known<C.AdminStuckCard, Res<"adminStuckCard">>;
export type AdminStuckRetry = Request<Req<"adminStuckRetry">, C.AdminStuckActionBody>;
/** ИСКЛЮЧЕНИЕ · то же, что у `AdminStuckCard`: `actions[].action` — строка. */
export type AdminStuckRetryRes = Known<C.AdminStuckCard, Res<"adminStuckRetry">>;
export type AdminStuckResolve = Request<Req<"adminStuckResolve">, C.AdminStuckActionBody>;
/** ИСКЛЮЧЕНИЕ · то же, что у `AdminStuckCard`: `actions[].action` — строка. */
export type AdminStuckResolveRes = Known<C.AdminStuckCard, Res<"adminStuckResolve">>;
/* Остальное в карточке — сверка без `actions`: строка, payload, флаги кнопок. */
export type AdminStuckCardFields = Response<
  Omit<C.AdminStuckCard, "actions">,
  Omit<Res<"adminStuckCard">, "actions">
>;
/* Q-401: «Просроченные транши» — очередь, бейдж, «Продлить», «Открыть спор». */
export type AdminListOverdueTranches = Response<
  C.AdminOverdueTranchePage,
  Res<"adminListOverdueTranches">
>;
export type AdminOverdueTranchesCount = Response<
  C.AdminOverdueTrancheCount,
  Res<"adminOverdueTranchesCount">
>;
export type AdminExtendOverdueTranche = Request<
  Req<"adminExtendOverdueTranche">,
  C.AdminOverdueExtendBody
>;
export type AdminExtendOverdueTrancheRes = Response<
  C.AdminOverdueActionResult,
  Res<"adminExtendOverdueTranche">
>;
export type AdminOpenOverdueDispute = Request<
  Req<"adminOpenOverdueDispute">,
  C.AdminOverdueDisputeBody
>;
export type AdminOpenOverdueDisputeRes = Response<
  C.AdminOverdueActionResult,
  Res<"adminOpenOverdueDispute">
>;
