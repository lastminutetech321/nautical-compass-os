import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, TrendingUp, AlertTriangle, RefreshCw, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import moment from "moment";

const STATUS_COLORS = { draft:"bg-slate-100 text-slate-600", under_review:"bg-amber-100 text-amber-700", pending_signature:"bg-blue-100 text-blue-700", active:"bg-emerald-100 text-emerald-700", expired:"bg-red-100 text-red-700", terminated:"bg-red-100 text-red-700", renewed:"bg-violet-100 text-violet-700" };
const DEAL_STATUS = { negotiating:"bg-amber-100 text-amber-700", pending_signature:"bg-blue-100 text-blue-700", signed:"bg-violet-100 text-violet-700", active:"bg-emerald-100 text-emerald-700", on_hold:"bg-slate-100 text-slate-600", cancelled:"bg-red-100 text-red-700", completed:"bg-gray-100 text-gray-700" };
const emptyDealForm = { name:"", organization_id:"", type:"saas", status:"negotiating", value:"", mrr:"", arr:"", probability:"80", close_date:"", start_date:"", assigned_to:"", next_action:"", notes:"" };
const emptyContractForm = { name:"", organization_id:"", deal_id:"", type:"service_agreement", status:"draft", value:"", mrr:"", start_date:"", end_date:"", auto_renews:false, renewal_notice_days:30, terms_summary:"", assigned_to:"", notes:"" };

export default function CRMRevenue() {
  const [deals, setDeals] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [subs, setSubs] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [dealForm, setDealForm] = useState(emptyDealForm);
  const [contractForm, setContractForm] = useState(emptyContractForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [d, c, inv, sub, or_] = await Promise.all([
      base44.entities.CRMDeal.list("-created_date", 300).catch(() => []),
      base44.entities.CRMContract.list("-created_date", 300).catch(() => []),
      base44.entities.Invoice.list("-created_date", 200).catch(() => []),
      base44.entities.Subscription.list("-created_date", 200).catch(() => []),
      base44.entities.Organization.list("-created_date", 200).catch(() => []),
    ]);
    setDeals(d); setContracts(c); setInvoices(inv); setSubs(sub); setOrgs(or_);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveDeal = async (e) => {
    e.preventDefault(); setSaving(true);
    const data = { ...dealForm, value: dealForm.value ? Number(dealForm.value) : 0, mrr: dealForm.mrr ? Number(dealForm.mrr) : 0, arr: dealForm.arr ? Number(dealForm.arr) : 0, probability: Number(dealForm.probability) };
    if (editingDeal) await base44.entities.CRMDeal.update(editingDeal.id, data);
    else await base44.entities.CRMDeal.create(data);
    setSaving(false); setDealFormOpen(false); setEditingDeal(null); setDealForm(emptyDealForm); load();
  };

  const saveContract = async (e) => {
    e.preventDefault(); setSaving(true);
    const data = { ...contractForm, value: contractForm.value ? Number(contractForm.value) : 0, mrr: contractForm.mrr ? Number(contractForm.mrr) : 0, renewal_notice_days: Number(contractForm.renewal_notice_days) };
    if (editingContract) await base44.entities.CRMContract.update(editingContract.id, data);
    else await base44.entities.CRMContract.create(data);
    setSaving(false); setContractFormOpen(false); setEditingContract(null); setContractForm(emptyContractForm); load();
  };

  const totalMRR = deals.filter(d => ["signed","active"].includes(d.status)).reduce((s, d) => s + (d.mrr || 0), 0);
  const totalARR = deals.filter(d => ["signed","active"].includes(d.status)).reduce((s, d) => s + (d.arr || 0), 0);
  const paidInvoices = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount_paid || 0), 0);
  const openInvoices = invoices.filter(i => i.status === "open").reduce((s, i) => s + (i.amount_due || 0), 0);
  const expiringContracts = contracts.filter(c => c.end_date && moment(c.end_date).isBefore(moment().add(60,"days")) && c.status === "active");
  const activeContracts = contracts.filter(c => c.status === "active");

  // MRR forecast (simple projection)
  const mrrForecast = Array.from({ length: 6 }, (_, i) => ({
    month: moment().add(i, "months").format("MMM"),
    mrr: totalMRR + (i * totalMRR * 0.05),
  }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Enterprise CRM</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><DollarSign className="w-6 h-6 text-emerald-500" />Revenue Intelligence</h1>
          <p className="text-sm text-muted-foreground">{deals.length} deals · {contracts.length} contracts · {invoices.length} invoices</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditingContract(null); setContractForm(emptyContractForm); setContractFormOpen(true); }}><Plus className="w-3.5 h-3.5 mr-1" />Contract</Button>
          <Button size="sm" onClick={() => { setEditingDeal(null); setDealForm(emptyDealForm); setDealFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />Deal</Button>
        </div>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 border border-border/60"><p className="text-xs text-muted-foreground">Active MRR</p><p className="text-2xl font-black text-emerald-600">${totalMRR.toLocaleString()}</p><p className="text-xs text-muted-foreground">per month</p></Card>
        <Card className="p-4 border border-border/60"><p className="text-xs text-muted-foreground">Active ARR</p><p className="text-2xl font-black text-violet-600">${totalARR.toLocaleString()}</p><p className="text-xs text-muted-foreground">annualized</p></Card>
        <Card className="p-4 border border-border/60"><p className="text-xs text-muted-foreground">Invoices Paid</p><p className="text-2xl font-black text-blue-600">${paidInvoices.toLocaleString()}</p><p className="text-xs text-muted-foreground">${openInvoices.toLocaleString()} open</p></Card>
        <Card className={`p-4 border ${expiringContracts.length > 0 ? "border-red-200 bg-red-50" : "border-border/60"}`}><p className="text-xs text-muted-foreground">Expiring Contracts</p><p className={`text-2xl font-black ${expiringContracts.length>0?"text-red-600":"text-emerald-600"}`}>{expiringContracts.length}</p><p className="text-xs text-muted-foreground">within 60 days</p></Card>
      </div>

      {/* MRR Forecast */}
      {totalMRR > 0 && (
        <Card className="p-4 border border-border/60 mb-6">
          <p className="text-sm font-semibold mb-4">MRR Forecast (6 months @ 5% growth)</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={mrrForecast}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => `$${Math.round(v).toLocaleString()}`} />
              <Area type="monotone" dataKey="mrr" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {expiringContracts.length > 0 && (
        <Card className="p-4 border border-red-200 bg-red-50 mb-5">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-red-600" /><p className="text-sm font-semibold text-red-800">Contracts Requiring Renewal Action</p></div>
          <div className="space-y-2">
            {expiringContracts.map(c => {
              const org = orgs.find(o => o.id === c.organization_id);
              return (
                <div key={c.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100">
                  <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{org?.name || "—"}</p></div>
                  <div className="text-right"><p className="text-xs font-semibold text-red-600">Expires {moment(c.end_date).format("MMM D, YYYY")}</p><p className="text-xs text-muted-foreground">{moment(c.end_date).fromNow()}</p></div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Tabs defaultValue="deals">
        <TabsList className="mb-4">
          <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
          <TabsTrigger value="contracts">Contracts ({contracts.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="deals">
          <div className="space-y-2">
            {deals.length === 0 ? <div className="text-center py-12 border border-dashed border-border rounded-xl"><p className="text-sm text-muted-foreground">No deals yet.</p><Button size="sm" className="mt-3" onClick={() => setDealFormOpen(true)}>Create Deal</Button></div> : deals.map(deal => {
              const org = orgs.find(o => o.id === deal.organization_id);
              return (
                <Card key={deal.id} className="p-3 border border-border/60 hover:shadow-sm transition-all cursor-pointer" onClick={() => { setEditingDeal(deal); setDealForm({ name:deal.name||"", organization_id:deal.organization_id||"", type:deal.type||"saas", status:deal.status||"negotiating", value:deal.value||"", mrr:deal.mrr||"", arr:deal.arr||"", probability:deal.probability||80, close_date:deal.close_date||"", start_date:deal.start_date||"", assigned_to:deal.assigned_to||"", next_action:deal.next_action||"", notes:deal.notes||"" }); setDealFormOpen(true); }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{deal.name}</p>
                      <p className="text-xs text-muted-foreground">{org?.name || "—"} · {(deal.type||"").replace(/_/g," ")}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {deal.mrr > 0 && <p className="text-sm font-bold text-emerald-600">${deal.mrr.toLocaleString()}/mo</p>}
                      {deal.value > 0 && <p className="text-xs text-muted-foreground">${deal.value.toLocaleString()} total</p>}
                      <Badge className={`text-[10px] ${DEAL_STATUS[deal.status]||""}`}>{(deal.status||"").replace(/_/g," ")}</Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="contracts">
          <div className="space-y-2">
            {contracts.length === 0 ? <div className="text-center py-12 border border-dashed border-border rounded-xl"><p className="text-sm text-muted-foreground">No contracts yet.</p><Button size="sm" className="mt-3" onClick={() => setContractFormOpen(true)}>Create Contract</Button></div> : contracts.map(contract => {
              const org = orgs.find(o => o.id === contract.organization_id);
              const daysLeft = contract.end_date ? moment(contract.end_date).diff(moment(), "days") : null;
              return (
                <Card key={contract.id} className={`p-3 border ${daysLeft !== null && daysLeft < 60 && contract.status === "active" ? "border-red-200" : "border-border/60"} hover:shadow-sm transition-all cursor-pointer`} onClick={() => { setEditingContract(contract); setContractForm({ name:contract.name||"", organization_id:contract.organization_id||"", deal_id:contract.deal_id||"", type:contract.type||"service_agreement", status:contract.status||"draft", value:contract.value||"", mrr:contract.mrr||"", start_date:contract.start_date||"", end_date:contract.end_date||"", auto_renews:contract.auto_renews||false, renewal_notice_days:contract.renewal_notice_days||30, terms_summary:contract.terms_summary||"", assigned_to:contract.assigned_to||"", notes:contract.notes||"" }); setContractFormOpen(true); }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{contract.name}</p>
                      <p className="text-xs text-muted-foreground">{org?.name || "—"} · {(contract.type||"").replace(/_/g," ")}</p>
                      {contract.start_date && <p className="text-xs text-muted-foreground mt-0.5">{contract.start_date} → {contract.end_date || "ongoing"}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {contract.mrr > 0 && <p className="text-sm font-bold text-emerald-600">${contract.mrr.toLocaleString()}/mo</p>}
                      <Badge className={`text-[10px] ${STATUS_COLORS[contract.status]||""}`}>{(contract.status||"").replace(/_/g," ")}</Badge>
                      {daysLeft !== null && daysLeft < 60 && <Badge className="text-[10px] bg-red-100 text-red-700">{daysLeft}d left</Badge>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <div className="space-y-2">
            {invoices.length === 0 ? <div className="text-center py-12 border border-dashed border-border rounded-xl"><p className="text-sm text-muted-foreground">No invoices yet.</p></div> : invoices.map(inv => {
              const org = orgs.find(o => o.id === inv.organization_id);
              return (
                <Card key={inv.id} className="p-3 border border-border/60 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold">{inv.invoice_number || "Invoice"}</p>
                    <p className="text-xs text-muted-foreground">{org?.name || "—"}{inv.due_date ? ` · Due ${moment(inv.due_date).format("MMM D")}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold">${(inv.amount_due||0).toLocaleString()}</p>
                    <Badge className={`text-[10px] ${inv.status==="paid"?"bg-emerald-100 text-emerald-700":inv.status==="open"?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-600"}`}>{inv.status}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Deal Form */}
      <Dialog open={dealFormOpen} onOpenChange={v => { setDealFormOpen(v); if (!v) setEditingDeal(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingDeal ? "Edit Deal" : "New Deal"}</DialogTitle></DialogHeader>
          <form onSubmit={saveDeal} className="space-y-3">
            <div><Label>Deal Name *</Label><Input value={dealForm.name} onChange={e => setDealForm({...dealForm,name:e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Organization</Label>
                <Select value={dealForm.organization_id} onValueChange={v => setDealForm({...dealForm,organization_id:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select org" /></SelectTrigger>
                  <SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={dealForm.type} onValueChange={v => setDealForm({...dealForm,type:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["saas","consulting","retainer","one_time","enterprise","partnership","license"].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Total Value ($)</Label><Input type="number" value={dealForm.value} onChange={e => setDealForm({...dealForm,value:e.target.value})} /></div>
              <div><Label>MRR ($)</Label><Input type="number" value={dealForm.mrr} onChange={e => setDealForm({...dealForm,mrr:e.target.value})} /></div>
              <div><Label>ARR ($)</Label><Input type="number" value={dealForm.arr} onChange={e => setDealForm({...dealForm,arr:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Status</Label>
                <Select value={dealForm.status} onValueChange={v => setDealForm({...dealForm,status:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["negotiating","pending_signature","signed","active","on_hold","cancelled","completed"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Close Date</Label><Input type="date" value={dealForm.close_date} onChange={e => setDealForm({...dealForm,close_date:e.target.value})} /></div>
            </div>
            <div><Label>Next Action</Label><Input value={dealForm.next_action} onChange={e => setDealForm({...dealForm,next_action:e.target.value})} /></div>
            <div><Label>Notes</Label><Textarea value={dealForm.notes} onChange={e => setDealForm({...dealForm,notes:e.target.value})} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDealFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving?"Saving...":editingDeal?"Update":"Create"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contract Form */}
      <Dialog open={contractFormOpen} onOpenChange={v => { setContractFormOpen(v); if (!v) setEditingContract(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingContract ? "Edit Contract" : "New Contract"}</DialogTitle></DialogHeader>
          <form onSubmit={saveContract} className="space-y-3">
            <div><Label>Contract Name *</Label><Input value={contractForm.name} onChange={e => setContractForm({...contractForm,name:e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Organization</Label>
                <Select value={contractForm.organization_id} onValueChange={v => setContractForm({...contractForm,organization_id:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select org" /></SelectTrigger>
                  <SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={contractForm.type} onValueChange={v => setContractForm({...contractForm,type:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["msa","sow","nda","license","partnership","retainer","service_agreement","enterprise"].map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>MRR ($)</Label><Input type="number" value={contractForm.mrr} onChange={e => setContractForm({...contractForm,mrr:e.target.value})} /></div>
              <div><Label>Status</Label>
                <Select value={contractForm.status} onValueChange={v => setContractForm({...contractForm,status:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["draft","under_review","pending_signature","active","expired","terminated","renewed"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={contractForm.start_date} onChange={e => setContractForm({...contractForm,start_date:e.target.value})} /></div>
              <div><Label>End Date</Label><Input type="date" value={contractForm.end_date} onChange={e => setContractForm({...contractForm,end_date:e.target.value})} /></div>
            </div>
            <div><Label>Terms Summary</Label><Textarea value={contractForm.terms_summary} onChange={e => setContractForm({...contractForm,terms_summary:e.target.value})} rows={2} /></div>
            <div><Label>Notes</Label><Textarea value={contractForm.notes} onChange={e => setContractForm({...contractForm,notes:e.target.value})} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setContractFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving?"Saving...":editingContract?"Update":"Create"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}