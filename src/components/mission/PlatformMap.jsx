import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Network, GitBranch, CheckCircle, AlertTriangle, Lock } from "lucide-react";

const RAILS = [
  { name: "Executive Command", path: "/", status: "active", deps: ["All Rails"] },
  { name: "AI Workforce", path: "/executive-workforce", status: "active", deps: ["AgentProfile", "AgentTask"] },
  { name: "Build Studio", path: "/build-studio", status: "active", deps: ["BuildRegistry", "Task"] },
  { name: "JurisEngine", path: "/jurisengine", status: "partial", deps: ["CanonEntry", "CanonCoverage"] },
  { name: "Canon", path: "/canon", status: "partial", deps: ["CanonEntry", "CanonReviewQueue"] },
  { name: "Evidence Vault", path: "/evidence", status: "active", deps: ["Evidence", "CaseFile"] },
  { name: "Decision Compass", path: "/decision-compass", status: "active", deps: ["CanonEntry", "DecisionRecord"] },
  { name: "Revenue OS", path: "/crm-revenue", status: "partial", deps: ["Subscription", "Invoice"] },
  { name: "Enterprise CRM", path: "/crm", status: "active", deps: ["CRMLead", "CRMOpportunity"] },
  { name: "Resource Compass", path: "/resource-compass", status: "active", deps: ["Resource", "ResourceCase"] },
  { name: "Workforce Rail", path: "/workforce", status: "active", deps: ["WorkerProfile", "GigOpportunity"] },
  { name: "Authority Compass", path: "/authority/compass", status: "active", deps: ["AuthorityInteraction"] },
  { name: "Culture Rail", path: "/culture-rail", status: "active", deps: ["CultureRailData"] },
  { name: "Self-Governance", path: "/self-governance", status: "active", deps: ["ApprovalGate", "DiagnosticIssue"] },
  { name: "Knowledge Graph", path: "/knowledge", status: "partial", deps: ["KnowledgeNode", "All Entities"] },
];

const STATUS_META = {
  active: { color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  partial: { color: "bg-amber-100 text-amber-700", dot: "bg-amber-500", label: "Partial" },
  blocked: { color: "bg-red-100 text-red-700", dot: "bg-red-500", label: "Blocked" },
  planned: { color: "bg-slate-100 text-slate-600", dot: "bg-slate-400", label: "Planned" },
};

export default function PlatformMap({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Platform Map */}
      <Card className="p-5">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Network className="w-4 h-4 text-violet-500" />Platform Map</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {RAILS.map(rail => {
            const meta = STATUS_META[rail.status] || STATUS_META.planned;
            return (
              <div key={rail.name} className="p-2.5 rounded-lg border border-border/60 hover:border-violet-400 transition-all">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                  <span className="text-xs font-semibold truncate">{rail.name}</span>
                </div>
                <Badge className={`text-[9px] ${meta.color}`}>{meta.label}</Badge>
                <p className="text-[9px] text-muted-foreground mt-1">{rail.deps.length} deps</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Dependency Graph */}
      <Card className="p-5">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><GitBranch className="w-4 h-4 text-blue-500" />Dependency Graph</h3>
        <div className="space-y-1.5">
          {RAILS.filter(r => r.deps.length > 0).map(rail => (
            <div key={rail.name} className="flex items-center gap-2 text-xs">
              <div className="w-32 shrink-0 font-medium text-right truncate">{rail.name}</div>
              <div className="text-muted-foreground">→</div>
              <div className="flex flex-wrap gap-1">
                {rail.deps.map(dep => (
                  <Badge key={dep} variant="outline" className="text-[9px]">{dep}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border/40 flex gap-4 text-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Active</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Partial</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Blocked</span>
        </div>
      </Card>
    </div>
  );
}