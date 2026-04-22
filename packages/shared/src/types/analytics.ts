export interface AnalyticsFunnelStage {
  status: string;
  count: number;
}

export interface AnalyticsFunnel {
  stages: AnalyticsFunnelStage[];
}

export interface AnalyticsSource {
  originKind: string;
  count: number;
}

export interface AnalyticsAgentStats {
  agentId: string;
  agentName: string;
  succeeded: number;
  failed: number;
  other: number;
  total: number;
}

export interface AnalyticsAgentSummary {
  agents: AnalyticsAgentStats[];
}

export interface AnalyticsSummary {
  funnel: AnalyticsFunnel;
  sources: AnalyticsSource[];
  agents: AnalyticsAgentSummary;
}