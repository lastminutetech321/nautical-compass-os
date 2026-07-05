import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Loader2, CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

const CRITERIA = [
  { key: "occupancy", label: "Occupancy" },
  { key: "sound_system", label: "Sound System" },
  { key: "tvs_screens", label: "TVs / Screens" },
  { key: "stage", label: "Stage" },
  { key: "lighting", label: "Lighting" },
  { key: "internet", label: "Internet" },
  { key: "cameras", label: "Cameras" },
  { key: "seating", label: "Seating" },
  { key: "security", label: "Security" },
  { key: "staffing", label: "Staffing" },
  { key: "permits_checklists", label: "Permits / Checklists" },
  { key: "insurance", label: "Insurance" },
  { key: "accessibility", label: "Accessibility" },
  { key: "parking", label: "Parking" },
  { key: "food_beverage", label: "Food / Beverage" },
];

export default function EventReadiness() {
  const [venues, setVenues] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState("");
  const [scores, setScores] = useState({});
  const [assessing, setAssessing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Venue.list("-created_date", 200),
      base44.entities.EventReadinessAssessment.list("-created_date", 50)
    ]).then(([v, a]) => { setVenues(v); setAssessments(a); })
      .finally(() => setLoading(false));
  }, []);

  const handleScoreChange = (key, value) => {
    setScores(prev => ({ ...prev, [key]: value }));
  };

  const handleAssess = async () => {
    if (!selectedVenue) return;
    setAssessing(true);
    try {
      const res = await base44.functions.invoke("ncExperienceNetwork", {
        operation: "assess_readiness",
        params: { venue_id: selectedVenue, scores }
      });
      setResult(res.data);
      const refreshed = await base44.entities.EventReadinessAssessment.list("-created_date", 50);
      setAssessments(refreshed);
    } finally { setAssessing(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NC Experience Network</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Shield className="w-6 h-6 text-green-500" />Event Readiness Score</h1>
        <p className="text-sm text-muted-foreground mt-1">Measure readiness across 15 operational criteria.</p>
      </div>

      <Card className="p-5 border border-border/60">
        <div className="space-y-4">
          <div>
            <Label>Select Venue</Label>
            <Select value={selectedVenue} onValueChange={setSelectedVenue}>
              <SelectTrigger><SelectValue placeholder="Choose a venue..." /></SelectTrigger>
              <SelectContent>{venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CRITERIA.map(c => (
              <div key={c.key} className="border border-border/60 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium">{c.label}</p>
                  <Badge variant="outline" className="text-[9px]">{scores[c.key] || 0}/100</Badge>
                </div>
                <input type="range" min={0} max={100} value={scores[c.key] || 0}
                  onChange={e => handleScoreChange(c.key, +e.target.value)}
                  className="w-full h-1.5 accent-primary" />
              </div>
            ))}
          </div>

          <Button onClick={handleAssess} disabled={!selectedVenue || assessing} className="w-full">
            {assessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
            Run Readiness Assessment
          </Button>

          {result && (
            <div className="border border-primary/30 rounded-lg p-4 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="font-semibold">Overall Score: {result.overall_score}/100</p>
                <Badge className="capitalize">{(result.level || "").replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{result.gaps_count} gaps identified. Assessment saved.</p>
            </div>
          )}
        </div>
      </Card>

      {assessments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Recent Assessments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assessments.map(a => (
              <Card key={a.id} className="p-3 border border-border/60">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium truncate">{a.venue_name}</p>
                  <Badge className="capitalize text-[9px]">{(a.readiness_level || "").replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={a.overall_readiness_score || 0} className="h-1.5 flex-1" />
                  <span className="text-xs font-semibold">{a.overall_readiness_score || 0}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{a.assessment_date}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}