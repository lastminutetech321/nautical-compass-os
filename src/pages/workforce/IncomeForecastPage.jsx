import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, DollarSign, Loader2, Wand2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

export default function IncomeForecastPage() {
  const [workers, setWorkers] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.WorkerProfile.list("-created_date", 100),
      base44.entities.WorkerTimeEntry.list("-date", 500),
      base44.entities.WorkforceInvoice.list("-issue_date", 300),
      base44.entities.WorkerContract.filter({ status: "active" }, "-created_date", 100),
    ]).then(([w, t, i, c]) => { setWorkers(w); setTimeEntries(t); setInvoices(i); setContracts(c); }).finally(() => setLoading(false));
  }, []);

  const filteredEntries = selectedWorker === "all" ? timeEntries : timeEntries.filter(e => e.worker_id === selectedWorker);
  const filteredInvoices = selectedWorker === "all" ? invoices : invoices.filter(inv => inv.worker_id === selectedWorker);

  // Monthly income from time entries
  const monthlyIncome = {};
  filteredEntries.filter(e => e.billable).forEach(e => {
    const m = e.date?.slice(0,7) || "Unknown";
    monthlyIncome[m] = (monthlyIncome[m] || 0) + (e.amount || 0);
  });
  const monthlyData = Object.entries(monthlyIncome).sort(([a],[b]) => a.localeCompare(b)).slice(-12).map(([month, amount]) => ({ month: month.slice(5), amount: Math.round(amount) }));

  // Summary stats
  const totalBilled = filteredInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = filteredInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const totalOutstanding = filteredInvoices.filter(i => ["sent","viewed","partial"].includes(i.status)).reduce((s, i) => s + (i.balance_due || i.total || 0), 0);
  const totalHours = filteredEntries.reduce((s, e) => s + (e.hours || 0), 0);
  const avgRate = totalHours > 0 ? (filteredEntries.reduce((s,e) => s+(e.amount||0),0) / totalHours) : 0;

  const generateForecast = async () => {
    setAiLoading(true);
    const worker = workers.find(w => w.id === selectedWorker);
    const activeContracts = contracts.filter(c => !selectedWorker || selectedWorker === "all" || c.worker_id === selectedWorker);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a 12-month income forecast based on:
Worker: ${worker ? `${worker.full_name}, ${worker.primary_trade}, $${worker.hourly_rate}/hr` : "All workers"}
Monthly income history (last 6 months): ${monthlyData.slice(-6).map(m => `${m.month}: $${m.amount}`).join(", ") || "No data"}
Active contracts: ${activeContracts.length} contracts, total value $${activeContracts.reduce((s,c)=>s+(c.total_value||0),0).toLocaleString()}
Total hours tracked: ${totalHours.toFixed(0)}
Average effective rate: $${avgRate.toFixed(0)}/hr
Total billed: $${totalBilled.toLocaleString()}
Total paid: $${totalPaid.toLocaleString()}
Outstanding: $${totalOutstanding.toLocaleString()}

Forecast next 12 months of income with monthly estimates, identify peak/slow periods, provide revenue growth recommendations, and calculate annual projected income. Be specific and data-driven.`,
      response_json_schema: {
        type: "object",
        properties: {
          monthly_forecast: { type: "array", items: { type: "object", properties: { month:{type:"string"}, projected:{type:"number"}, notes:{type:"string"} } } },
          annual_projection: { type: "number" },
          growth_rate_pct: { type: "number" },
          peak_months: { type: "array", items: { type: "string" } },
          slow_months: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } }
        }
      }
    });
    setForecast(result);
    setAiLoading(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Income Forecast</h1></div>
        <div className="flex gap-2">
          <Select value={selectedWorker} onValueChange={setSelectedWorker}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Workers</SelectItem>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent></Select>
          <Button onClick={generateForecast} disabled={aiLoading || loading} className="bg-orange-600 hover:bg-orange-700 text-white">{aiLoading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Forecasting…</> : <><Wand2 className="w-4 h-4 mr-1" />AI Forecast</>}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Billed", value: `$${totalBilled.toLocaleString()}`, color: "text-blue-600" },
          { label: "Total Collected", value: `$${totalPaid.toLocaleString()}`, color: "text-emerald-600" },
          { label: "Outstanding", value: `$${totalOutstanding.toLocaleString()}`, color: "text-amber-600" },
          { label: "Avg Rate", value: `$${Math.round(avgRate)}/hr`, color: "text-violet-600" },
        ].map(m => (
          <Card key={m.label} className="p-4 text-center">
            <p className={`text-xl font-black ${m.color}`}>{loading ? "—" : m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </Card>
        ))}
      </div>

      {monthlyData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Monthly Billable Income (Historical)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}><XAxis dataKey="month" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} /><Tooltip formatter={v => [`$${v.toLocaleString()}`, "Income"]} /><Bar dataKey="amount" fill="#f97316" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {forecast && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">12-Month AI Forecast</h3>
              <div className="flex gap-3 text-sm">
                <span className="font-bold text-emerald-600">Projected Annual: ${forecast.annual_projection?.toLocaleString()}</span>
                {forecast.growth_rate_pct !== undefined && <Badge className={forecast.growth_rate_pct >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>{forecast.growth_rate_pct > 0 ? "+" : ""}{forecast.growth_rate_pct}% growth</Badge>}
              </div>
            </div>
            {forecast.monthly_forecast?.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={forecast.monthly_forecast}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tick={{fontSize:10}} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} /><Tooltip formatter={v => [`$${v.toLocaleString()}`, "Projected"]} /><Line type="monotone" dataKey="projected" stroke="#f97316" strokeWidth={2} dot={false} /></LineChart>
              </ResponsiveContainer>
            )}
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {forecast.recommendations?.length > 0 && (
              <Card className="p-3">
                <p className="text-xs font-bold text-emerald-700 mb-2">Growth Recommendations</p>
                <ul className="space-y-1">{forecast.recommendations.map((r,i) => <li key={i} className="text-xs text-muted-foreground">• {r}</li>)}</ul>
              </Card>
            )}
            {forecast.risks?.length > 0 && (
              <Card className="p-3">
                <p className="text-xs font-bold text-red-700 mb-2">Risk Factors</p>
                <ul className="space-y-1">{forecast.risks.map((r,i) => <li key={i} className="text-xs text-muted-foreground">• {r}</li>)}</ul>
              </Card>
            )}
          </div>
        </div>
      )}

      {!forecast && !aiLoading && monthlyData.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <TrendingUp className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">Log time entries and create invoices to see income data, then run AI forecast.</p>
        </Card>
      )}
    </div>
  );
}