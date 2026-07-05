import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, Loader2, TrendingUp, Users, DollarSign, Star, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export default function EventIntelligence() {
  const [events, setEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Event.list("-created_date", 200),
      base44.entities.EventReport.list("-created_date", 50)
    ]).then(([e, r]) => {
      setEvents(e);
      setReports(r);
      const completed = e.find(ev => ev.status === "completed");
      if (completed) setSelectedEvent(completed.id);
    }).finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    if (!selectedEvent) return;
    setGenerating(true);
    try {
      await base44.functions.invoke("ncExperienceNetwork", { operation: "generate_event_report", params: { event_id: selectedEvent } });
      const refreshed = await base44.entities.EventReport.list("-created_date", 50);
      setReports(refreshed);
    } finally { setGenerating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const completedEvents = events.filter(e => e.status === "completed");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NC Experience Network</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><BarChart3 className="w-6 h-6 text-amber-500" />Event Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">Post-event reports with revenue impact, performance scores, and recommendations.</p>
      </div>

      {completedEvents.length > 0 && (
        <Card className="p-4 border border-border/60">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium mb-1.5">Generate Report for Event</p>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{completedEvents.map(e => <SelectItem key={e.id} value={e.id}>{e.title} — {e.event_date}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={!selectedEvent || generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}Generate Report
            </Button>
          </div>
        </Card>
      )}

      {reports.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No event reports yet. Complete an event and generate a report.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reports.map(r => (
            <Card key={r.id} className="p-4 border border-border/60">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{r.event_title}</h3>
                  <p className="text-xs text-muted-foreground">{r.venue_name} — {r.report_date}</p>
                </div>
                <Badge className="capitalize text-[9px]">{r.status}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <Card className="p-2 bg-emerald-50 border-emerald-200">
                  <p className="text-[10px] text-muted-foreground">Revenue</p>
                  <p className="text-sm font-bold text-emerald-700">${(r.total_revenue || 0).toLocaleString()}</p>
                </Card>
                <Card className="p-2 bg-blue-50 border-blue-200">
                  <p className="text-[10px] text-muted-foreground">Attendance</p>
                  <p className="text-sm font-bold text-blue-700">{r.attendance_actual || 0}/{r.attendance_expected || 0}</p>
                </Card>
                <Card className="p-2 bg-amber-50 border-amber-200">
                  <p className="text-[10px] text-muted-foreground">Uplift</p>
                  <p className="text-sm font-bold text-amber-700">{r.revenue_uplift_pct || 0}%</p>
                </Card>
              </div>

              <div className="space-y-2 mb-3">
                {[
                  { label: "Customer Satisfaction", value: r.customer_satisfaction_score, color: "bg-green-500" },
                  { label: "Artist Performance", value: r.artist_performance_score, color: "bg-violet-500" },
                  { label: "Promoter Performance", value: r.promoter_performance_score, color: "bg-blue-500" },
                  { label: "Staffing Efficiency", value: r.staffing_efficiency_score, color: "bg-orange-500" },
                  { label: "Production", value: r.production_score, color: "bg-amber-500" },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between mb-0.5"><p className="text-[10px] text-muted-foreground">{s.label}</p><p className="text-[10px] font-medium">{s.value || 0}</p></div>
                    <Progress value={s.value || 0} className="h-1" />
                  </div>
                ))}
              </div>

              {r.security_incidents > 0 && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Badge variant="destructive" className="text-[9px]">{r.security_incidents} security incidents</Badge>
                  {r.security_notes && <p className="text-[10px] text-muted-foreground truncate">{r.security_notes}</p>}
                </div>
              )}

              {r.future_recommendations?.length > 0 && (
                <div className="border-t border-border/40 pt-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Recommendations</p>
                  <ul className="space-y-1">
                    {r.future_recommendations.slice(0, 3).map((rec, i) => <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1"><TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0" />{rec}</li>)}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}