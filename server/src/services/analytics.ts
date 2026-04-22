import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, heartbeatRuns, issues } from "@paperclipai/db";
import type { AnalyticsFunnel, AnalyticsSource, AnalyticsAgentStats, AnalyticsAgentSummary, AnalyticsSummary } from "@paperclipai/shared";

const FUNNEL_STATUS_ORDER = ["backlog", "todo", "in_progress", "in_review", "blocked", "done", "cancelled"];

export function analyticsService(db: Db) {
  return {
    funnel: async (companyId: string): Promise<AnalyticsFunnel> => {
      const rows = await db
        .select({ status: issues.status, count: sql<number>`count(*)` })
        .from(issues)
        .where(eq(issues.companyId, companyId))
        .groupBy(issues.status);

      const counts = new Map<string, number>();
      for (const row of rows) counts.set(row.status, Number(row.count));

      const stages = FUNNEL_STATUS_ORDER
        .filter(s => counts.has(s))
        .map(status => ({ status, count: counts.get(status)! }));

      // Include any statuses not in our predefined order
      for (const [status, count] of counts) {
        if (!FUNNEL_STATUS_ORDER.includes(status)) {
          stages.push({ status, count });
        }
      }

      return { stages };
    },

    sources: async (companyId: string): Promise<AnalyticsSource[]> => {
      const rows = await db
        .select({ originKind: issues.originKind, count: sql<number>`count(*)` })
        .from(issues)
        .where(eq(issues.companyId, companyId))
        .groupBy(issues.originKind);

      return rows.map(row => ({
        originKind: row.originKind,
        count: Number(row.count),
      }));
    },

    agentStats: async (companyId: string): Promise<AnalyticsAgentSummary> => {
      const rows = await db
        .select({
          agentId: heartbeatRuns.agentId,
          status: heartbeatRuns.status,
          count: sql<number>`count(*)::double precision`,
        })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.companyId, companyId))
        .groupBy(heartbeatRuns.agentId, heartbeatRuns.status);

      // Fetch agent names
      const agentRows = await db
        .select({ id: agents.id, name: agents.name })
        .from(agents)
        .where(eq(agents.companyId, companyId));

      const nameMap = new Map<string, string>();
      for (const a of agentRows) nameMap.set(a.id, a.name);

      // Aggregate by agent
      const agentMap = new Map<string, AnalyticsAgentStats>();
      for (const row of rows) {
        const id = row.agentId;
        if (!agentMap.has(id)) {
          agentMap.set(id, { agentId: id, agentName: nameMap.get(id) ?? "Unknown", succeeded: 0, failed: 0, other: 0, total: 0 });
        }
        const entry = agentMap.get(id)!;
        const count = Number(row.count);
        if (row.status === "succeeded") entry.succeeded += count;
        else if (row.status === "failed" || row.status === "timed_out") entry.failed += count;
        else entry.other += count;
        entry.total += count;
      }

      return { agents: Array.from(agentMap.values()).sort((a, b) => b.total - a.total) };
    },

    summary: async (companyId: string): Promise<AnalyticsSummary> => {
      const [funnel, sources, agents] = await Promise.all([
        analyticsService(db).funnel(companyId),
        analyticsService(db).sources(companyId),
        analyticsService(db).agentStats(companyId),
      ]);
      return { funnel, sources, agents };
    },
  };
}