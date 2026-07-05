import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, Search, Star, CheckCircle } from "lucide-react";

const CATEGORIES = ["staffing","subcontractor","supplier","consultant","agency","union_hall","technology","legal","financial","training","other"];
const STATUSES = ["active","inactive","preferred","blacklisted","pending_review"];
const STATUS_COLORS = { active:"bg-emerald-100 text-emerald-700", inactive:"bg-gray-100 text-gray-500", preferred:"bg-blue-100 text-blue-700", blacklisted:"bg-red-100 text-red-700", pending_review:"bg-amber-100 text-amber-700" };
const BLANK = { company_name:"", contact_name:"", email:"", phone:"", website:"", category:"staffing", status:"active", license_number:"", insurance_verified:false, w9_on_file:false, contract_on_file:false, notes:"" };

export default function VendorRegistryPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK);

  useEffect(() => { base44.entities.VendorRecord.list("-created_date", 200).then(setVendors).finally(() => setLoading(false)); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const r = await base44.entities.VendorRecord.create(form);
    setVendors(prev => [r, ...prev]);
    setOpen(false);
    setSaving(false);
    setForm(BLANK);
  };

  const filtered = vendors.filter(v => {
    if (catFilter !== "all" && v.category !== catFilter) return false;
    if (search && !`${v.company_name} ${v.contact_name} ${v.category}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Vendor Registry</h1><Badge variant="outline">{vendors.length}</Badge></div>
        <Button onClick={() => { setForm(BLANK); setOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-1" />Add Vendor</Button>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={catFilter} onValueChange={setCatFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g," ").replace(/\b\w/g,x=>x.toUpperCase())}</SelectItem>)}</SelectContent></Select>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? <Card className="p-8 text-center border-dashed"><p className="text-muted-foreground">No vendors found.</p></Card> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(v => (
            <Card key={v.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div><p className="font-bold text-sm">{v.company_name}</p><p className="text-xs text-muted-foreground">{v.contact_name || "—"} {v.email ? `· ${v.email}` : ""}</p></div>
                <Badge className={`text-[10px] ${STATUS_COLORS[v.status]||""}`}>{v.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[9px]">{v.category?.replace(/_/g," ")}</Badge>
                {v.insurance_verified && <Badge variant="outline" className="text-[9px] text-emerald-600"><CheckCircle className="w-2.5 h-2.5 mr-0.5" />Insured</Badge>}
                {v.w9_on_file && <Badge variant="outline" className="text-[9px] text-blue-600">W9</Badge>}
                {v.contract_on_file && <Badge variant="outline" className="text-[9px] text-violet-600">Contract</Badge>}
                {v.rating > 0 && <Badge variant="outline" className="text-[9px]"><Star className="w-2.5 h-2.5 mr-0.5 text-amber-500" />{v.rating}</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="col-span-2"><Label>Company Name *</Label><Input value={form.company_name} onChange={e => set("company_name", e.target.value)} className="mt-1" /></div>
            <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => set("contact_name", e.target.value)} className="mt-1" /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => set("email", e.target.value)} className="mt-1" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} className="mt-1" /></div>
            <div><Label>Website</Label><Input value={form.website} onChange={e => set("website", e.target.value)} className="mt-1" /></div>
            <div><Label>Category</Label><Select value={form.category} onValueChange={v => set("category", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => set("status", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.insurance_verified} onChange={e => set("insurance_verified", e.target.checked)} id="ins" /><Label htmlFor="ins">Insurance Verified</Label></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.w9_on_file} onChange={e => set("w9_on_file", e.target.checked)} id="w9" /><Label htmlFor="w9">W9 on File</Label></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.contract_on_file} onChange={e => set("contract_on_file", e.target.checked)} id="con" /><Label htmlFor="con">Contract on File</Label></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.company_name} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "Save"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}