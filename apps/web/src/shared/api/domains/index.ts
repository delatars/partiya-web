import type { AuthApi } from "./auth";
import type { BackofficeApi } from "./backoffice";
import type { CapacityApi } from "./capacity";
import type { CatalogApi } from "./catalog";
import type { DisputesApi } from "./disputes";
import type { DocumentsApi } from "./documents";
import type { FactoriesApi } from "./factories";
import type { MessagesApi } from "./messages";
import type { NotificationsApi } from "./notifications";
import type { OffersApi } from "./offers";
import type { OrdersApi } from "./orders";
import type { PaymentsApi } from "./payments";
import type { QuotesApi } from "./quotes";
import type { SellerApi } from "./seller";
import type { TrackingApi } from "./tracking";

/* Контракт сервиса — пересечение доменных интерфейсов.
   Новый домен: файл `domains/<имя>.ts` с интерфейсом + строка импорта и строка в пересечении.
   Модули при этом не конфликтуют: каждый правит свой файл. */

export type ApiService = AuthApi &
  CatalogApi &
  OffersApi &
  QuotesApi &
  FactoriesApi &
  OrdersApi &
  TrackingApi &
  MessagesApi &
  DocumentsApi &
  DisputesApi &
  NotificationsApi &
  PaymentsApi &
  SellerApi &
  CapacityApi &
  BackofficeApi;

export type {
  AuthApi,
  BackofficeApi,
  CapacityApi,
  CatalogApi,
  DisputesApi,
  DocumentsApi,
  FactoriesApi,
  MessagesApi,
  NotificationsApi,
  OffersApi,
  OrdersApi,
  PaymentsApi,
  QuotesApi,
  SellerApi,
  TrackingApi,
};
export type { OrderStreamOptions, StreamState } from "./tracking";
export type { UserStreamOptions } from "./notifications";
