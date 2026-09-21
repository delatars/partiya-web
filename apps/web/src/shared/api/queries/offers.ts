import { queryOptions } from "@tanstack/react-query";

import { getApiService } from "../service";

/* Фабрика ключей домена «Карточка предложения». Карточку спрашивают и страница оффера,
   и сравнение (до четырёх сразу) — поэтому ключи живут в слое API, а не в модуле. */
export const OFFER_KEYS = {
  all: ["offers"] as const,
  detail: (id: number) => [...OFFER_KEYS.all, "detail", id] as const,
  similar: (id: number) => [...OFFER_KEYS.all, "similar", id] as const,
  questions: (id: number) => [...OFFER_KEYS.all, "questions", id] as const,
  reviews: (id: number) => [...OFFER_KEYS.all, "reviews", id] as const,
};

export const offerDetailOptions = (id: number) =>
  queryOptions({
    queryKey: OFFER_KEYS.detail(id),
    queryFn: ({ signal }) => getApiService().getOffer(id, signal),
  });

export const offerSimilarOptions = (id: number) =>
  queryOptions({
    queryKey: OFFER_KEYS.similar(id),
    queryFn: ({ signal }) => getApiService().getSimilarOffers(id, signal),
  });

export const offerQuestionsOptions = (id: number) =>
  queryOptions({
    queryKey: OFFER_KEYS.questions(id),
    queryFn: ({ signal }) => getApiService().getOfferQuestions(id, signal),
  });

export const offerReviewsOptions = (id: number) =>
  queryOptions({
    queryKey: OFFER_KEYS.reviews(id),
    queryFn: ({ signal }) => getApiService().getOfferReviews(id, signal),
  });
