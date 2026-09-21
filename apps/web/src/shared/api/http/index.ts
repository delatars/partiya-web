import type { ApiService } from "../domains";
import { HttpClient } from "../http-client";
import { createAuthHttpApi } from "./auth";
import { createBackofficeHttpApi } from "./backoffice";
import { createCapacityHttpApi } from "./capacity";
import { createCatalogHttpApi } from "./catalog";
import { createDisputesHttpApi } from "./disputes";
import { createDocumentsHttpApi } from "./documents";
import { createFactoriesHttpApi } from "./factories";
import { createMessagesHttpApi } from "./messages";
import { createNotificationsHttpApi } from "./notifications";
import { createOffersHttpApi } from "./offers";
import { createOrdersHttpApi } from "./orders";
import { createPaymentsHttpApi } from "./payments";
import { createQuotesHttpApi } from "./quotes";
import { createSellerHttpApi } from "./seller";
import { createTrackingHttpApi } from "./tracking";

/* Сборка HTTP-реализации из доменных кусков.
   Новый домен: файл `http/<имя>.ts` с фабрикой + одна строка в этом объекте.

   `baseUrl` уходит в домены с SSE: канал поднимается голым fetch мимо `HttpClient`,
   и путь ему нужно собрать самому. */
export function createHttpApiService(baseUrl: string): ApiService {
  const client = new HttpClient(baseUrl);
  return {
    ...createAuthHttpApi(client),
    ...createCatalogHttpApi(client),
    ...createOffersHttpApi(client),
    ...createQuotesHttpApi(client),
    ...createFactoriesHttpApi(client),
    ...createOrdersHttpApi(client),
    ...createTrackingHttpApi(client, baseUrl),
    ...createMessagesHttpApi(client),
    ...createDocumentsHttpApi(client),
    ...createDisputesHttpApi(client),
    ...createNotificationsHttpApi(client, baseUrl),
    ...createPaymentsHttpApi(client),
    ...createSellerHttpApi(client),
    ...createCapacityHttpApi(client),
    ...createBackofficeHttpApi(client),
  };
}
