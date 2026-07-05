import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Centralized data loading for Mission Control v2
export function useMissionData() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.BuildRegistry.list("-created_date", 200).catch(() => []),
      base44.entities.CanonEntry.list("-created_date", 500).catch(() => []),
      base44.entities.AgentProfile.list("-created_date", 100).catch(() => []),
      base44.entities.Task.list("-created_date", 200).catch(() => []),
      base44.entities.DiagnosticIssue.filter({ status: "open" }, "-created_date", 100).catch(() => []),
      base44.entities.ImprovementItem.filter({ status: "queued" }, "-created_date", 20).catch(() => []),
      base44.entities.Subscription.filter({ status: "active" }).catch(() => []),
      base44.entities.Invoice.filter({ status: "open" }).catch(() => []),
      base44.entities.SurvivalMetric.list("-created_date", 1).catch(() => []),
      base44.entities.Evidence.list("-created_date", 200).catch(() => []),
      base44.entities.DecisionRecord.list("-created_date", 100).catch(() => []),
      base44.entities.ApprovalGate.filter({ status: "pending" }, "-created_date", 50).catch(() => []),
      base44.entities.Notification.filter({ read: false }, "-created_date", 50).catch(() => []),
      base44.entities.RoadmapItem.list("-created_date", 100).catch(() => []),
      base44.entities.Release.list("-created_date", 50).catch(() => []),
      base44.entities.Milestone.list("-created_date", 50).catch(() => []),
      base44.entities.HealthCheck.list("-created_date", 50).catch(() => []),
      base44.entities.AuditLog.list("-created_date", 50).catch(() => []),
      base44.entities.CRMLead.list("-created_date", 100).catch(() => []),
      base44.entities.CRMOpportunity.list("-created_date", 100).catch(() => []),
      base44.entities.EnterpriseOrg.list("-created_date", 50).catch(() => []),
      base44.entities.WorkerProfile.list("-created_date", 100).catch(() => []),
      base44.entities.WorkerTimeEntry.list("-created_date", 100).catch(() => []),
      base44.entities.WorkforceInvoice.list("-created_date", 100).catch(() => []),
      base44.entities.GigOpportunity.filter({ status: "open" }, "-created_date", 50).catch(() => []),
      base44.entities.SafetyReport.filter({ status: "open" }, "-created_date", 50).catch(() => []),
      base44.entities.Automation.list("-created_date", 100).catch(() => []),
      base44.entities.RevenueEvent.list("-created_date", 100).catch(() => []),
      base44.entities.PlatformConfig.list("-created_date", 50).catch(() => []),
      base44.entities.TechnicalDebt.list("-created_date", 50).catch(() => []),
      base44.entities.Resource.list("-created_date", 100).catch(() => []),
      base44.entities.ResourceCase.list("-created_date", 50).catch(() => []),
      base44.entities.AuthorityInteraction.list("-created_date", 50).catch(() => []),
      base44.entities.DailyBriefing.list("-created_date", 10).catch(() => []),
    ]).then(([
      builds, canon, agents, tasks, issues, improvements, subs, invoices, survival,
      evidence, decisions, approvals, notifications, roadmap, releases, milestones,
      healthChecks, auditLogs, crmLeads, crmOpps, enterpriseOrgs, workers, timeEntries,
      wfInvoices, gigs, safety, automations, revenueEvents, platformConfig, techDebt,
      resources, resourceCases, authorityInteractions, briefings
    ]) => {
      setData({
        builds, canon, agents, tasks, issues, improvements, subs, invoices, survival: survival[0],
        evidence, decisions, approvals, notifications, roadmap, releases, milestones,
        healthChecks, auditLogs, crmLeads, crmOpps, enterpriseOrgs, workers, timeEntries,
        wfInvoices, gigs, safety, automations, revenueEvents, platformConfig, techDebt,
        resources, resourceCases, authorityInteractions, briefings,
      });
      setLoading(false);
    });
  }, []);

  return { data, loading };
}

// Calculate overall Mission Readiness Score (0-100)
export function calcReadinessScore(data) {
  if (!data || !data.builds) return 0;
  const { builds, canon, agents, issues, subs, evidence, approvals, tasks } = data;

  // Build completion (30% weight)
  const totalDone = builds.reduce((s, b) => (b.completed_tasks || []).length + s, 0);
  const totalReq = builds.reduce((s, b) => (b.required_tasks || []).length + s, 0);
  const buildPct = totalReq > 0 ? (totalDone / totalReq) * 100 : 0;

  // Canon coverage (20% weight)
  const verifiedCanon = canon.filter(e => e.verified && e.status === "active").length;
  const canonPct = Math.min((verifiedCanon / 25) * 100, 100);

  // System health (20% weight) - fewer open issues = higher score
  const critIssues = issues.filter(i => i.severity === "critical").length;
  const healthPct = Math.max(0, 100 - (issues.length * 2) - (critIssues * 10));

  // Revenue (15% weight)
  const mrr = subs.reduce((s, sub) => s + (sub.mrr || 0), 0);
  const revenuePct = Math.min((mrr / 10000) * 100, 100);

  // AI workforce activation (10% weight)
  const activeAgents = agents.filter(a => a.tasks_completed > 0 || a.status === "active").length;
  const workforcePct = agents.length > 0 ? (activeAgents / agents.length) * 100 : 0;

  // Approvals backlog (5% weight) - fewer pending = higher
  const approvalPct = Math.max(0, 100 - (approvals.length * 5));

  const score = Math.round(
    buildPct * 0.30 + canonPct * 0.20 + healthPct * 0.20 + revenuePct * 0.15 + workforcePct * 0.10 + approvalPct * 0.05
  );
  return Math.min(100, Math.max(0, score));
}