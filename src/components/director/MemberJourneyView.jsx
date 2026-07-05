import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Map, Search, CheckCircle2, Circle, Calendar, Target, BookOpen } from "lucide-react";

export default function MemberJourneyView() {
  const [memberId, setMemberId] = useState('');
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(null);

  const loadJourney = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncDirectorAssistant', { operation: 'getJourney', params: { member_id: memberId } });
      setJourney(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const completeMilestone = async (milestoneId) => {
    if (!journey) return;
    setCompleting(milestoneId);
    try {
      const res = await base44.functions.invoke('ncDirectorAssistant', {
        operation: 'completeJourneyStep',
        params: { journey_id: journey.id, milestone_id: milestoneId }
      });
      setJourney(res.data.journey);
    } catch (e) { console.error(e); }
    setCompleting(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-sm">Member ID</Label>
              <Input value={memberId} onChange={e => setMemberId(e.target.value)} placeholder="Enter member ID to view their journey" />
            </div>
            <Button onClick={loadJourney} disabled={loading || !memberId}>
              <Search className="w-4 h-4" /> {loading ? 'Loading...' : 'View Journey'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {journey && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Map className="w-4 h-4 text-violet-500" /> {journey.member_name}'s Journey</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="capitalize">{journey.current_stage}</Badge>
                <Badge variant={journey.journey_status === 'active' ? 'default' : 'outline'} className="capitalize">{journey.journey_status}</Badge>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Progress</span><span>{journey.milestones_completed}/{journey.milestones_total} milestones</span></div>
                <Progress value={journey.progress_pct} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-blue-500" /> Today's Step</CardTitle></CardHeader>
              <CardContent>
                {journey.today_step ? (
                  <div><p className="font-medium text-sm">{journey.today_step.title}</p><p className="text-xs text-muted-foreground mt-1">{journey.today_step.description}</p></div>
                ) : <p className="text-sm text-muted-foreground">No step defined.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Target className="w-3.5 h-3.5 text-emerald-500" /> Tomorrow's Step</CardTitle></CardHeader>
              <CardContent>
                {journey.tomorrow_step ? (
                  <div><p className="font-medium text-sm">{journey.tomorrow_step.title}</p><p className="text-xs text-muted-foreground mt-1">{journey.tomorrow_step.description}</p></div>
                ) : <p className="text-sm text-muted-foreground">No step defined.</p>}
              </CardContent>
            </Card>
          </div>

          {(journey.this_week_priorities || []).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">This Week's Priorities</CardTitle></CardHeader>
              <CardContent><ul className="space-y-1.5">{journey.this_week_priorities.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-sm"><Badge variant="outline" className="text-xs capitalize">{p.priority}</Badge> {p.title}</li>
              ))}</ul></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-amber-500" /> Milestones</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(journey.milestones || []).map((m, i) => (
                <div key={m.id || i} className={`flex items-start gap-2 p-2 rounded-md ${m.completed ? 'bg-emerald-50' : 'bg-muted/50'}`}>
                  {m.completed
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${m.completed ? 'text-emerald-700' : ''}`}>{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                    {m.completed && m.completed_at && <p className="text-xs text-emerald-600 mt-0.5">Completed {new Date(m.completed_at).toLocaleDateString()}</p>}
                  </div>
                  {!m.completed && (
                    <Button size="sm" variant="ghost" onClick={() => completeMilestone(m.id)} disabled={completing === m.id}>
                      {completing === m.id ? '...' : 'Mark Done'}
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {(journey.recommended_rails || []).length > 0 || (journey.recommended_compasses || []).length > 0 || (journey.recommended_ai_assistants || []).length > 0 ? (
            <Card>
              <CardHeader><CardTitle className="text-sm">Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(journey.recommended_rails || []).length > 0 && <div><p className="text-xs font-semibold mb-1">Rails:</p><div className="flex flex-wrap gap-1">{journey.recommended_rails.map((r, i) => <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>)}</div></div>}
                {(journey.recommended_compasses || []).length > 0 && <div><p className="text-xs font-semibold mb-1">Compasses:</p><div className="flex flex-wrap gap-1">{journey.recommended_compasses.map((c, i) => <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>)}</div></div>}
                {(journey.recommended_ai_assistants || []).length > 0 && <div><p className="text-xs font-semibold mb-1">AI Assistants:</p><div className="flex flex-wrap gap-1">{journey.recommended_ai_assistants.map((a, i) => <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>)}</div></div>}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}