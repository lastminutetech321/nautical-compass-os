import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Shield, Bot, FolderKanban, Map, Database, Code, CreditCard, LayoutDashboard, Radio, Command, Network, Wrench, Hammer, GitCompare, CheckCircle2, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

const OUTPUTS = [
  { key: "organizations", label: "Organizations", icon: Building2 },
  { key: "users", label: "Users", icon: Users },
  { key: "permissions", label: "Permissions", icon: Shield },
  { key: "ai_workforce", label: "AI Workforce", icon: Bot },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "roadmap", label: "Roadmap", icon: Map },
  { key: "entities", label: "Entities", icon: Database },
  { key: "apis", label: "APIs", icon: Code },
  { key: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { key: "dashboards", label: "Dashboards", icon: LayoutDashboard },
  { key: "mission_control_config", label: "Mission Control", icon: Radio },
  { key: "executive_command_config", label: "Executive Command", icon: Command },
  { key: "knowledge_graph_config", label: "Knowledge Graph", icon: Network },
  { key: "engineering_plan", label: "Engineering Plan", icon: Wrench },
  { key: "development_plan", label: "Development Plan", icon: Hammer },
];

function renderValue(val, depth = 0) {
  if (val === null || val === undefined) return <span className="text-muted-foreground italic text-xs">Not specified</span>;
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return <span className="text-sm">{String(val)}</span>;
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-muted-foreground italic text-xs">None</span>;
    return (
      <div className="space-y-1.5">
        {val.map((item, i) => (
          <div key={i} className="p-2 rounded-lg bg-muted/30 border border-border/40">
            {typeof item === "object" ? (
              <div className="space-y-1">
                {Object.entries(item).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <span className="font-semibold text-muted-foreground min-w-[120px] capitalize">{k.replace(/_/g, " ")}:</span>
                    <span className="flex-1">{renderValue(v, depth + 1)}</span>
                  </div>
                ))}
              </div>
            ) : <span className="text-sm">{String(item)}</span>}
          </div>
        ))}
      </div>
    );
  }
  if (typeof val === "object") {
    return (
      <div className="space-y-1.5">
        {Object.entries(val).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="font-semibold text-muted-foreground min-w-[140px] capitalize">{k.replace(/_/g, " ")}:</span>
            <span className="flex-1">{renderValue(v, depth + 1)}</span>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-sm">{String(val)}</span>;
}

export default function CloneDetail({ clone, onBack, onCompare }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">← Back to Clones</Button>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />{clone.clone_name}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px]">From: {clone.source_blueprint_name} v{clone.source_blueprint_version}</Badge>
            <Badge variant="outline" className="text-[10px]">{clone.industry}</Badge>
            <Badge variant="outline" className="text-[10px] capitalize">{clone.company_size}</Badge>
            <Badge className="text-[10px] bg-emerald-100 text-emerald-700 capitalize">{clone.status}</Badge>
            <span className="text-[10px] text-muted-foreground">Cloned {moment(clone.created_date).format("MMM D, YYYY")}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onCompare}><GitCompare className="w-4 h-4 mr-1" />Compare to Parent</Button>
      </div>

      {clone.executive_summary && (
        <Card className="p-4 border border-primary/20 bg-primary/5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Executive Summary</p>
          <p className="text-sm">{clone.executive_summary}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {clone.inherited_components?.length > 0 && (
          <Card className="p-3 border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Inherited ({clone.inherited_components.length})</p>
            <ul className="space-y-0.5">{clone.inherited_components.map((c, i) => <li key={i} className="text-[10px] text-emerald-700">✓ {c}</li>)}</ul>
          </Card>
        )}
        {clone.customized_components?.length > 0 && (
          <Card className="p-3 border border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1"><Wrench className="w-3.5 h-3.5" />Customized ({clone.customized_components.length})</p>
            <ul className="space-y-0.5">{clone.customized_components.map((c, i) => <li key={i} className="text-[10px] text-blue-700">⚡ {c}</li>)}</ul>
          </Card>
        )}
        {clone.cost_savings_estimate && (
          <Card className="p-3 border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Cost Savings</p>
            <p className="text-xs text-amber-700">{clone.cost_savings_estimate}</p>
          </Card>
        )}
      </div>

      {clone.goals?.length > 0 && (
        <Card className="p-3 border border-border/60">
          <p className="text-xs font-semibold mb-2">Clone Goals</p>
          <div className="flex flex-wrap gap-1.5">{clone.goals.map((g, i) => <Badge key={i} variant="outline" className="text-[10px]">{g}</Badge>)}</div>
        </Card>
      )}

      {clone.required_modules?.length > 0 && (
        <Card className="p-3 border border-border/60">
          <p className="text-xs font-semibold mb-2">Required Modules</p>
          <div className="flex flex-wrap gap-1.5">{clone.required_modules.map((m, i) => <Badge key={i} variant="outline" className="text-[10px] bg-violet-50 text-violet-700">{m}</Badge>)}</div>
        </Card>
      )}

      <Tabs defaultValue={OUTPUTS[0].key}>
        <TabsList className="flex-wrap h-auto">
          {OUTPUTS.map(o => (
            <TabsTrigger key={o.key} value={o.key} className="text-[10px]">
              <o.icon className="w-3 h-3 mr-1" />{o.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {OUTPUTS.map(o => (
          <TabsContent key={o.key} value={o.key} className="mt-4">
            <Card className="p-4 border border-border/60">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2"><o.icon className="w-4 h-4 text-primary" />{o.label}</p>
              {renderValue(clone[o.key])}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}