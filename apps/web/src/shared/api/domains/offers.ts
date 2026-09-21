import type {
  CreateQuestionBody,
  OfferDetail,
  OfferQuestion,
  OfferQuestionList,
  OfferReviewList,
  OfferSummary,
} from "@partiya/api-contracts";

/** Домен «Карточка предложения» — `GET /offers/{id}` и его хвосты (ARCHITECTURE.md, 8.4). */
export interface OffersApi {
  /** `GET /offers/{id}` → оффер, активная версия и завод. Снятое предложение — 404. */
  getOffer(id: number, signal?: AbortSignal): Promise<OfferDetail>;
  /** `GET /offers/{id}/similar` → блок «Похожие предложения». */
  getSimilarOffers(id: number, signal?: AbortSignal): Promise<OfferSummary[]>;
  /** `GET /offers/{id}/questions` → вопросы технологу; читает и аноним. */
  getOfferQuestions(id: number, signal?: AbortSignal): Promise<OfferQuestionList>;
  /** `GET /offers/{id}/reviews` → отзывы о предложении. */
  getOfferReviews(id: number, signal?: AbortSignal): Promise<OfferReviewList>;
  /** `POST /offers/{id}/questions` → 201. Аноним получает 401 и уходит на вход. */
  askOfferQuestion(id: number, body: CreateQuestionBody): Promise<OfferQuestion>;
}
