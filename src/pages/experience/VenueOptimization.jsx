import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Loader2, Plus, MapPin, DollarSign, TrendingUp, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const VENUE_TYPES = ["bar", "restaurant", "lounge", "storefront", "community_center", "church", "hotel", "rooftop", "gallery", "after_hours_business"];

export default function VenueOptimization() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", venue_type: "bar", city: "", state: "", capacity: 100, current_monthly_revenue: 0 });
  const [optimizing, setOptimizing] = useState(null);

  useEffect(() => {
    base44.entities.Venue.list("-created_date", 200).then(setVenues).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    await base44.entities.Venue.create(form);
    setDialogOpen(false);
    const refreshed = await base44.entities.Venue.list("-created_date", 200);
    setVenues(refreshed);
  };

  const handleOptimize = async (venue) => {
    setOptimizing(venue.id);
    try {
      const res = await base44.functions.invoke("ncExperienceNetwork", { operation: "optimize_venue", params: { venue } });
      const updated = await base44.entities.Venue.get(venue.id);
      setVenues(prev => prev.map(v => v.id === venue.id ? updated : v));
    } finally { setOptimizing(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NC Experience Network</p>
          <h1 className="text-2xl font-bold tracking-tight">Venue Optimization</h1>
          <p className="text-sm text-muted-foreground mt-1">Evaluate existing spaces and identify event revenue potential.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Venue</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Venue</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="The Blue Room" /></div>
              <div><Label>Venue Type</Label>
                <Select value={form.venue_type} onValueChange={v => setForm({...form, venue_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VENUE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
                <div><Label>State</Label><Input value={form.state} onChange={e => setForm({...form, state: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: +e.target.value})} /></div>
                <div><Label>Monthly Revenue</Label><Input type="number" value={form.current_monthly_revenue} onChange={e => setForm({...form, current_monthly_revenue: +e.target.value})} /></div>
              </div>
              <Button onClick={handleCreate} className="w-full">Create Venue</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {venues.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No venues yet. Add your first space to start optimizing event revenue.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map(v => (
            <Card key={v.id} className="p-4 border border-border/60">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm">{v.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{v.venue_type?.replace(/_/g, " ")}</p>
                </div>
                {v.event_ready ? <Badge className="bg-green-100 text-green-700">Event Ready</Badge> : <Badge variant="outline">Not Ready</Badge>}
              </div>
              {v.city && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{v.city}, {v.state}</p>}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div><p className="text-[10px] text-muted-foreground">Capacity</p><p className="text-sm font-semibold">{v.capacity || 0}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Monthly Rev</p><p className="text-sm font-semibold">${(v.current_monthly_revenue || 0).toLocaleString()}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Event Potential</p><p className="text-sm font-semibold text-emerald-600">${(v.event_revenue_potential || 0).toLocaleString()}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Events Hosted</p><p className="text-sm font-semibold">{v.events_hosted || 0}</p></div>
              </div>
              <div className="mb-3">
                <div className="flex justify-between mb-1"><p className="text-[10px] text-muted-foreground">Readiness</p><p className="text-[10px] font-medium">{v.readiness_score || 0}%</p></div>
                <Progress value={v.readiness_score || 0} className="h-1.5" />
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={() => handleOptimize(v)} disabled={optimizing === v.id}>
                {optimizing === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <TrendingUp className="w-3.5 h-3.5 mr-1.5" />}
                Optimize Revenue
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}