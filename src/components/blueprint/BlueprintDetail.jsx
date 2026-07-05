import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Shield, GitBranch, Network, Server, Database, Code, Workflow, DollarSign, Map, Rocket, Mail, Lock, TrendingUp, Briefcase, Bot, Layers, FileText, GitCompare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import moment from "moment";

const COMPONENTS = [
  { key: "business_architecture", label: "Business Architecture", icon: Building2 },
  { key: "organization_chart", label: "Organization Chart", icon: Users },
  { key: "departments", label: "Departments", icon: Briefcase },
  { key: "roles", label: "Roles", icon: Users },
  { key: "policies", label: "Policies", icon: FileText },
  { key: "permissions", label: "Permissions", icon: Lock },
  { key: "workflows", label: "Workflows", icon: Workflow },
  { key: "business_rules", label: "Business Rules", icon: Shield },
  { key: "revenue_flows", label: "Revenue Flows", icon: DollarSign },
  { key: "customer_journeys", label: "Customer Journeys", icon: Map },
  { key: "employee_journeys", label: "Employee Journeys", icon: TrendingUp },
  { key: "ai_employee_journeys", label: "AI Employee Journeys", icon: Bot },
  { key: "infrastructure_map", label: "Infrastructure Map", icon: Server },
  { key: "security_architecture", label: "Security Architecture", icon: Shield },
  { key: "database_blueprint", label: "Database Blueprint", icon: Database },
  { key: "api_blueprint", label: "API Blueprint", icon: Code },
  { key: "entity_relationship_diagram", label: "Entity Relationships", icon: GitBranch },
  { key: "communication_map", label: "Communication Map", icon: Mail },
  { key: "deployment_plan", label: "Deployment Plan", icon: Rocket },
  { key: "growth_roadmap", label: "Growth Roadmap", icon: TrendingUp },
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

export default function BlueprintDetail({ blueprint, allVersions, onBack, onCompare }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">← Back to Blueprints</Button>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />{blueprint.name}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px]">v{blueprint.version}</Badge>
            <Badge variant="outline" className="text-[10px]">{blueprint.industry}</Badge>
            <Badge variant="outline" className="text-[10px]">{blueprint.company_type}</Badge>
            {blueprint.is_template && <Badge className="text-[10px] bg-violet-100 text-violet-700">Template</Badge>}
            {blueprint.is_published && <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Published</Badge>}
            {blueprint.parent_blueprint_name && <Badge className="text-[10px] bg-blue-100 text-blue-700">Inherited from {blueprint.parent_blueprint_name}</Badge>}
            <span className="text-[10px] text-muted-foreground">Generated {moment(blueprint.created_date).format("MMM D, YYYY")}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onCompare}><GitCompare className="w-4 h-4 mr-1" />Compare</Button>
      </div>

      {blueprint.executive_summary && (
        <Card className="p-4 border border-primary/20 bg-primary/5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Executive Summary</p>
          <p className="text-sm">{blueprint.executive_summary}</p>
        </Card>
      )}

      {(blueprint.inheritance_notes || blueprint.customization_summary || blueprint.cost_savings_from_inheritance) && (
        <Card className="p-4 border border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Inheritance Details</p>
          <div className="space-y-2">
            {blueprint.inheritance_notes && <p className="text-xs"><strong>Inherited:</strong> {blueprint.inheritance_notes}</p>}
            {blueprint.customization_summary && <p className="text-xs"><strong>Customized:</strong> {blueprint.customization_summary}</p>}
            {blueprint.cost_savings_from_inheritance && <p className="text-xs text-emerald-600"><strong>Cost Savings:</strong> {blueprint.cost_savings_from_inheritance}</p>}
          </div>
        </Card>
      )}

      {allVersions && allVersions.length > 1 && (
        <Card className="p-3 border border-border/60">
          <p className="text-xs font-semibold mb-2">Version History ({allVersions.length} versions)</p>
          <div className="flex flex-wrap gap-2">
            {allVersions.map(v => (
              <Badge key={v.id} variant={v.id === blueprint.id ? "default" : "outline"} className="text-[10px] cursor-pointer" onClick={() => onBack()}>
                v{v.version} · {moment(v.created_date).format("MMM D")}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Tabs defaultValue={COMPONENTS[0].key}>
        <TabsList className="flex-wrap h-auto">
          {COMPONENTS.map(c => (
            <TabsTrigger key={c.key} value={c.key} className="text-[10px]">
              <c.icon className="w-3 h-3 mr-1" />{c.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {COMPONENTS.map(c => (
          <TabsContent key={c.key} value={c.key} className="mt-4">
            <Card className="p-4 border border-border/60">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2"><c.icon className="w-4 h-4 text-primary" />{c.label}</p>
              {renderValue(blueprint[c.key])}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}