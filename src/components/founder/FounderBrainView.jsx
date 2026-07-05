import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Target, Briefcase, Package, Wrench, Scale, Users, ShieldCheck, AlertTriangle, ListOrdered, MessageSquare, History, GraduationCap, Trophy, Brain } from "lucide-react";

const DIMENSIONS = [
  { key: "vision", label: "Vision", icon: Eye, type: "text" },
  { key: "mission", label: "Mission", icon: Target, type: "text" },
  { key: "business_philosophy", label: "Business Philosophy", icon: Briefcase, type: "text" },
  { key: "product_philosophy", label: "Product Philosophy", icon: Package, type: "text" },
  { key: "engineering_philosophy", label: "Engineering Philosophy", icon: Wrench, type: "text" },
  { key: "legal_philosophy", label: "Legal Philosophy", icon: Scale, type: "text" },
  { key: "leadership_style", label: "Leadership Style", icon: Users, type: "text" },
  { key: "communication_style", label: "Communication Style", icon: MessageSquare, type: "text" },
  { key: "approval_preferences", label: "Approval Preferences", icon: ShieldCheck, type: "object" },
  { key: "risk_tolerance", label: "Risk Tolerance", icon: AlertTriangle, type: "object" },
  { key: "priorities", label: "Priorities", icon: ListOrdered, type: "array" },
  { key: "strategic_goals", label: "Strategic Goals", icon: Trophy, type: "array" },
  { key: "decision_history", label: "Decision History", icon: History, type: "array" },
  { key: "lessons_learned", label: "Lessons Learned", icon: GraduationCap, type: "array" },
];

function renderObject(obj) {
  if (!obj || Object.keys(obj).length === 0) return <span className="text-muted-foreground italic text-xs">Not specified</span>;
  return (
    <div className="space-y-1.5">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex gap-2 text-xs">
          <span className="font-semibold text-muted-foreground min-w-[180px] capitalize">{k.replace(/_/g, " ")}:</span>
          <span className="flex-1">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
        </div>
      ))}
    </div>
  );
}

function renderArray(arr) {
  if (!arr || arr.length === 0) return <span className="text-muted-foreground italic text-xs">None recorded</span>;
  return (
    <div className="space-y-1.5">
      {arr.map((item, i) => (
        <div key={i} className="p-2 rounded-lg bg-muted/30 border border-border/40">
          {typeof item === "object" ? (
            <div className="space-y-0.5">
              {Object.entries(item).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground min-w-[100px] capitalize">{k.replace(/_/g, " ")}:</span>
                  <span className="flex-1">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                </div>
              ))}
            </div>
          ) : <span className="text-sm">{String(item)}</span>}
        </div>
      ))}
    </div>
  );
}

export default function FounderBrainView({ brain }) {
  if (!brain) return null;

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm font-bold">Founder Brain v{brain.version}</p>
            <p className="text-xs text-muted-foreground">The authoritative source for founder decision-making philosophy. All AI employees must reference this before making recommendations.</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DIMENSIONS.map(dim => {
          const value = brain[dim.key];
          const isEmpty = !value || (Array.isArray(value) && value.length === 0) || (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) || (typeof value === "string" && value.trim() === "");
          return (
            <Card key={dim.key} className={`p-4 border ${isEmpty ? "border-dashed border-border/40" : "border-border/60"}`}>
              <div className="flex items-center gap-2 mb-2">
                <dim.icon className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">{dim.label}</p>
                {isEmpty && <Badge variant="outline" className="text-[9px] text-muted-foreground">Not set</Badge>}
              </div>
              {isEmpty ? (
                <span className="text-xs text-muted-foreground italic">Awaiting founder input</span>
              ) : dim.type === "text" ? (
                <p className="text-sm whitespace-pre-wrap">{value}</p>
              ) : dim.type === "object" ? (
                renderObject(value)
              ) : (
                renderArray(value)
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}