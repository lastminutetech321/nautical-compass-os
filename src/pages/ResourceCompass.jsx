import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Compass, Home, Briefcase, Heart, Shield, Truck, GraduationCap,
  Star, DollarSign, AlertTriangle, FileText, Calendar, Bell,
  Users, Zap, ArrowRight, RefreshCw, Loader2, CheckCircle, Clock,
  Search, Database, MapPin, Phone
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import moment from "moment";

const CATEGORIES = [
  { key: "housing",       label: "Housing",         icon: Home,          color: "text-blue-600 bg-blue-50",      path: "/resource-search?cat=housing" },
  { key: "employment",    label: "Employment",       icon: Briefcase,     color: "text-emerald-600 bg-emerald-50",path: "/resource-search?cat=employment" },
  { key: "food",          label: "Food & SNAP",      icon: "🍎",           color: "text-orange-600 bg-orange-50",  path: "/resource-search?cat=food" },
  { key: "medical",       label: "Medical",          icon: Heart,         color: "text-rose-600 bg-rose-50",      path: "/resource-search?cat=medical" },
  { key: "mental_health", label: "Mental Health",    icon: "🧠",           color: "text-violet-600 bg-violet-50",  path: "/resource-search?cat=mental_health" },
  { key: "legal_aid",     label: "Legal Aid",        icon: Shield,        color: "text-amber-600 bg-amber-50",    path: "/resource-search?cat=legal_aid" },
  { key: "transportation",label: "Transportation",   icon: Truck,         color: "text-sky-600 bg-sky-50",        path: "/resource-search?cat=transportation" },
  { key: "education",     label: "Education",        icon: GraduationCap, color: "text-cyan-600 bg-cyan-50",      path: "/resource-search?cat=education" },
  { key: "veteran",       label: "Veteran Resources",icon: Star,          color: "text-indigo-600 bg-indigo-50",  path: "/resource-search?cat=veteran" },
  { key: "financial",     label: "Financial Aid",    icon: DollarSign,    color: "text-green-600 bg-green-50",    path: "/resource-search?cat=financial" },
  { key: "emergency",     label: "Emergency",        icon: AlertTriangle, color: "text-red-600 bg-red-50",        path: "/resource-search?cat=emergency" },
  { key: "disaster",      label: "Disaster Relief",  icon: "🌪",           color: "text-slate-600 bg-slate-50",   path: "/resource-search?cat=disaster" },
];

export default function ResourceCompass() {
  const [cases, setCases] = useState([]);
  const [applications, setApplications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ResourceCase.list("-created_date", 50).catch(() => []),
      base44.entities.ResourceApplication.list("-created_date", 100).catch(() => []),
      base44.entities.ResourceReminder.filter({ status: "pending" }, "due_date", 20).catch(() => []),
      base44.entities.ResourceAppointment.filter({ status: "scheduled" }, "date", 10).catch(() => []),
      base44.entities.Resource.filter({ status: "active" }, "-created_date", 50).catch(() => []),
    ]).then(([c, a, r, appt, res]) => {
      setCases(c); setApplications(a); setReminders(r);
      setAppointments(appt); setResources(res);
      setLoading(false);
    });
  }, []);

  const activeCases = cases.filter(c => ["intake","assessment","active"].includes(c.status));
  const crisisCases = cases.filter(c => ["crisis","emergency"].includes(c.crisis_level));
  const pendingApps = applications.filter(a => ["submitted","pending_review","additional_info_needed"].includes(a.status));
  const overdueReminders = reminders.filter(r => r.due_date && new Date(r.due_date) < new Date());
  const upcomingAppts = appointments.filter(a => a.date && new Date(a.date) >= new Date()).slice(0, 5);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Resource Compass Rail</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-cyan-500" />Resource Compass
          </h1>
          <p className="text-sm text-muted-foreground">Guide people from crisis to stability. Connect resources, track applications, meet deadlines.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/resource-cases"><Button size="sm" variant="outline"><Users className="w-4 h-4 mr-1.5" />Cases</Button></Link>
          <Link to="/resource-cases"><Button size="sm"><Zap className="w-4 h-4 mr-1.5" />New Case</Button></Link>
        </div>
      </div>

      {/* Crisis Alert */}
      {crisisCases.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-red-400 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-red-800">⚠ {crisisCases.length} Crisis-Level Case{crisisCases.length > 1 ? "s" : ""} Require Immediate Attention</p>
            <p className="text-sm text-red-700">{crisisCases.map(c => c.client_name).join(", ")}</p>
          </div>
          <Link to="/resource-cases"><Button size="sm" variant="destructive">View Now</Button></Link>
        </div>
      )}

      {/* Overdue reminders */}
      {overdueReminders.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-300 bg-amber-50">
          <Bell className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 flex-1"><strong>{overdueReminders.length} overdue deadline{overdueReminders.length > 1 ? "s" : ""}</strong> — action required now.</p>
          <Link to="/resource-reminders"><Button size="sm" variant="outline" className="text-amber-700 border-amber-300">View All</Button></Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Cases", value: activeCases.length, icon: Users, color: activeCases.length > 0 ? "text-blue-600 bg-blue-50" : "text-muted-foreground bg-muted", link: "/resource-cases" },
          { label: "Pending Applications", value: pendingApps.length, icon: FileText, color: pendingApps.length > 0 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50", link: "/resource-applications" },
          { label: "Upcoming Appointments", value: upcomingAppts.length, icon: Calendar, color: "text-violet-600 bg-violet-50", link: "/resource-appointments" },
          { label: "Overdue Deadlines", value: overdueReminders.length, icon: Bell, color: overdueReminders.length > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50", link: "/resource-reminders" },
        ].map(k => (
          <Link key={k.label} to={k.link}>
            <Card className="p-4 border border-border/60 hover:border-primary/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.color}`}>
                  <k.icon className="w-4 h-4" />
                </div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
              <p className="text-2xl font-bold pl-10">{k.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Resource Categories */}
      <Card className="p-5 border border-border/60">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-cyan-500" />
          <h2 className="text-sm font-semibold">Resource Categories</h2>
          <Badge variant="outline" className="text-[10px] ml-auto">{resources.length} resources in database</Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CATEGORIES.map(cat => {
            const count = resources.filter(r => r.category === cat.key).length;
            const IconComp = typeof cat.icon === "string" ? null : cat.icon;
            return (
              <Link key={cat.key} to={`/resource-search?cat=${cat.key}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${typeof cat.icon === "string" ? "bg-muted" : cat.color}`}>
                    {IconComp ? <IconComp className="w-4 h-4" /> : cat.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{cat.label}</p>
                    <p className="text-[10px] text-muted-foreground">{count} resources</p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Quick Nav */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "🧭 Eligibility Engine", desc: "Find what you qualify for", path: "/resource-eligibility" },
          { label: "📋 Application Tracker", desc: "Track all applications", path: "/resource-applications" },
          { label: "📅 Appointments", desc: "Manage upcoming meetings", path: "/resource-appointments" },
          { label: "⏰ Deadline Engine", desc: "All deadlines & renewals", path: "/resource-reminders" },
          { label: "🗂 Benefit Planner", desc: "Plan your benefit strategy", path: "/resource-planner" },
          { label: "👥 Case Manager", desc: "All client cases", path: "/resource-cases" },
          { label: "🔍 Resource Search", desc: "Find local resources", path: "/resource-search" },
          { label: "📁 Document Checklist", desc: "Required documents tracker", path: "/resource-docs" },
        ].map(n => (
          <Link key={n.path} to={n.path}>
            <Card className="p-3 border border-border/60 hover:border-primary/40 hover:bg-muted/20 transition-all cursor-pointer h-full">
              <p className="text-sm font-semibold mb-0.5">{n.label}</p>
              <p className="text-[11px] text-muted-foreground">{n.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppts.length > 0 && (
        <Card className="p-5 border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-semibold">Upcoming Appointments</h2>
            </div>
            <Link to="/resource-appointments"><Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">View All →</Badge></Link>
          </div>
          <div className="space-y-2">
            {upcomingAppts.map(appt => (
              <div key={appt.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{appt.title}</p>
                  <p className="text-xs text-muted-foreground">{appt.client_name} · {appt.resource_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-violet-600">{moment(appt.date).format("MMM D")}</p>
                  {appt.time && <p className="text-[10px] text-muted-foreground">{appt.time}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Active cases summary */}
      {activeCases.length > 0 && (
        <Card className="p-0 border border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Active Cases</h2>
            <Link to="/resource-cases"><Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">All Cases →</Badge></Link>
          </div>
          <div className="divide-y divide-border/40">
            {activeCases.slice(0, 6).map(c => {
              const caseApps = applications.filter(a => a.case_id === c.id);
              const approvedApps = caseApps.filter(a => a.status === "approved").length;
              return (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{c.client_name || c.title}</p>
                    <p className="text-xs text-muted-foreground">{(c.primary_needs || []).slice(0,2).join(", ") || "No needs recorded"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${c.crisis_level === "crisis" || c.crisis_level === "emergency" ? "text-red-600 border-red-200" : c.crisis_level === "urgent" ? "text-amber-600 border-amber-200" : "text-emerald-600 border-emerald-200"}`}>
                      {c.crisis_level}
                    </Badge>
                    {caseApps.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{approvedApps}/{caseApps.length} approved</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {cases.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Compass className="w-12 h-12 mx-auto mb-3 text-cyan-400 opacity-40" />
          <p className="text-sm font-semibold mb-1">Resource Compass is ready</p>
          <p className="text-xs text-muted-foreground mb-4">Open a case to begin guiding someone from crisis to stability.</p>
          <Link to="/resource-cases"><Button>Open First Case</Button></Link>
        </div>
      )}
    </div>
  );
}