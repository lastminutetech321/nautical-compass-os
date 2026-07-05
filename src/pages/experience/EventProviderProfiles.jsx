import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Loader2, Plus, Star, Shield, MapPin, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const PROVIDER_TYPES = ["promoter", "musician", "dj", "av_tech", "lighting_tech", "video_tech", "project_manager", "security_company", "rental_company", "photographer", "videographer", "caterer", "cleaning_crew", "ticketing_support", "marketing_support", "director", "venue_owner"];

export default function EventProviderProfiles() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "", provider_type: "dj", role: "", services: [], city: "", state: "",
    contact_email: "", contact_phone: "", bio: "", experience_years: 0,
    hourly_rate: 0, flat_rate: 0, insurance_status: "none"
  });
  const [serviceInput, setServiceInput] = useState("");

  useEffect(() => {
    base44.entities.EventProvider.list("-created_date", 200).then(setProviders).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await base44.functions.invoke("ncExperienceNetwork", { operation: "create_provider", params: { provider: form } });
      setDialogOpen(false);
      const refreshed = await base44.entities.EventProvider.list("-created_date", 200);
      setProviders(refreshed);
      setForm({ name: "", provider_type: "dj", role: "", services: [], city: "", state: "", contact_email: "", contact_phone: "", bio: "", experience_years: 0, hourly_rate: 0, flat_rate: 0, insurance_status: "none" });
    } finally { setCreating(false); }
  };

  const addService = () => {
    if (serviceInput.trim()) {
      setForm({ ...form, services: [...form.services, serviceInput.trim()] });
      setServiceInput("");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NC Experience Network</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Users className="w-6 h-6 text-violet-500" />Provider Profiles</h1>
          <p className="text-sm text-muted-foreground mt-1">Marketplace for promoters, musicians, DJs, techs, security, caterers, and more.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Create Profile</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Provider Profile</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name / Company</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="DJ Soundwave" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Provider Type</Label>
                  <Select value={form.provider_type} onValueChange={v => setForm({...form, provider_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROVIDER_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Role</Label><Input value={form.role} onChange={e => setForm({...form, role: e.target.value})} placeholder="Lead DJ" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
                <div><Label>State</Label><Input value={form.state} onChange={e => setForm({...form, state: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} /></div>
                <div><Label>Phone</Label><Input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} /></div>
              </div>
              <div>
                <Label>Services</Label>
                <div className="flex gap-2">
                  <Input value={serviceInput} onChange={e => setServiceInput(e.target.value)} placeholder="Add a service..." onKeyDown={e => e.key === "Enter" && addService()} />
                  <Button size="sm" onClick={addService}>Add</Button>
                </div>
                {form.services.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{form.services.map((s, i) => <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>)}</div>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Experience (yrs)</Label><Input type="number" value={form.experience_years} onChange={e => setForm({...form, experience_years: +e.target.value})} /></div>
                <div><Label>Hourly Rate</Label><Input type="number" value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate: +e.target.value})} /></div>
                <div><Label>Flat Rate</Label><Input type="number" value={form.flat_rate} onChange={e => setForm({...form, flat_rate: +e.target.value})} /></div>
              </div>
              <div><Label>Insurance Status</Label>
                <Select value={form.insurance_status} onValueChange={v => setForm({...form, insurance_status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["none", "basic", "full_coverage", "verified"].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} rows={2} /></div>
              <Button onClick={handleCreate} className="w-full" disabled={creating || !form.name}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}Submit for Verification
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {providers.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No providers yet. Create a profile to join the marketplace.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map(p => (
            <Card key={p.id} className="p-4 border border-border/60">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm">{p.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{p.provider_type?.replace(/_/g, " ")}</p>
                </div>
                {p.verification_status === "verified" ? <Badge className="bg-green-100 text-green-700"><Shield className="w-2.5 h-2.5 mr-1" />Verified</Badge> :
                 p.verification_status === "pending" ? <Badge variant="outline">Pending</Badge> : <Badge variant="secondary">Unverified</Badge>}
              </div>
              {p.city && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{p.city}, {p.state}</p>}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div><p className="text-[10px] text-muted-foreground">Experience</p><p className="text-sm font-semibold">{p.experience_years || 0} yrs</p></div>
                <div><p className="text-[10px] text-muted-foreground">Events</p><p className="text-sm font-semibold">{p.events_completed || 0}</p></div>
              </div>
              {p.services?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{p.services.slice(0, 3).map((s, i) => <Badge key={i} variant="secondary" className="text-[9px]">{s}</Badge>)}{p.services.length > 3 && <Badge variant="outline" className="text-[9px]">+{p.services.length - 3}</Badge>}</div>}
              <div className="mb-2">
                <div className="flex justify-between mb-1"><p className="text-[10px] text-muted-foreground">Trust Score</p><p className="text-[10px] font-medium">{p.trust_score || 50}</p></div>
                <Progress value={p.trust_score || 50} className="h-1" />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Star className="w-3 h-3 text-amber-400" />{p.avg_rating || 0} ({p.total_reviews || 0} reviews)
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}