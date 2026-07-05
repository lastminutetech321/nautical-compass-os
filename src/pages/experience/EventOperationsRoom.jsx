import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Loader2, Eye, Users, DollarSign, Music, Shield, Wrench, Utensils, Briefcase, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_VIEWS = [
  { key: "venue", label: "Venue View", icon: Building2 },
  { key: "nc_project_manager", label: "NC PM View", icon: Briefcase },
  { key: "artist", label: "Artist View", icon: Music },
  { key: "promoter", label: "Promoter View", icon: Users },
  { key: "security", label: "Security View", icon: Shield },
  { key: "production", label: "Production View", icon: Wrench },
  { key: "staff", label: "Staff View", icon: Utensils },
  { key: "finance", label: "Finance View", icon: DollarSign },
];

export default function EventOperationsRoom() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [roleView, setRoleView] = useState("venue");
  const [viewData, setViewData] = useState(null);
  const [loadingView, setLoadingView] = useState(false);

  useEffect(() => {
    base44.entities.Event.list("-created_date", 200).then(data => {
      setEvents(data);
      if (data.length > 0 && !selectedEvent) setSelectedEvent(data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  const loadView = async () => {
    if (!selectedEvent) return;
    setLoadingView(true);
    try {
      const res = await base44.functions.invoke("ncExperienceNetwork", {
        operation: "event_operations",
        params: { event_id: selectedEvent, role_view: roleView }
      });
      setViewData(res.data);
    } finally { setLoadingView(false); }
  };

  useEffect(() => { if (selectedEvent) loadView(); }, [selectedEvent, roleView]);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NC Experience Network</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Calendar className="w-6 h-6 text-orange-500" />Event Operations Room</h1>
        <p className="text-sm text-muted-foreground mt-1">Shared live workspace. Each role sees its own view — all update the same event record.</p>
      </div>

      {events.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No events yet. Create an event to activate the Operations Room.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium mb-1.5">Select Event</p>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{events.map(e => <SelectItem key={e.id} value={e.id}>{e.title} — {e.event_date}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-medium mb-1.5">Role View</p>
              <Select value={roleView} onValueChange={setRoleView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLE_VIEWS.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {loadingView ? (
            <Card className="p-8 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></Card>
          ) : viewData ? (
            <div className="space-y-4">
              <Card className="p-4 border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-sm capitalize">{(viewData.role_view || "").replace(/_/g, " ")} View</p>
                </div>
                <p className="text-xs text-muted-foreground">{viewData.view_data?.focus}</p>
              </Card>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {viewData.view_data?.metrics && Object.entries(viewData.view_data.metrics).map(([key, val]) => (
                  <Card key={key} className="p-3 border border-border/60">
                    <p className="text-[10px] text-muted-foreground uppercase">{key.replace(/_/g, " ")}</p>
                    <p className="text-lg font-bold">{typeof val === "number" ? val.toLocaleString() : String(val)}</p>
                  </Card>
                ))}
              </div>

              {viewData.view_data?.tasks?.length > 0 && (
                <Card className="p-4 border border-border/60">
                  <p className="text-xs font-semibold mb-3">Tasks for This Role</p>
                  <div className="space-y-2">
                    {viewData.view_data.tasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded border border-border/40">
                        <Badge variant={task.done ? "secondary" : "outline"} className="text-[9px]">{task.done ? "Done" : "Open"}</Badge>
                        <p className="text-xs">{task.title || task.description || "Untitled task"}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card className="p-4 border border-border/60">
                <p className="text-xs font-semibold mb-2">Event Details</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Status:</span> <Badge className="text-[9px] capitalize">{viewData.event?.status}</Badge></div>
                  <div><span className="text-muted-foreground">Date:</span> {viewData.event?.event_date}</div>
                  <div><span className="text-muted-foreground">Time:</span> {viewData.event?.start_time} - {viewData.event?.end_time}</div>
                  <div><span className="text-muted-foreground">Venue:</span> {viewData.event?.venue_name}</div>
                  <div><span className="text-muted-foreground">Capacity:</span> {viewData.event?.capacity || 0}</div>
                  <div><span className="text-muted-foreground">Attendance:</span> {viewData.event?.actual_attendance || 0} / {viewData.event?.expected_attendance || 0}</div>
                  <div><span className="text-muted-foreground">Revenue:</span> ${(viewData.event?.total_revenue || 0).toLocaleString()}</div>
                  <div><span className="text-muted-foreground">Expenses:</span> ${(viewData.event?.total_expenses || 0).toLocaleString()}</div>
                  <div><span className="text-muted-foreground">Profit:</span> ${(viewData.event?.net_profit || 0).toLocaleString()}</div>
                </div>
              </Card>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}