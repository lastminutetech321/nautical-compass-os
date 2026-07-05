import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, FileText, Scale, Eye, Bell, ChevronRight } from "lucide-react";

const AUTHORITY_TYPES = [
  { key: "police", label: "Police", icon: "🚔", color: "text-blue-500" },
  { key: "court", label: "Courts", icon: "⚖️", color: "text-amber-500" },
  { key: "employer", label: "Employers", icon: "🏢", color: "text-slate-500" },
  { key: "landlord", label: "Landlords", icon: "🏠", color: "text-orange-500" },
  { key: "government", label: "Government", icon: "🏛", color: "text-indigo-500" },
  { key: "school", label: "Schools", icon: "🎓", color: "text-green-500" },
  { key: "hoa", label: "HOA", icon: "🏘", color: "text-teal-500" },
  { key: "security", label: "Security", icon: "🛡", color: "text-red-500" },
  { key: "hospital", label: "Hospitals", icon: "🏥", color: "text-pink-500" },
  { key: "licensing_board", label: "Licensing Boards", icon: "📋", color: "text-purple-500" },
  { key: "corporation", label: "Corporations", icon: "🏗", color: "text-cyan-500" },
  { key: "other", label: "Other", icon: "❓", color: "text-gray-500" },
];

const MODULES = [
  { label: "Authority Intake", path: "/authority/intake", icon: "📥", desc: "Log a new authority interaction" },
  { label: "Authority Timeline", path: "/authority/timeline", icon: "📅", desc: "Chronological interaction history" },
  { label: "Authority Validation", path: "/authority/validation", icon: "✅", desc: "Verify jurisdiction, capacity, standing" },
  { label: "Evidence Checklist", path: "/authority/evidence", icon: "🗂", desc: "Evidence tied to interactions" },
  { label: "Document Requests", path: "/authority/documents", icon: "📄", desc: "Public records & doc requests" },
  { label: "FOIA Requests", path: "/authority/foia", icon: "🔍", desc: "Federal & state FOIA filings" },
  { label: "Complaint Builder", path: "/authority/complaints", icon: "📝", desc: "Draft & track formal complaints" },
  { label: "Appeal Tracker", path: "/authority/appeals", icon: "📊", desc: "Administrative & judicial appeals" },
  { label: "Escalation Planner", path: "/authority/escalation", icon: "🔺", desc: "Escalate to regulators, media, courts" },
  { label: "Public Accountability", path: "/authority/accountability", icon: "👁", desc: "Track patterns of authority misconduct" },
  { label: "Executive Dashboard", path: "/authority/dashboard", icon: "🎯", desc: "Full system overview & analytics" },
];

export default function AuthorityCompass() {
  const [interactions, setInteractions] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.AuthorityInteraction.list("-created_date", 100),
      base44.entities.AuthorityComplaint.list("-created_date", 100),
      base44.entities.AuthorityAppeal.list("-created_date", 50),
    ]).then(([i, c, a]) => {
      setInteractions(i);
      setComplaints(c);
      setAppeals(a);
    }).finally(() => setLoading(false));
  }, []);

  const activeInteractions = interactions.filter(i => ["intake","under_review","escalated"].includes(i.status));
  const criticalInteractions = interactions.filter(i => i.severity === "critical");
  const openComplaints = complaints.filter(c => ["filed","pending","acknowledged","under_investigation"].includes(c.status));
  const pendingAppeals = appeals.filter(a => ["planned","filed","pending","hearing_scheduled"].includes(a.status));

  const byType = AUTHORITY_TYPES.map(t => ({
    ...t,
    count: interactions.filter(i => i.authority_type === t.key).length
  })).filter(t => t.count > 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Authority Compass</h1>
            <p className="text-sm text-muted-foreground">Evaluate every interaction involving claimed authority</p>
          </div>
        </div>
        <Link to="/authority/intake">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            + Log Interaction
          </Button>
        </Link>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Interactions", value: activeInteractions.length, icon: Clock, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Critical", value: criticalInteractions.length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Open Complaints", value: openComplaints.length, icon: FileText, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Pending Appeals", value: pendingAppeals.length, icon: Scale, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
        ].map(m => (
          <Card key={m.label} className={`p-4 ${m.bg} border-0`}>
            <div className="flex items-center gap-3">
              <m.icon className={`w-5 h-5 ${m.color}`} />
              <div>
                <p className={`text-2xl font-black ${m.color}`}>{loading ? "—" : m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Authority Type Breakdown */}
      {byType.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Eye className="w-4 h-4 text-indigo-500" /> Interactions by Authority Type</h2>
          <div className="flex flex-wrap gap-2">
            {byType.map(t => (
              <Link key={t.key} to={`/authority/timeline?type=${t.key}`}>
                <Badge variant="outline" className="px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">
                  {t.icon} {t.label} <span className="ml-1.5 font-bold">{t.count}</span>
                </Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Modules Grid */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-widest">Compass Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map(m => (
            <Link key={m.path} to={m.path}>
              <Card className="p-4 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <p className="font-semibold text-sm group-hover:text-indigo-600 transition-colors">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Interactions */}
      {interactions.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Recent Interactions</h2>
            <Link to="/authority/timeline"><Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">View All →</Badge></Link>
          </div>
          <div className="space-y-2">
            {interactions.slice(0, 5).map(i => {
              const t = AUTHORITY_TYPES.find(t => t.key === i.authority_type);
              const severityColor = { low: "text-emerald-600", moderate: "text-amber-600", high: "text-orange-600", critical: "text-red-600" }[i.severity] || "text-muted-foreground";
              return (
                <Link key={i.id} to={`/authority/validation?id=${i.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{t?.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{i.title}</p>
                        <p className="text-xs text-muted-foreground">{t?.label} {i.authority_name ? `· ${i.authority_name}` : ""} {i.date_of_interaction ? `· ${i.date_of_interaction}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${severityColor}`}>{i.severity}</span>
                      <Badge variant="outline" className="text-[10px]">{i.status}</Badge>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {interactions.length === 0 && !loading && (
        <Card className="p-12 text-center border-dashed">
          <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg font-semibold text-muted-foreground">No interactions logged yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Start by logging an authority interaction to begin evaluating claimed authority.</p>
          <Link to="/authority/intake"><Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Log First Interaction</Button></Link>
        </Card>
      )}
    </div>
  );
}