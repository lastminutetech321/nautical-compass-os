import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, Clock, DollarSign, Star, Shield, TrendingUp, ChevronRight, AlertTriangle, CheckCircle } from "lucide-react";

const MODULES = [
  { label: "Worker Profiles", path: "/workforce/profiles", icon: "👤", desc: "Manage worker profiles, rates & availability" },
  { label: "Skills & Certifications", path: "/workforce/skills", icon: "🎓", desc: "Skills, licenses, credentials & expiry tracking" },
  { label: "Resume Builder", path: "/workforce/resume", icon: "📄", desc: "AI-powered resume generation" },
  { label: "Scheduling", path: "/workforce/schedule", icon: "📅", desc: "Shifts, jobs, blocks & availability calendar" },
  { label: "Contracts", path: "/workforce/contracts", icon: "📝", desc: "Service agreements, NDAs & project contracts" },
  { label: "Time Tracking", path: "/workforce/time", icon: "⏱", desc: "Log hours, billable time & project tracking" },
  { label: "Invoices", path: "/workforce/invoices", icon: "🧾", desc: "Create, send & track invoices" },
  { label: "Vendor Registry", path: "/workforce/vendors", icon: "🏗", desc: "Staffing agencies, subcontractors & suppliers" },
  { label: "Union Tracking", path: "/workforce/unions", icon: "✊", desc: "Membership, dues, CBA & grievances" },
  { label: "Gig Marketplace", path: "/workforce/gigs", icon: "🎯", desc: "Post & browse gig opportunities" },
  { label: "Training Library", path: "/workforce/training", icon: "📚", desc: "Courses, safety certs & skill development" },
  { label: "Career Planner", path: "/workforce/career", icon: "🗺", desc: "AI-powered career roadmap & goals" },
  { label: "Opportunity Matching", path: "/workforce/matching", icon: "🔗", desc: "AI matches workers to open gigs" },
  { label: "Safety Reporting", path: "/workforce/safety", icon: "⚠️", desc: "Incident reports, OSHA tracking, hazards" },
  { label: "Ratings", path: "/workforce/ratings", icon: "⭐", desc: "Client & worker rating system" },
  { label: "Income Forecast", path: "/workforce/income", icon: "📈", desc: "Income projections & revenue forecast" },
  { label: "Payroll Dashboard", path: "/workforce/payroll", icon: "💰", desc: "Payroll tracking & payout management" },
  { label: "Executive Dashboard", path: "/workforce/dashboard", icon: "🎯", desc: "Full workforce analytics & command" },
];

export default function WorkforceHub() {
  const [stats, setStats] = useState({ workers: 0, activeContracts: 0, openGigs: 0, pendingInvoices: 0, openSafety: 0, hoursThisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.WorkerProfile.list("-created_date", 200),
      base44.entities.WorkerContract.filter({ status: "active" }, "-created_date", 100),
      base44.entities.GigOpportunity.filter({ status: "open" }, "-created_date", 100),
      base44.entities.WorkforceInvoice.filter({ status: "sent" }, "-created_date", 100),
      base44.entities.SafetyReport.filter({ status: "open" }, "-created_date", 50),
    ]).then(([workers, contracts, gigs, invoices, safety]) => {
      setStats({ workers: workers.length, activeContracts: contracts.length, openGigs: gigs.length, pendingInvoices: invoices.length, openSafety: safety.length });
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Workforce Rail</h1>
            <p className="text-sm text-muted-foreground">Career Operating System — manage workers, gigs, contracts, income & safety</p>
          </div>
        </div>
        <Link to="/workforce/profiles">
          <Button className="bg-orange-600 hover:bg-orange-700 text-white">+ Add Worker</Button>
        </Link>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Workers", value: stats.workers, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Active Contracts", value: stats.activeContracts, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Open Gigs", value: stats.openGigs, icon: Briefcase, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
          { label: "Pending Invoices", value: stats.pendingInvoices, icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Safety Reports", value: stats.openSafety, icon: AlertTriangle, color: stats.openSafety > 0 ? "text-red-600" : "text-emerald-600", bg: stats.openSafety > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Revenue Rail", value: "→", icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30", path: "/workforce/income" },
        ].map(m => (
          <Card key={m.label} className={`p-4 ${m.bg} border-0 ${m.path ? "cursor-pointer hover:opacity-80" : ""}`} onClick={() => m.path && (window.location.href = m.path)}>
            <div className="flex items-center gap-2">
              <m.icon className={`w-4 h-4 ${m.color}`} />
              <div>
                <p className={`text-xl font-black ${m.color}`}>{loading ? "—" : m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modules Grid */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-widest">Workforce Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map(m => (
            <Link key={m.path} to={m.path}>
              <Card className="p-4 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <p className="font-semibold text-sm group-hover:text-orange-600 transition-colors">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-orange-500" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}