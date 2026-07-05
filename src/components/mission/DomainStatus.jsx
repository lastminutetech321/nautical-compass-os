import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Bot, Users, Building2, BookOpen, FlaskConical, Hammer, Briefcase, Shield } from "lucide-react";

function StatusPanel({ icon: Icon, title, status, statusColor, metrics, deepLink, linkLabel }) {
  return (
    <Card className="p-4 border border-border/60">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-bold uppercase tracking-wide">{title}</p>
        </div>
        <Badge className={`text-[9px] ${statusColor}`}>{status}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {metrics.map((m, i) => (
          <div key={i} className="p-2 rounded bg-muted/40">
            <p className="text-lg font-bold">{m.value}</p>
            <p className="text-[10px] text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>
      {deepLink && (
        <a href={deepLink} className="text-[10px] text-blue-500 hover:underline">{linkLabel || "Open →"}</a>
      )}
    </Card>
  );
}

export default function DomainStatus({ data }) {
  if (!data) return null;
  const { subs, invoices, survival, agents, crmLeads, crmOpps, enterpriseOrgs, canon, evidence, decisions, workers, gigs, safety, authorityInteractions, resources, resourceCases } = data;

  const mrr = subs.reduce((s, sub) => s + (sub.mrr || 0), 0);
  const outstanding = invoices.reduce((s, inv) => s + (inv.amount_due || 0), 0);
  const verifiedCanon = canon.filter(e => e.verified && e.status === "active").length;
  const canonGaps = canon.filter(e => e.is_canon_gap).length;
  const activeAgents = agents.filter(a => a.status === "active").length;
  const csuiteCount = agents.filter(a => a.agent_type === "c_suite").length;
  const openOpps = crmOpps.filter(o => o.status === "open" || o.status === "active").length;
  const evidenceVerified = evidence.filter(e => e.integrity_hash).length;
  const openSafety = safety.filter(s => s.status === "open").length;
  const openAuthority = authorityInteractions.filter(a => a.status === "intake" || a.status === "under_review").length;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-500" />Domain Status</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatusPanel
          icon={DollarSign} title="Revenue Health"
          status={mrr > 0 ? "Active" : "Zero MRR"}
          statusColor={mrr > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}
          metrics={[
            { label: "MRR", value: `$${mrr.toLocaleString()}` },
            { label: "Outstanding", value: `$${outstanding.toLocaleString()}` },
            { label: "Active Subs", value: subs.length },
            { label: "Runway", value: survival?.cash_runway_months ? `${survival.cash_runway_months}mo` : "—" },
          ]}
          deepLink="/crm-revenue" linkLabel="Revenue OS →"
        />
        <StatusPanel
          icon={Bot} title="AI Workforce"
          status={`${activeAgents} active`}
          statusColor="bg-violet-100 text-violet-700"
          metrics={[
            { label: "Total Agents", value: agents.length },
            { label: "C-Suite", value: csuiteCount },
            { label: "Active", value: activeAgents },
            { label: "Tasks Done", value: agents.reduce((s, a) => s + (a.tasks_completed || 0), 0) },
          ]}
          deepLink="/executive-workforce" linkLabel="Executive Workforce →"
        />
        <StatusPanel
          icon={Users} title="Customer Status"
          status={`${openOpps} open opps`}
          statusColor="bg-teal-100 text-teal-700"
          metrics={[
            { label: "CRM Leads", value: crmLeads.length },
            { label: "Open Opps", value: openOpps },
            { label: "Enterprise Orgs", value: enterpriseOrgs.length },
            { label: "Pipeline", value: `$${crmOpps.reduce((s, o) => s + (o.value || o.estimated_value || 0), 0).toLocaleString()}` },
          ]}
          deepLink="/crm" linkLabel="Enterprise CRM →"
        />
        <StatusPanel
          icon={Building2} title="Enterprise Status"
          status={enterpriseOrgs.length > 0 ? "Active" : "No orgs"}
          statusColor={enterpriseOrgs.length > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}
          metrics={[
            { label: "Organizations", value: enterpriseOrgs.length },
            { label: "Active Contracts", value: enterpriseOrgs.filter(o => o.status === "active").length },
            { label: "Total Seats", value: enterpriseOrgs.reduce((s, o) => s + (o.seats || 0), 0) },
            { label: "Onboarding", value: enterpriseOrgs.filter(o => o.status === "onboarding").length },
          ]}
          deepLink="/enterprise" linkLabel="Enterprise Panel →"
        />
        <StatusPanel
          icon={BookOpen} title="Canon Status"
          status={verifiedCanon >= 5 ? "Active" : verifiedCanon > 0 ? "Partial" : "Blocked"}
          statusColor={verifiedCanon >= 5 ? "bg-emerald-100 text-emerald-700" : verifiedCanon > 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}
          metrics={[
            { label: "Total Entries", value: canon.length },
            { label: "Verified", value: verifiedCanon },
            { label: "Pending Review", value: canon.filter(e => e.status === "pending_review").length },
            { label: "Canon Gaps", value: canonGaps },
          ]}
          deepLink="/canon-dashboard" linkLabel="Canon Dashboard →"
        />
        <StatusPanel
          icon={FlaskConical} title="Evidence Status"
          status={evidence.length > 0 ? "Active" : "Empty"}
          statusColor={evidence.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}
          metrics={[
            { label: "Evidence Items", value: evidence.length },
            { label: "Integrity Verified", value: evidenceVerified },
            { label: "Active Cases", value: [...new Set(evidence.map(e => e.case_name).filter(Boolean))].length },
            { label: "Decisions Tracked", value: decisions.length },
          ]}
          deepLink="/evidence" linkLabel="Evidence Vault →"
        />
        <StatusPanel
          icon={Briefcase} title="Workforce Status"
          status={`${workers.length} workers`}
          statusColor="bg-orange-100 text-orange-700"
          metrics={[
            { label: "Worker Profiles", value: workers.length },
            { label: "Open Gigs", value: gigs.length },
            { label: "Open Safety", value: openSafety },
            { label: "Invoices", value: data.wfInvoices?.length || 0 },
          ]}
          deepLink="/workforce" linkLabel="Workforce Hub →"
        />
        <StatusPanel
          icon={Shield} title="Authority Compass"
          status={openAuthority > 0 ? "Active Cases" : "No Open"}
          statusColor={openAuthority > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}
          metrics={[
            { label: "Interactions", value: authorityInteractions.length },
            { label: "Under Review", value: openAuthority },
            { label: "Resources", value: resources.length },
            { label: "Resource Cases", value: resourceCases.length },
          ]}
          deepLink="/authority/compass" linkLabel="Authority Compass →"
        />
        <StatusPanel
          icon={Hammer} title="Build Studio"
          status={data.builds?.filter(b => b.is_blocked).length > 0 ? "Has Blockers" : "On Track"}
          statusColor={data.builds?.filter(b => b.is_blocked).length > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}
          metrics={[
            { label: "Total Builds", value: data.builds?.length || 0 },
            { label: "In Progress", value: data.builds?.filter(b => b.status === "in_progress").length || 0 },
            { label: "Blocked", value: data.builds?.filter(b => b.is_blocked).length || 0 },
            { label: "Completed", value: data.builds?.filter(b => b.status === "completed").length || 0 },
          ]}
          deepLink="/build-registry" linkLabel="Build Registry →"
        />
      </div>
    </div>
  );
}