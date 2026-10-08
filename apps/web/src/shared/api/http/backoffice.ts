import type {
  AdminDisputeCard,
  AdminDisputeList,
  AdminDisputeListQuery,
  AdminFactoryDecisionBody,
  AdminFactoryList,
  AdminFactoryListQuery,
  AdminFinanceOverview,
  AdminOfferDecisionBody,
  AdminOfferList,
  AdminOfferListQuery,
  AdminOverdueActionResult,
  AdminOverdueDisputeBody,
  AdminOverdueExtendBody,
  AdminOverdueTrancheCount,
  AdminOverdueTranchePage,
  AdminOverview,
  AdminRanking,
  AdminStuckActionBody,
  AdminStuckCard,
  AdminStuckCount,
  AdminStuckKind,
  AdminStuckPage,
  AdminStuckQuery,
  AdminTaxonomy,
  AdminTranchesPage,
  AdminTranchesQuery,
  ConfirmFundsRequest,
  Order,
  PayoutConfirmedRequest,
  RankingPreview,
  RankingPreviewBody,
  ResolveDisputeBody,
  ScheduleAuditVisitBody,
  UpdateRankingBody,
  UpdateTaxonomyCategoryBody,
} from "@partiya/api-contracts";

import type { BackofficeApi } from "../domains/backoffice";
import type { HttpClient } from "../http-client";

/* Реальный бэк: `/admin/…` (ARCHITECTURE.md, раздел 9). Четыре маршрута `admin-payments`
   уже реализованы — их пути и тела совпадают с openapi.json до символа. */
function stuckPath(kind: AdminStuckKind, id: string): string {
  return `/admin/stuck/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`;
}

export function createBackofficeHttpApi(client: HttpClient): BackofficeApi {
  return {
    getAdminOverview(signal?: AbortSignal): Promise<AdminOverview> {
      return client.get<AdminOverview>("/admin/overview", { signal });
    },

    listAdminFactories(
      query: AdminFactoryListQuery = {},
      signal?: AbortSignal,
    ): Promise<AdminFactoryList> {
      return client.get<AdminFactoryList>("/admin/factories", {
        query: { tab: query.tab, selected: query.selected },
        signal,
      });
    },

    decideAdminFactory(orgId: string, body: AdminFactoryDecisionBody): Promise<AdminFactoryList> {
      return client.post<AdminFactoryList>(
        `/admin/factories/${encodeURIComponent(orgId)}/decision`,
        { body },
      );
    },

    scheduleAuditVisit(orgId: string, body: ScheduleAuditVisitBody): Promise<AdminFactoryList> {
      return client.post<AdminFactoryList>(
        `/admin/factories/${encodeURIComponent(orgId)}/audit-visit`,
        { body },
      );
    },

    listAdminOffers(
      query: AdminOfferListQuery = {},
      signal?: AbortSignal,
    ): Promise<AdminOfferList> {
      return client.get<AdminOfferList>("/admin/offers", {
        query: { tab: query.tab, selected: query.selected },
        signal,
      });
    },

    decideAdminOffer(offerId: number, body: AdminOfferDecisionBody): Promise<AdminOfferList> {
      return client.post<AdminOfferList>(`/admin/offers/${String(offerId)}/decision`, { body });
    },

    listAdminDisputes(
      query: AdminDisputeListQuery = {},
      signal?: AbortSignal,
    ): Promise<AdminDisputeList> {
      return client.get<AdminDisputeList>("/admin/disputes", { query: { tab: query.tab }, signal });
    },

    getAdminDispute(orderId: number, signal?: AbortSignal): Promise<AdminDisputeCard> {
      return client.get<AdminDisputeCard>(`/admin/disputes/${String(orderId)}`, { signal });
    },

    resolveAdminDispute(
      orderId: number,
      body: ResolveDisputeBody,
      idempotencyKey: string,
    ): Promise<AdminDisputeCard> {
      return client.post<AdminDisputeCard>(`/admin/disputes/${String(orderId)}/resolve`, {
        body,
        idempotencyKey,
      });
    },

    getAdminFinance(signal?: AbortSignal): Promise<AdminFinanceOverview> {
      return client.get<AdminFinanceOverview>("/admin/finance", { signal });
    },

    listAdminTranches(
      query: AdminTranchesQuery = {},
      signal?: AbortSignal,
    ): Promise<AdminTranchesPage> {
      return client.get<AdminTranchesPage>("/admin/payments/tranches", {
        query: { status: query.status, cursor: query.cursor, limit: query.limit },
        signal,
      });
    },

    confirmTrancheFunds(
      trancheId: string,
      body: ConfirmFundsRequest,
      idempotencyKey: string,
    ): Promise<AdminFinanceOverview> {
      return client.post<AdminFinanceOverview>(
        `/admin/payments/tranches/${encodeURIComponent(trancheId)}/confirm-funds`,
        { body, idempotencyKey },
      );
    },

    confirmDealPayout(
      dealId: string,
      body: PayoutConfirmedRequest,
      idempotencyKey: string,
    ): Promise<AdminFinanceOverview> {
      return client.post<AdminFinanceOverview>(
        `/admin/payments/deals/${encodeURIComponent(dealId)}/payout-confirmed`,
        { body, idempotencyKey },
      );
    },

    getAdminTaxonomy(path?: string, signal?: AbortSignal): Promise<AdminTaxonomy> {
      return client.get<AdminTaxonomy>("/admin/taxonomy", { query: { path }, signal });
    },

    updateTaxonomyCategory(path: string, body: UpdateTaxonomyCategoryBody): Promise<AdminTaxonomy> {
      return client.request<AdminTaxonomy>(
        "PUT",
        `/admin/taxonomy/categories/${encodeURIComponent(path)}`,
        { body },
      );
    },

    getAdminRanking(signal?: AbortSignal): Promise<AdminRanking> {
      return client.get<AdminRanking>("/admin/ranking", { signal });
    },

    updateAdminRanking(body: UpdateRankingBody): Promise<AdminRanking> {
      return client.request<AdminRanking>("PUT", "/admin/ranking", { body });
    },

    previewAdminRanking(body: RankingPreviewBody): Promise<RankingPreview> {
      return client.post<RankingPreview>("/admin/ranking/preview", { body });
    },

    markAdminOrderDelivered(orderId: number): Promise<Order> {
      return client.post<Order>(`/admin/orders/${String(orderId)}/delivered`);
    },

    listAdminStuck(query: AdminStuckQuery = {}, signal?: AbortSignal): Promise<AdminStuckPage> {
      return client.get<AdminStuckPage>("/admin/stuck", {
        query: { kind: query.kind, type: query.type, cursor: query.cursor, limit: query.limit },
        signal,
      });
    },

    getAdminStuckCount(signal?: AbortSignal): Promise<AdminStuckCount> {
      return client.get<AdminStuckCount>("/admin/stuck/count", { signal });
    },

    getAdminStuckCard(
      kind: AdminStuckKind,
      id: string,
      signal?: AbortSignal,
    ): Promise<AdminStuckCard> {
      return client.get<AdminStuckCard>(stuckPath(kind, id), { signal });
    },

    retryAdminStuck(
      kind: AdminStuckKind,
      id: string,
      body: AdminStuckActionBody,
    ): Promise<AdminStuckCard> {
      return client.post<AdminStuckCard>(`${stuckPath(kind, id)}/retry`, { body });
    },

    resolveAdminStuck(
      kind: AdminStuckKind,
      id: string,
      body: AdminStuckActionBody,
    ): Promise<AdminStuckCard> {
      return client.post<AdminStuckCard>(`${stuckPath(kind, id)}/resolve`, { body });
    },

    listAdminOverdueTranches(signal?: AbortSignal): Promise<AdminOverdueTranchePage> {
      return client.get<AdminOverdueTranchePage>("/admin/overdue-tranches", { signal });
    },

    getAdminOverdueTrancheCount(signal?: AbortSignal): Promise<AdminOverdueTrancheCount> {
      return client.get<AdminOverdueTrancheCount>("/admin/overdue-tranches/count", { signal });
    },

    extendAdminOverdueTranche(
      orderNo: number,
      body: AdminOverdueExtendBody,
    ): Promise<AdminOverdueActionResult> {
      return client.post<AdminOverdueActionResult>(
        `/admin/overdue-tranches/${String(orderNo)}/extend`,
        { body },
      );
    },

    openAdminOverdueDispute(
      orderNo: number,
      body: AdminOverdueDisputeBody,
    ): Promise<AdminOverdueActionResult> {
      return client.post<AdminOverdueActionResult>(
        `/admin/overdue-tranches/${String(orderNo)}/dispute`,
        { body },
      );
    },
  };
}
