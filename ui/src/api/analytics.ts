import type { AnalyticsFunnel, AnalyticsSource, AnalyticsAgentSummary, AnalyticsSummary } from "@paperclipai/shared";
import { api } from "./client";

export const analyticsApi = {
  funnel: (companyId: string) =>
    api.get<AnalyticsFunnel>(`/api/v1/analytics/funnel?companyId=${companyId}`),

  sources: (companyId: string) =>
    api.get<AnalyticsSource[]>(`/api/v1/analytics/sources?companyId=${companyId}`),

  agentStats: (companyId: string) =>
    api.get<AnalyticsAgentSummary>(`/api/v1/analytics/agents?companyId=${companyId}`),

  summary: (companyId: string) =>
    api.get<AnalyticsSummary>(`/api/v1/analytics/summary?companyId=${companyId}`),
};