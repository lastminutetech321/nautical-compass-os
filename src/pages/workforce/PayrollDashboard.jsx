import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Download, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export default function PayrollDashboard() {
  const [workers, setWorkers] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("this_month");

  useEffect(() => {
    Promise.all([
      base44.entities.WorkerProfile.list("-created_date", 100),
      base44.entities.WorkerTimeEntry.list("-date", 500),
    ]).then(([w, t]) => { setWorkers(w); setTimeEntries(t); }).finally(() => setLoading(false));
  }, []);

  const getRange = () => {
    const now = new Date();
    if (periodFilter === "this_month") {
      return [new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10), now.toISOString().slice(0,10)];
    }
    if (periodFilter === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return [start.toISOString().slice(0,10), end.toISOString().slice(0,10)];
    }
    const weekAgo = new Date(now - 7*86400000);
    return [weekAgo.toISOString().slice(0,10), now.toISOString().slice(0,10)];
  };

  const [rangeStart, rangeEnd] = getRange();
  const periodEntries = timeEntries.filter(e => e.date >= rangeStart && e.date <= rangeEnd);

  // Build payroll per worker
  const payroll = workers.map(w => {
    const entries = periodEntries.filter(e => e.worker_id === w.id);
    const hours = entries.reduce((s,e) => s+(e.hours||0),0);
    const billableHours = entries.filter(e => e.billable).reduce((s,e) => s+(e.hours||0),0);
    const earnings = entries.reduce((s,e) => s+(e.amount||0),0);
    const paidEntries = entries.filter(e => e.status === "paid").length;
    const unpaidEntries = entries.filter(e => ["draft","submitted","approved"].includes(e.status)).length;
    return { ...w, hours, billableHours, earnings, paidEntries, unpaidEntries, entryCount: entries.length };
  }).filter(w => w.entryCount > 0).sort((a,b) => b.earnings-a.earnings);

  const totalEarnings = payroll.reduce((s,w) => s+w.earnings, 0);
  const totalHours = payroll.reduce((s,w) => s+w.hours, 0);
  const unpaidTotal = payroll.filter(w => w.unpaidEntries > 0).reduce((s,w) => s+w.earnings, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Payroll Dashboard</h1></div>
        <div className="flex gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
            </SelectContent>
          </Select>
          <Link to="/workforce/time"><Button variant="outline" size="sm"><Clock className="w-4 h-4 mr-1" />Log Time</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center bg-emerald-50 dark:bg-emerald-950/20 border-0">
          <p className="text-2xl font-black text-emerald-600">${loading ? "—" : totalEarnings.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Period Earnings</p>
        </Card>
        <Card className="p-4 text-center bg-blue-50 dark:bg-blue-950/20 border-0">
          <p className="text-2xl font-black text-blue-600">{loading ? "—" : totalHours.toFixed(1)}h</p>
          <p className="text-xs text-muted-foreground">Total Hours Worked</p>
        </Card>
        <Card className="p-4 text-center bg-amber-50 dark:bg-amber-950/20 border-0">
          <p className="text-2xl font-black text-amber-600">{loading ? "—" : payroll.length}</p>
          <p className="text-xs text-muted-foreground">Workers with Hours</p>
        </Card>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : payroll.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground">No time entries for this period.</p>
          <Link to="/workforce/time"><Button className="mt-3 bg-orange-600 hover:bg-orange-700 text-white">Log Time</Button></Link>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Worker Payroll Summary — {rangeStart} to {rangeEnd}</h2>
          {payroll.map(w => (
            <Card key={w.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{w.full_name}</p>
                  <p className="text-xs text-muted-foreground">{w.primary_trade || w.worker_type} · {w.hours.toFixed(1)}h total · {w.billableHours.toFixed(1)}h billable</p>
                  <div className="flex gap-2 mt-1">
                    {w.paidEntries > 0 && <Badge className="bg-emerald-100 text-emerald-700 text-[9px]"><CheckCircle className="w-2.5 h-2.5 mr-0.5" />{w.paidEntries} paid entries</Badge>}
                    {w.unpaidEntries > 0 && <Badge className="bg-amber-100 text-amber-700 text-[9px]"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{w.unpaidEntries} unpaid</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-emerald-600">${w.earnings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{w.hours > 0 ? `$${(w.earnings/w.hours).toFixed(0)}/hr effective` : ""}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}