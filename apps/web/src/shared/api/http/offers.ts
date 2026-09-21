import type {
  CreateQuestionBody,
  OfferDetail,
  OfferQuestion,
  OfferQuestionList,
  OfferReviewList,
  OfferSummary,
} from "@partiya/api-contracts";

import type { OffersApi } from "../domains/offers";
import type { HttpClient } from "../http-client";

/* Реальный бэк: /offers/{id} и его хвосты. Пути знает только этот файл. */
export function createOffersHttpApi(client: HttpClient): OffersApi {
  const base = (id: number) => `/offers/${String(id)}`;

  return {
    getOffer: (id, signal) => client.get<OfferDetail>(base(id), { signal }),
    getSimilarOffers: (id, signal) => client.get<OfferSummary[]>(`${base(id)}/similar`, { signal }),
    getOfferQuestions: (id, signal) =>
      client.get<OfferQuestionList>(`${base(id)}/questions`, { signal }),
    getOfferReviews: (id, signal) => client.get<OfferReviewList>(`${base(id)}/reviews`, { signal }),
    askOfferQuestion: (id: number, body: CreateQuestionBody) =>
      client.post<OfferQuestion>(`${base(id)}/questions`, { body }),
  };
}
