import type {
  CreateQuestionBody,
  OfferDetail,
  OfferQuestion,
  OfferQuestionList,
  OfferReviewList,
  OfferSummary,
  Quote,
  QuoteRequest,
} from "@partiya/api-contracts";

import { createDelegatingApiService } from "@/shared/api";
import type { ApiService } from "@/shared/api";
import { toIsoDate } from "@/shared/lib/dates";
import { mockQuote, questionsOf, requireMockOffer, reviewsOf, similarOffers } from "@/shared/mocks";

/* Мок домена «Карточка предложения» и котировок.

   Котировку считает общий мок-движок (`shared/mocks/quote-engine.ts`) — тот же, которым
   пересчитывает партию экран оформления. Правила, порядок строк и округление совпадают
   с крейтом `pricing`; ошибки входа превращаются в 422 с problem+json, как у настоящего
   бэка: экран должен уметь их показывать до того, как появится сервер. */

const LATENCY_MS = 180;

/** Мок-задержка: без неё не видно ни скелетона, ни индикатора пересчёта. */
function delayed<T>(produce: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(produce());
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    }, LATENCY_MS);
  });
}

export const installOfferMocks = (inner: ApiService): ApiService =>
  createDelegatingApiService(inner, {
    getOffer: (id: number): Promise<OfferDetail> => delayed(() => requireMockOffer(id)),

    getSimilarOffers: (id: number): Promise<OfferSummary[]> =>
      delayed(() => {
        requireMockOffer(id);
        return similarOffers(id);
      }),

    getOfferQuestions: (id: number): Promise<OfferQuestionList> =>
      delayed(() => {
        requireMockOffer(id);
        const items = questionsOf(id);
        return { items, total: items.length };
      }),

    getOfferReviews: (id: number): Promise<OfferReviewList> =>
      delayed(() => {
        const offer = requireMockOffer(id);
        const items = reviewsOf(id);
        return { items, total: items.length, rating: offer.factory.rating };
      }),

    askOfferQuestion: (id: number, body: CreateQuestionBody): Promise<OfferQuestion> =>
      delayed(() => {
        requireMockOffer(id);
        return {
          // вопрос уходит на модерацию технологу: ответа у него ещё нет
          id: Date.now(),
          text: body.text,
          author: "Вы",
          askedAt: toIsoDate(new Date()),
        };
      }),

    createQuote: (request: QuoteRequest): Promise<Quote> => delayed(() => mockQuote(request)),
  });
