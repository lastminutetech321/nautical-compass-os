import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Users, DollarSign, TrendingUp, Target, Handshake, AlertTriangle,
  Activity, ArrowRight, RefreshCw, Building2, FileText, Star, Zap
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import moment from "moment";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const HEALTH_COLORS = { cold: "bg-slate-100 text-slate-600", warm: "bg-amber-100 text-amber-700", hot: "bg-red-100 text-red-700", at_risk: "bg-orange-100 text-orange-700", strong: "bg-emerald-100 text-emerald-700" };
const STAGE_COLORS = { discovery: "#94a3b8", qualification: "#60a5fa", proposal: "#a78bfa", negotiation: "#f59e0b", contract_review: "#f97316", closed_won: "#10b981", closed_lost: "#ef4444" };

function MetricCard({ label, value, sub, color, icon: IconComponent, link }) {
  const Icon = IconComponent;
  const inner = (
    <Card className="p-4 border border-border/60 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        {Icon && <Icon className={`w-4 h-4 ${color || "text-muted-foreground"}`} />}
      </div>
      <p className={`text-2xl font-black ${color || ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Card>
  );
  return link ? <Link to={link}>{inner}</Link> : inner;
}

export default function CRMCommand() {
  const [leads, setLeads] = useState([]);
  const [opps, setOpps] = useState([]);
  const [deals, setDeals] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [l, o, d, c, p, ct, or_, cm] = await Promise.all([
      base44.entities.CRMLead.list("-created_date", 200).catch(() => []),
      base44.entities.CRMOpportunity.list("-created_date", 200).catch(() => []),
      base44.entities.CRMDeal.list("-created_date", 200).catch(() => []),
      base44.entities.CRMContract.list("-created_date", 200).catch(() => []),
      base44.entities.CRMPartner.list("-created_date", 200).catch(() => []),
      base44.entities.Contact.list("-created_date", 200).catch(() => []),
      base44.entities.Organization.list("-created_date", 200).catch(() => []),
      base44.entities.CRMCommunication.list("-created_date", 100).catch(() => []),
    ]);
    setLeads(l); setOpps(o); setDeals(d); setContracts(c); setPartners(p); setContacts(ct); setOrgs(or_); setComms(cm);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Pipeline metrics
  const pipelineValue = opps.filter(o => !["closed_won","closed_lost"].includes(o.stage)).reduce((s, o) => s + (o.value || 0), 0);
  const weightedPipeline = opps.reduce((s, o) => s + ((o.value || 0) * (o.probability || 0) / 100), 0);
  const wonDeals = deals.filter(d => d.status === "signed" || d.status === "active");
  const totalMRR = wonDeals.reduce((s, d) => s + (d.mrr || 0), 0);
  const totalARR = wonDeals.reduce((s, d) => s + (d.arr || 0), 0);
  const atRisk = [...opps, ...deals, ...contacts].filter(r => r.relationship_health === "at_risk").length;
  const expiringContracts = contracts.filter(c => c.end_date && moment(c.end_date).isBefore(moment().add(60, "days")) && c.status === "active");
  const overdueFollowUps = [...leads, ...opps, ...contacts].filter(r => r.next_action_date && moment(r.next_action_date).isBefore(moment())).length;

  // Pipeline by stage
  const stageData = ["discovery","qualification","proposal","negotiation","contract_review"].map(s => ({
    stage: s.replace(/_/g," "),
    count: opps.filter(o => o.stage === s).length,
    value: opps.filter(o => o.stage === s).reduce((sum, o) => sum + (o.value || 0), 0),
  }));

  // Lead sources
  const sourceMap = {};
  leads.forEach(l => { sourceMap[l.source || "other"] = (sourceMap[l.source || "other"] || 0) + 1; });
  const sourceData = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));
  const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];

  // Recent activity
  const recentComms = comms.slice(0, 5);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Enterprise CRM</p>
          <h1 className="text-2xl font-bold tracking-tight">CRM Command Center</h1>
          <p className="text-sm text-muted-foreground">{orgs.length} orgs · {contacts.length} contacts · {opps.length} opportunities · {leads.length} leads</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh</Button>
          <Link to="/crm-pipeline"><Button size="sm">Sales Pipeline →</Button></Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Pipeline Value" value={`$${pipelineValue.toLocaleString()}`} sub="open opportunities" color="text-blue-600" icon={Target} link="/crm-pipeline" />
        <MetricCard label="Weighted Pipeline" value={`$${Math.round(weightedPipeline).toLocaleString()}`} sub="probability-adjusted" color="text-violet-600" icon={TrendingUp} link="/crm-pipeline" />
        <MetricCard label="Active MRR" value={`$${totalMRR.toLocaleString()}`} sub={`$${totalARR.toLocaleString()} ARR`} color="text-emerald-600" icon={DollarSign} link="/crm-revenue" />
        <MetricCard label="Total Contacts" value={contacts.length + leads.length} sub={`${orgs.length} organizations`} color="text-cyan-600" icon={Users} link="/crm-contacts" />
      </div>

      {/* Alert Row */}
      {(atRisk > 0 || expiringContracts.length > 0 || overdueFollowUps > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {atRisk > 0 && (
            <Card className="p-3 border border-orange-200 bg-orange-50">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-orange-600" /><p className="text-sm font-semibold text-orange-800">At-Risk Relationships</p></div>
              <p className="text-2xl font-black text-orange-700">{atRisk}</p>
              <p className="text-xs text-orange-600">immediate attention required</p>
            </Card>
          )}
          {expiringContracts.length > 0 && (
            <Card className="p-3 border border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-red-600" /><p className="text-sm font-semibold text-red-800">Contracts Expiring</p></div>
              <p className="text-2xl font-black text-red-700">{expiringContracts.length}</p>
              <p className="text-xs text-red-600">within 60 days — renewal action needed</p>
            </Card>
          )}
          {overdueFollowUps > 0 && (
            <Card className="p-3 border border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-amber-600" /><p className="text-sm font-semibold text-amber-800">Overdue Follow-ups</p></div>
              <p className="text-2xl font-black text-amber-700">{overdueFollowUps}</p>
              <p className="text-xs text-amber-600">past next action date</p>
            </Card>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <Card className="p-4 border border-border/60">
          <p className="text-sm font-semibold mb-4">Pipeline by Stage</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stageData} barSize={28}>
              <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} />
              <Bar dataKey="value" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4 border border-border/60">
          <p className="text-sm font-semibold mb-4">Lead Sources</p>
          {sourceData.length === 0 ? (
            <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">No leads yet</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 flex-1">
                {sourceData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="capitalize flex-1 truncate">{s.name}</span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Leads", count: leads.length, sub: `${leads.filter(l=>l.status==="new").length} new`, path: "/crm-leads", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Opportunities", count: opps.length, sub: `${opps.filter(o=>o.stage==="proposal").length} in proposal`, path: "/crm-pipeline", color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Deals", count: deals.length, sub: `${deals.filter(d=>d.status==="active").length} active`, path: "/crm-deals", color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Contracts", count: contracts.length, sub: `${expiringContracts.length} expiring`, path: "/crm-contracts", color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Partners", count: partners.length, sub: `${partners.filter(p=>p.status==="active").length} active`, path: "/crm-partners", color: "text-cyan-600", bg: "bg-cyan-50" },
          { label: "Organizations", count: orgs.length, sub: `${orgs.filter(o=>o.status==="active").length} active`, path: "/crm-contacts", color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Contacts", count: contacts.length, sub: "tracked relationships", path: "/crm-contacts", color: "text-pink-600", bg: "bg-pink-50" },
          { label: "Revenue", count: `$${totalMRR.toLocaleString()}/mo`, sub: "active MRR", path: "/crm-revenue", color: "text-green-600", bg: "bg-green-50" },
        ].map(item => (
          <Link to={item.path} key={item.label}>
            <Card className="p-3 border border-border/60 hover:shadow-md transition-all cursor-pointer">
              <p className={`text-xl font-black ${item.color}`}>{item.count}</p>
              <p className="text-xs font-semibold">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.sub}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      {recentComms.length > 0 && (
        <Card className="p-4 border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Recent Communications</p>
            <Link to="/crm-communications" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {recentComms.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.outcome === "positive" ? "bg-emerald-500" : c.outcome === "negative" ? "bg-red-500" : "bg-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.subject}</p>
                  <p className="text-[10px] text-muted-foreground">{c.type} · {c.date ? moment(c.date).fromNow() : "—"}</p>
                </div>
                <Badge variant="outline" className="text-[9px] capitalize">{c.outcome || "neutral"}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}