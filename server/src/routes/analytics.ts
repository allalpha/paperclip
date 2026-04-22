import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { analyticsService } from "../services/analytics.js";
import { assertCompanyAccess } from "./authz.js";

export function analyticsRoutes(db: Db) {
  const router = Router();
  const svc = analyticsService(db);

  router.get("/api/v1/analytics/funnel", async (req, res) => {
    const companyId = req.query.companyId as string;
    assertCompanyAccess(req, companyId);
    const funnel = await svc.funnel(companyId);
    res.json(funnel);
  });

  router.get("/api/v1/analytics/sources", async (req, res) => {
    const companyId = req.query.companyId as string;
    assertCompanyAccess(req, companyId);
    const sources = await svc.sources(companyId);
    res.json(sources);
  });

  router.get("/api/v1/analytics/agents", async (req, res) => {
    const companyId = req.query.companyId as string;
    assertCompanyAccess(req, companyId);
    const agentStats = await svc.agentStats(companyId);
    res.json(agentStats);
  });

  router.get("/api/v1/analytics/summary", async (req, res) => {
    const companyId = req.query.companyId as string;
    assertCompanyAccess(req, companyId);
    const summary = await svc.summary(companyId);
    res.json(summary);
  });

  return router;
}