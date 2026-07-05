import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, Clock, DollarSign, AlertTriangle, TrendingUp, Star, Shield, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function WorkforceExecutiveDashboard() {
  const [data, setData] = useState({ workers:[], contracts:[], timeEntries:[], invoices:[], gigs:[], safety:[], ratings:[], unions:[], vendors:[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.WorkerProfile.list("-created_date", 500),
      base44.entities.WorkerContract.list("-created_date", 300),
      base44.entities.WorkerTimeEntry.list("-date", 500),
      base44.entities.WorkforceInvoice.list("-issue_date", 300),
      base44.entities.GigOpportunity.list("-posted_date", 200),
      base44.entities.SafetyReport.list("-created_date", 100),
      base44.entities.WorkerRating.list("-date", 200),
      base44.entities.UnionRecord.list("-created_date", 100),
      base44.entities.VendorRecord.list("-created_date", 100),
    ]).then(([workers, contracts, timeEntries, invoices, gigs, safety, ratings, unions, vendors]) => {
      setData({ workers, contracts, timeEntries, invoices, gigs, safety, ratings, unions, vendors });
    }).finally(() => setLoading(false));
  }, []);

  const { workers, contracts, timeEntries, invoices, gigs, safety, ratings, unions, vendors } = data;

  const activeWorkers = workers.filter(w => w.availability_status === "available").length;
  const activeContracts = contracts.filter(c => c.status === "active").length;
  const openGigs = gigs.filter(g => g.status === "open").length;
  const openSafety = safety.filter(s => s.status === "open").length;
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s,i) => s+(i.total||0),0);
  const outstanding = invoices.filter(i => ["sent","viewed","partial"].includes(i.status)).reduce((s,i) => s+(i.balance_due||i.total||0),0);
  const totalHours = timeEntries.reduce((s, e) => s+(e.hours||0),0);
  const avgRating = ratings.length > 0 ? (ratings.reduce((s,r) => s+(r.rating||0),0)/ratings.length).toFixed(1) : "—";

  // Worker type breakdown
  const byType = Object.entries(workers.reduce((acc,w) => { acc[w.worker_type]=(acc[w.worker_type]||0)+1; return acc; },{}))
    .map(([name, value]) => ({ name:name.replace(/_/g," "), value }));
  const TYPE_COLORS = ["#f97316","#fb923c","#fdba74","#fed7aa","#ffedd5","#fff7ed","#ea580c","#c2410c"];

  // Monthly hours
  const monthlyHours = {};
  timeEntries.forEach(e => { const m = e.date?.slice(0,7)||"Unknown"; monthlyHours[m]=(monthlyHours[m]||0)+(e.hours||0); });
  const monthlyData = Object.entries(monthlyHours).sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([month,hours]) => ({ month:month.slice(5), hours:Math.round(hours) }));

  // Cert expiry alerts
  const today = new Date().toISOString().slice(0,10);

  const MODULES = [
    ["/workforce/profiles","👤","Workers",workers.length],
    ["/workforce/gigs","🎯","Open Gigs",openGigs],
    ["/workforce/contracts","📝","Active Contracts",activeContracts],
    ["/workforce/invoices","🧾","Revenue",(totalRevenue/1000).toFixed(0)+"k"],
    ["/workforce/time","⏱","Hours",totalHours.toFixed(0)],
    ["/workforce/safety","⚠️","Safety Reports",openSafety],
    ["/workforce/ratings","⭐","Avg Rating",avgRating],
    ["/workforce/vendors","🏗","Vendors",vendors.length],
    ["/workforce/unions","✊","Union Members",unions.length],
    ["/workforce/matching","🔗","Opportunities","→"],
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center"><Briefcase className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-xl font-bold">Workforce Executive Dashboard</h1><p className="text-xs text-muted-foreground">{workers.length} workers · {activeContracts} active contracts · {openGigs} open gigs</p></div>
        </div>
        <Link to="/workforce"><Button variant="outline" size="sm">← Hub</Button></Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label:"Available", value:activeWorkers, icon:Users, color:"text-blue-600" },
          { label:"Revenue (Paid)", value:`$${(totalRevenue/1000).toFixed(0)}k`, icon:DollarSign, color:"text-emerald-600" },
          { label:"Outstanding", value:`$${(outstanding/1000).toFixed(0)}k`, icon:TrendingUp, color:"text-amber-600" },
          { label:"Total Hours", value:totalHours.toFixed(0), icon:Clock, color:"text-violet-600" },
          { label:"Safety Open", value:openSafety, icon:AlertTriangle, color:openSafety>0?"text-red-600":"text-emerald-600" },
        ].map(m => (
          <Card key={m.label} className="p-4 text-center">
            <m.icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
            <p className={`text-xl font-black ${m.color}`}>{loading ? "—" : m.value}</p>
            <p className="text-[9px] text-muted-foreground">{m.label}</p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Monthly Hours Tracked</h3>
            {monthlyData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No time data yet</p> : (
              <ResponsiveContainer width="100%" height={180}><BarChart data={monthlyData}><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tick={{fontSize:10}} /><Tooltip /><Bar dataKey="hours" fill="#f97316" radius={[3,3,0,0]} /></BarChart></ResponsiveContainer>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Workers by Type</h3>
            {byType.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No workers yet</p> : (
              <ResponsiveContainer width="100%" height={180}><PieChart><Pie data={byType} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({name,value})=>`${name}: ${value}`} labelLine={false} fontSize={9}>{byType.map((_,i) => <Cell key={i} fill={TYPE_COLORS[i%TYPE_COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      {/* Module Quick Access */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {MODULES.map(([path,icon,label,val]) => (
          <Link key={path} to={path}>
            <Card className="p-3 hover:border-orange-400 transition-all cursor-pointer text-center">
              <p className="text-xl">{icon}</p>
              <p className="text-xs font-semibold mt-1">{label}</p>
              <p className="text-sm font-black text-orange-600">{loading ? "—" : val}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Alerts */}
      {openSafety > 0 && (
        <Card className="p-3 bg-red-50 border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-sm text-red-700 font-semibold">{openSafety} open safety report(s) require attention</span></div>
          <Link to="/workforce/safety"><Button size="sm" variant="outline" className="border-red-300 text-red-700">Review</Button></Link>
        </Card>
      )}
    </div>
  );
}