import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, FileText, Scale, Eye, Search, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const TYPE_ICONS = { police:"🚔",court:"⚖️",employer:"🏢",landlord:"🏠",government:"🏛",school:"🎓",hoa:"🏘",security:"🛡",hospital:"🏥",licensing_board:"📋",corporation:"🏗",other:"❓" };
const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6","#f97316","#84cc16","#06b6d4","#64748b"];

export default function AuthorityDashboard() {
  const [data, setData] = useState({ interactions:[], complaints:[], appeals:[], docs:[], accountability:[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.AuthorityInteraction.list("-created_date", 500),
      base44.entities.AuthorityComplaint.list("-created_date", 200),
      base44.entities.AuthorityAppeal.list("-created_date", 200),
      base44.entities.AuthorityDocRequest.list("-created_date", 200),
      base44.entities.PublicAccountabilityRecord.list("-created_date", 200),
    ]).then(([interactions, complaints, appeals, docs, accountability]) => {
      setData({ interactions, complaints, appeals, docs, accountability });
    }).finally(() => setLoading(false));
  }, []);

  const { interactions, complaints, appeals, docs, accountability } = data;
  const today = new Date().toISOString().slice(0,10);

  // Metrics
  const active = interactions.filter(i => ["intake","under_review","escalated"].includes(i.status)).length;
  const critical = interactions.filter(i => i.severity === "critical").length;
  const openComplaints = complaints.filter(c => ["filed","pending","acknowledged","under_investigation"].includes(c.status)).length;
  const pendingAppeals = appeals.filter(a => ["planned","filed","pending","hearing_scheduled"].includes(a.status)).length;
  const overdueDeadlines = [...docs, ...appeals].filter(r => r.deadline && r.deadline < today && !["fulfilled","decided","won","lost","withdrawn"].includes(r.status)).length;
  const validated = interactions.filter(i => i.status === "validated").length;
  const invalid = interactions.filter(i => i.status === "invalid").length;

  // By type chart
  const byType = Object.entries(
    interactions.reduce((acc, i) => { acc[i.authority_type] = (acc[i.authority_type]||0)+1; return acc; }, {})
  ).map(([name, count]) => ({ name: name.replace(/_/g," "), count })).sort((a,b) => b.count-a.count);

  // By severity pie
  const bySeverity = ["low","moderate","high","critical"].map(s => ({ name: s, value: interactions.filter(i => i.severity===s).length })).filter(s => s.value > 0);
  const sevColors = { low:"#10b981", moderate:"#f59e0b", high:"#f97316", critical:"#ef4444" };

  // Monthly trend
  const monthly = {};
  interactions.forEach(i => { const m = i.date_of_interaction?.slice(0,7)||"Unknown"; monthly[m]=(monthly[m]||0)+1; });
  const monthlyData = Object.entries(monthly).sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([month,count]) => ({ month: month.slice(5), count }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-xl font-bold">Authority Compass — Executive Dashboard</h1><p className="text-xs text-muted-foreground">Full system overview · {interactions.length} total interactions</p></div>
        </div>
        <Link to="/authority/intake"><Button className="bg-indigo-600 hover:bg-indigo-700 text-white">+ Log Interaction</Button></Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Total", value: interactions.length, color: "text-slate-700", icon: Shield },
          { label: "Active", value: active, color: "text-blue-600", icon: Clock },
          { label: "Critical", value: critical, color: "text-red-600", icon: AlertTriangle },
          { label: "Validated", value: validated, color: "text-emerald-600", icon: CheckCircle },
          { label: "Invalid", value: invalid, color: "text-orange-600", icon: AlertTriangle },
          { label: "Open Complaints", value: openComplaints, color: "text-amber-600", icon: FileText },
          { label: "Overdue Deadlines", value: overdueDeadlines, color: overdueDeadlines > 0 ? "text-red-600" : "text-emerald-600", icon: Clock },
        ].map(m => (
          <Card key={m.label} className="p-3 text-center">
            <m.icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
            <p className={`text-xl font-black ${m.color}`}>{loading ? "—" : m.value}</p>
            <p className="text-[9px] text-muted-foreground">{m.label}</p>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 md:col-span-2">
            <h3 className="text-sm font-semibold mb-3">Interactions by Authority Type</h3>
            {byType.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No data yet</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byType}><XAxis dataKey="name" tick={{fontSize:10}} /><YAxis tick={{fontSize:10}} /><Tooltip /><Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} /></BarChart>
              </ResponsiveContainer>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">By Severity</h3>
            {bySeverity.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No data yet</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={bySeverity} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({name,value})=>`${name}: ${value}`} labelLine={false} fontSize={10}>{bySeverity.map((e) => <Cell key={e.name} fill={sevColors[e.name]||"#64748b"} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      {/* Quick Action Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Timeline", path:"/authority/timeline", icon:"📅" },
          { label: "Complaints", path:"/authority/complaints", icon:"📝", count: openComplaints },
          { label: "Appeals", path:"/authority/appeals", icon:"📊", count: pendingAppeals },
          { label: "FOIA Requests", path:"/authority/foia", icon:"🔍", count: docs.filter(d=>d.request_type==="foia").length },
          { label: "Accountability", path:"/authority/accountability", icon:"👁", count: accountability.length },
        ].map(m => (
          <Link key={m.path} to={m.path}>
            <Card className="p-3 hover:border-indigo-400 transition-all cursor-pointer text-center">
              <p className="text-2xl">{m.icon}</p>
              <p className="text-xs font-semibold mt-1">{m.label}</p>
              {m.count !== undefined && <p className="text-sm font-bold text-indigo-600">{loading ? "—" : m.count}</p>}
            </Card>
          </Link>
        ))}
      </div>

      {/* Integrations */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Connected Systems</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Evidence Vault", path:"/evidence", icon:"🗃" },
            { label: "JurisEngine", path:"/jurisengine", icon:"⚖️" },
            { label: "NC Canon", path:"/canon", icon:"📚" },
            { label: "Decision Compass", path:"/decision-compass", icon:"🧭" },
            { label: "FOIA Tracker", path:"/foia", icon:"🔍" },
            { label: "Mission Control", path:"/mission-control", icon:"🎯" },
          ].map(l => (
            <Link key={l.path} to={l.path}><Badge variant="outline" className="px-3 py-1.5 text-xs cursor-pointer hover:bg-muted">{l.icon} {l.label}</Badge></Link>
          ))}
        </div>
      </Card>
    </div>
  );
}