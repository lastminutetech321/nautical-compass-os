import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Zap, CheckCircle, AlertTriangle, Loader2, RefreshCw, Brain,
  Wrench, ArrowRight, Clock, TrendingUp, Shield, XCircle, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const REPAIR_PLAYBOOK = {
  canon_gap: {
    canAutoRepair: false,
    reason: "Canon entries require verified legal authority — cannot be fabricated by AI",
    founderAction: "Upload and verify legal documents via Canon Ingestion",
  },
  blocked_build: {
    canAutoRepair: true,
    repair: async (issue, base44) => {
      // Create agent tasks to resolve blockers
      const buildName = issue.title.replace("Blocked build: ", "");
      await base44.entities.AgentTask.create({
        title: `Resolve blockers for: ${buildName}`,
        description: `Analyze and resolve all blocking dependencies for the ${buildName} build. Review blocked_by list, identify what can be resolved autonomously, create subtasks for each blocker.`,
        agent_name: "Product Manager Agent",
        task_type: "analyze",
        status: "queued",
        priority: "critical",
        linked_entity_type: "BuildRegistry",
      });
      return `Dispatched resolution task for ${buildName} to Product Manager Agent`;
    }
  },
  incomplete_workflow: {
    canAutoRepair: true,
    repair: async (issue, base44) => {
      await base44.entities.AgentTask.create({
        title: `Complete workflow: ${issue.title}`,
        description: issue.description || "Review and complete this incomplete workflow.",
        agent_name: "Product Manager Agent",
        task_type: "organize",
        status: "queued",
        priority: "medium",
      });
      return "Queued workflow completion task";
    }
  },
  agent_gap: {
    canAutoRepair: true,
    repair: async (issue, base44) => {
      await base44.entities.AgentTask.create({
        title: `Resolve agent gap: ${issue.title}`,
        description: `Deploy or activate missing agents. ${issue.description}`,
        agent_name: "Product Manager Agent",
        task_type: "organize",
        status: "queued",
        priority: "high",
      });
      return "Queued agent deployment task";
    }
  },
  missing_revenue_path: {
    canAutoRepair: false,
    reason: "Revenue activation requires Stripe setup and founder approval for payment configuration",
    founderAction: "Install payment integration and create subscription plans",
  },
  missing_feature: {
    canAutoRepair: true,
    repair: async (issue, base44) => {
      await base44.entities.AgentTask.create({
        title: `Build missing feature: ${issue.title}`,
        description: issue.description || "",
        agent_name: "Product Manager Agent",
        task_type: "draft",
        status: "queued",
        priority: "medium",
      });
      return "Queued feature development task";
    }
  },
};

export default function SelfHealingEngine() {
  const [issues, setIssues] = useState([]);
  const [healing, setHealing] = useState(false);
  const [healLog, setHealLog] = useState([]);
  const [repairStatus, setRepairStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ healed: 0, escalated: 0, pending: 0 });

  useEffect(() => { loadIssues(); }, []);

  const loadIssues = async () => {
    setLoading(true);
    const iss = await base44.entities.DiagnosticIssue.filter({ status: "open" }, "-created_date", 100).catch(() => []);
    setIssues(iss);
    setLoading(false);
  };

  const repairSingle = async (issue) => {
    setRepairStatus(s => ({ ...s, [issue.id]: "repairing" }));
    const playbook = REPAIR_PLAYBOOK[issue.category];
    try {
      if (!playbook || !playbook.canAutoRepair) {
        // Create ApprovalGate / founder action
        await base44.entities.ApprovalGate.create({
          title: `Founder Action Required: ${issue.title}`,
          description: playbook?.founderAction || "Manual intervention required",
          action_type: "deploy_code",
          risk_level: issue.severity || "medium",
          status: "pending",
          requesting_agent: "Self-Healing Engine",
          payload_summary: `Issue: ${issue.title}\nCategory: ${issue.category}\nReason cannot auto-repair: ${playbook?.reason || "Unknown"}\nAction needed: ${playbook?.founderAction || "Review issue"}`,
        });
        await base44.entities.DiagnosticIssue.update(issue.id, { status: "escalated", resolution_note: "Escalated to Founder via ApprovalGate" });
        setRepairStatus(s => ({ ...s, [issue.id]: "escalated" }));
        setHealLog(l => [...l, { type: "escalated", message: `Escalated: ${issue.title}`, time: new Date().toISOString() }]);
      } else {
        const result = await playbook.repair(issue, base44);
        await base44.entities.DiagnosticIssue.update(issue.id, { status: "resolved", resolution_note: result, resolved_at: new Date().toISOString() });
        setRepairStatus(s => ({ ...s, [issue.id]: "healed" }));
        setHealLog(l => [...l, { type: "healed", message: `Repaired: ${issue.title} — ${result}`, time: new Date().toISOString() }]);
      }
    } catch (e) {
      setRepairStatus(s => ({ ...s, [issue.id]: "failed" }));
      setHealLog(l => [...l, { type: "failed", message: `Failed: ${issue.title} — ${e.message}`, time: new Date().toISOString() }]);
    }
  };

  const runFullHeal = async () => {
    setHealing(true);
    setHealLog([]);
    let healed = 0, escalated = 0;
    for (const issue of issues) {
      if (repairStatus[issue.id]) continue;
      await repairSingle(issue);
      const playbook = REPAIR_PLAYBOOK[issue.category];
      if (playbook?.canAutoRepair) healed++;
      else escalated++;
    }
    setStats({ healed, escalated, pending: 0 });
    setHealing(false);
    loadIssues();
  };

  const canAutoRepair = (cat) => REPAIR_PLAYBOOK[cat]?.canAutoRepair ?? true;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const openIssues = issues.filter(i => !repairStatus[i.id] || repairStatus[i.id] === "failed");
  const autoFixable = openIssues.filter(i => canAutoRepair(i.category));
  const needsFounder = openIssues.filter(i => !canAutoRepair(i.category));

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Self-Healing System</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-500" />Self-Healing Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Diagnose → Repair → Verify → Escalate. Autonomous issue resolution.</p>
        </div>
        <Button onClick={runFullHeal} disabled={healing || openIssues.length === 0} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          {healing ? <><Loader2 className="w-4 h-4 animate-spin" />Healing Platform...</> : <><Zap className="w-4 h-4" />Run Full Auto-Heal ({autoFixable.length} fixable)</>}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Open Issues", value: openIssues.length, color: openIssues.length > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50", icon: AlertTriangle },
          { label: "Auto-Fixable", value: autoFixable.length, color: "text-emerald-600 bg-emerald-50", icon: Zap },
          { label: "Needs Founder", value: needsFounder.length, color: "text-amber-600 bg-amber-50", icon: Shield },
          { label: "Healed This Session", value: Object.values(repairStatus).filter(s => s === "healed").length, color: "text-blue-600 bg-blue-50", icon: CheckCircle },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-3.5 h-3.5" /></div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className="text-2xl font-bold pl-9">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Heal Log */}
      {healLog.length > 0 && (
        <Card className="p-4 border border-border/60 mb-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Healing Activity Log</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {healLog.map((l, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs ${l.type === "healed" ? "text-emerald-700" : l.type === "escalated" ? "text-amber-700" : "text-red-700"}`}>
                {l.type === "healed" ? <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> : l.type === "escalated" ? <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" /> : <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                {l.message}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Auto-fixable */}
      {autoFixable.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 flex items-center gap-2"><Zap className="w-3.5 h-3.5" />Autonomous Repair Available</p>
          <div className="space-y-2">
            {autoFixable.map(issue => (
              <Card key={issue.id} className="p-4 border border-emerald-200 bg-emerald-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{issue.title}</p>
                    {issue.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{issue.description}</p>}
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-[9px]">{issue.category?.replace(/_/g," ")}</Badge>
                      <Badge variant="outline" className={`text-[9px] ${issue.severity === "critical" ? "text-red-600 border-red-300" : issue.severity === "high" ? "text-orange-600 border-orange-300" : "text-amber-600 border-amber-300"}`}>{issue.severity}</Badge>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {repairStatus[issue.id] === "healed" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-[10px]"><CheckCircle className="w-3 h-3 mr-1" />Healed</Badge>
                    ) : repairStatus[issue.id] === "repairing" ? (
                      <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-[10px]"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Repairing</Badge>
                    ) : (
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => repairSingle(issue)} disabled={healing}>
                        <Play className="w-3 h-3 mr-1" />Auto-Repair
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Needs Founder */}
      {needsFounder.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-3 flex items-center gap-2"><Shield className="w-3.5 h-3.5" />Requires Founder Decision</p>
          <div className="space-y-2">
            {needsFounder.map(issue => {
              const playbook = REPAIR_PLAYBOOK[issue.category];
              return (
                <Card key={issue.id} className="p-4 border border-amber-200 bg-amber-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{issue.title}</p>
                      <p className="text-xs text-amber-800 mt-1">🔒 {playbook?.reason || "Requires human decision"}</p>
                      {playbook?.founderAction && <p className="text-xs text-muted-foreground mt-0.5">Action: {playbook.founderAction}</p>}
                    </div>
                    <div className="flex-shrink-0">
                      {repairStatus[issue.id] === "escalated" ? (
                        <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-[10px]"><ArrowRight className="w-3 h-3 mr-1" />Escalated</Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => repairSingle(issue)} disabled={healing}>
                          <ArrowRight className="w-3 h-3 mr-1" />Escalate
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {openIssues.length === 0 && healLog.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="text-sm font-medium">No open issues to heal</p>
          <p className="text-xs text-muted-foreground mt-1">Run Self-Diagnosis from Self-Governance to detect new issues.</p>
        </div>
      )}
    </div>
  );
}