import type {
  AdvanceStageBody,
  AnswerBody,
  DeclineOrderBody,
  DeclineSampleBody,
  FactoryOnboardingDraft,
  MarkDeliveredBody,
  PhotoReportBody,
  PhotoReportUploadRequest,
  PhotoReportUploadResponse,
  ReportProgressBody,
  RequestAuditBody,
  SaveFactoryOnboardingBody,
  SaveSellerOfferBody,
  SellerAudit,
  SellerDashboard,
  SellerFeedback,
  SellerFinanceSummary,
  SellerOfferEditor,
  SellerOfferList,
  SellerOfferListItem,
  SellerOrder,
  SellerOrderList,
  SellerOrderListQuery,
  SellerPayoutsPage,
  SellerProfile,
  SellerSampleList,
  SetOfferListedBody,
  ShipSampleBody,
  SubmitSellerOfferResponse,
  UpdateSellerProfileBody,
} from "@partiya/api-contracts";

import type { SellerApi } from "../domains/seller";
import type { HttpClient } from "../http-client";

/* Реальный бэк: срез `/seller/…` (ARCHITECTURE.md, 8.4). Часть маршрутов уже живёт
   (`/seller/orders…`, `/seller/finance/…`) — пути здесь совпадают с openapi.json
   до символа. Остальные описаны контрактом и ждут реализации. */
export function createSellerHttpApi(client: HttpClient): SellerApi {
  const order = (id: number) => `/seller/orders/${String(id)}`;
  const offer = (id: number) => `/seller/offers/${String(id)}`;
  const sample = (id: string) => `/seller/samples/${encodeURIComponent(id)}`;

  return {
    getSellerDashboard(signal?: AbortSignal): Promise<SellerDashboard> {
      return client.get<SellerDashboard>("/seller/dashboard", { signal });
    },

    listSellerOrders(
      query: SellerOrderListQuery = {},
      signal?: AbortSignal,
    ): Promise<SellerOrderList> {
      return client.get<SellerOrderList>("/seller/orders", {
        query: { stage: query.stage, page: query.page, perPage: query.perPage },
        signal,
      });
    },

    getSellerOrder(id: number, signal?: AbortSignal): Promise<SellerOrder> {
      return client.get<SellerOrder>(order(id), { signal });
    },

    confirmSellerOrder(id: number, idempotencyKey: string): Promise<SellerOrder> {
      return client.post<SellerOrder>(`${order(id)}/confirm`, { idempotencyKey });
    },

    declineSellerOrder(
      id: number,
      body: DeclineOrderBody,
      idempotencyKey: string,
    ): Promise<SellerOrder> {
      return client.post<SellerOrder>(`${order(id)}/decline`, { body, idempotencyKey });
    },

    reportSellerProgress(id: number, body: ReportProgressBody): Promise<SellerOrder> {
      return client.post<SellerOrder>(`${order(id)}/progress`, { body });
    },

    advanceSellerStage(id: number, body: AdvanceStageBody): Promise<SellerOrder> {
      return client.post<SellerOrder>(`${order(id)}/stage`, { body });
    },

    markSellerOrderDelivered(id: number, body: MarkDeliveredBody): Promise<SellerOrder> {
      return client.post<SellerOrder>(`${order(id)}/delivered`, { body });
    },

    requestPhotoReportUpload(
      id: number,
      body: PhotoReportUploadRequest,
    ): Promise<PhotoReportUploadResponse> {
      return client.post<PhotoReportUploadResponse>(`${order(id)}/photo-report/upload`, { body });
    },

    publishPhotoReport(id: number, body: PhotoReportBody): Promise<SellerOrder> {
      return client.post<SellerOrder>(`${order(id)}/photo-report`, { body });
    },

    listSellerOffers(signal?: AbortSignal): Promise<SellerOfferList> {
      return client.get<SellerOfferList>("/seller/offers", { signal });
    },

    getSellerOfferEditor(id: number | null, signal?: AbortSignal): Promise<SellerOfferEditor> {
      const path = id === null ? "/seller/offers/new" : `${offer(id)}/editor`;
      return client.get<SellerOfferEditor>(path, { signal });
    },

    saveSellerOffer(id: number | null, body: SaveSellerOfferBody): Promise<SellerOfferEditor> {
      return id === null
        ? client.post<SellerOfferEditor>("/seller/offers", { body })
        : client.patch<SellerOfferEditor>(offer(id), { body });
    },

    submitSellerOffer(id: number): Promise<SubmitSellerOfferResponse> {
      return client.post<SubmitSellerOfferResponse>(`${offer(id)}/submit`);
    },

    setSellerOfferListed(id: number, body: SetOfferListedBody): Promise<SellerOfferListItem> {
      return client.post<SellerOfferListItem>(`${offer(id)}/listing`, { body });
    },

    listSellerSamples(signal?: AbortSignal): Promise<SellerSampleList> {
      return client.get<SellerSampleList>("/seller/samples", { signal });
    },

    acceptSellerSample(id: string): Promise<SellerSampleList> {
      return client.post<SellerSampleList>(`${sample(id)}/accept`);
    },

    shipSellerSample(id: string, body: ShipSampleBody): Promise<SellerSampleList> {
      return client.post<SellerSampleList>(`${sample(id)}/ship`, { body });
    },

    declineSellerSample(id: string, body: DeclineSampleBody): Promise<SellerSampleList> {
      return client.post<SellerSampleList>(`${sample(id)}/decline`, { body });
    },

    getSellerFinanceSummary(signal?: AbortSignal): Promise<SellerFinanceSummary> {
      return client.get<SellerFinanceSummary>("/seller/finance/summary", { signal });
    },

    listSellerPayouts(
      query: { cursor?: string; limit?: number } = {},
      signal?: AbortSignal,
    ): Promise<SellerPayoutsPage> {
      return client.get<SellerPayoutsPage>("/seller/finance/payouts", {
        query: { cursor: query.cursor, limit: query.limit },
        signal,
      });
    },

    getSellerFeedback(signal?: AbortSignal): Promise<SellerFeedback> {
      return client.get<SellerFeedback>("/seller/feedback", { signal });
    },

    answerSellerQuestion(questionId: number, body: AnswerBody): Promise<SellerFeedback> {
      return client.post<SellerFeedback>(
        `/seller/feedback/questions/${String(questionId)}/answer`,
        { body },
      );
    },

    replySellerReview(reviewId: number, body: AnswerBody): Promise<SellerFeedback> {
      return client.post<SellerFeedback>(`/seller/feedback/reviews/${String(reviewId)}/reply`, {
        body,
      });
    },

    getSellerAudit(signal?: AbortSignal): Promise<SellerAudit> {
      return client.get<SellerAudit>("/seller/audit", { signal });
    },

    requestSellerAudit(body: RequestAuditBody): Promise<SellerAudit> {
      return client.post<SellerAudit>("/seller/audit/request", { body });
    },

    getSellerProfile(signal?: AbortSignal): Promise<SellerProfile> {
      return client.get<SellerProfile>("/seller/profile", { signal });
    },

    updateSellerProfile(body: UpdateSellerProfileBody): Promise<SellerProfile> {
      return client.request<SellerProfile>("PUT", "/seller/profile", { body });
    },

    getFactoryOnboarding(signal?: AbortSignal): Promise<FactoryOnboardingDraft> {
      return client.get<FactoryOnboardingDraft>("/seller/onboarding", { signal });
    },

    saveFactoryOnboarding(body: SaveFactoryOnboardingBody): Promise<FactoryOnboardingDraft> {
      return client.patch<FactoryOnboardingDraft>("/seller/onboarding", { body });
    },
  };
}
