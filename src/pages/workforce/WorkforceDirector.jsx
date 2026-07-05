import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Loader2, Users, UserPlus, AlertTriangle, CheckCircle, TrendingUp,
  Star, Clock, Award, ArrowRight, MessageSquare, Lightbulb, ShieldAlert,
  Briefcase, GraduationCap, UserCheck
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

export default function WorkforceDirector() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coachingWorker, setCoachingWorker] = useState(null);
  const [coaching, setCoaching] = useState({ note_type: 'coaching', category: 'general', note_text: '', rating: 3, action_items: [], follow_up_date: '' });
  const [savingCoaching, setSavingCoaching] = useState(false);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncWorkforceGateway', { operation: 'dashboard', params: {} });
      setDashboard(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSaveCoaching = async () => {
    setSavingCoaching(true);
    try {
      await base44.functions.invoke('ncWorkforceGateway', {
        operation: 'create_coaching_note',
        params: {
          worker_profile_id: coachingWorker.id,
          ...coaching,
          action_items: coaching.action_items
        }
      });
      setCoachingWorker(null);
      setCoaching({ note_type: 'coaching', category: 'general', note_text: '', rating: 3, action_items: [], follow_up_date: '' });
      loadDashboard();
    } catch (e) { console.error(e); }
    setSavingCoaching(false);
  };

  const advancePipeline = async (profileId) => {
    try {
      await base44.functions.invoke('ncWorkforceGateway', {
        operation: 'advance_pipeline',
        params: { profile_id: profileId }
      });
      loadDashboard();
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const m = dashboard?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Workforce Gateway</p>
        <h1 className="text-3xl font-bold tracking-tight">Director Workforce Workspace</h1>
        <p className="text-muted-foreground mt-1">Manage the full worker lifecycle — from application to career advancement</p>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "New Applicants", value: m.new_applicants || 0, icon: UserPlus, color: "text-cyan-600 bg-cyan-50" },
          { label: "Awaiting Onboarding", value: m.awaiting_onboarding || 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
          { label: "In Training", value: m.in_training || 0, icon: GraduationCap, color: "text-violet-600 bg-violet-50" },
          { label: "Ready for Work", value: m.ready_for_assignments || 0, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
          { label: "Need Follow-up", value: m.needing_followup || 0, icon: AlertTriangle, color: "text-orange-600 bg-orange-50" },
          { label: "Mentorship Pairs", value: m.mentorship_assignments || 0, icon: UserCheck, color: "text-indigo-600 bg-indigo-50" },
          { label: "Compliance Alerts", value: m.compliance_alerts || 0, icon: ShieldAlert, color: "text-red-600 bg-red-50" },
          { label: "Avg Readiness", value: `${m.avg_readiness || 0}`, icon: TrendingUp, color: "text-teal-600 bg-teal-50" },
          { label: "Avg Trust", value: `${m.avg_trust || 0}`, icon: Star, color: "text-yellow-600 bg-yellow-50" },
          { label: "Avg Contribution", value: `${m.avg_contribution || 0}`, icon: Award, color: "text-purple-600 bg-purple-50" },
        ].map(s => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Recommended Next Actions */}
      {(dashboard?.next_actions || []).length > 0 && (
        <Card className="p-4 border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Recommended Next Actions</h2>
          </div>
          <div className="space-y-2">
            {(dashboard?.next_actions || []).map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge variant={a.priority === 'critical' ? 'destructive' : 'outline'} className="text-[10px]">{a.priority}</Badge>
                <span>{a.action}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Compliance Alerts */}
      {(dashboard?.compliance_alerts || []).length > 0 && (
        <Card className="p-4 border border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-semibold text-red-700">Compliance Alerts ({dashboard?.compliance_alerts?.length})</h2>
          </div>
          <div className="space-y-2">
            {(dashboard?.compliance_alerts || []).map(p => (
              <div key={p.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-red-200">
                <div>
                  <p className="text-sm font-medium text-red-800">{p.full_name}</p>
                  <p className="text-xs text-red-600 mt-0.5">Compliance: {p.compliance_status} · Background: {p.background_check_status}</p>
                </div>
                <Link to={`/workforce-passport/${p.id}`}>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-300">Review</Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Workers Ready for Assignments */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-semibold">Workers Ready for Assignments</h2>
          <Badge variant="outline" className="text-[10px] ml-auto">{dashboard?.ready_for_assignments?.length || 0}</Badge>
        </div>
        {(dashboard?.ready_for_assignments || []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No workers ready yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(dashboard?.ready_for_assignments || []).map(p => (
              <div key={p.id} className="p-3 rounded-lg border border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-emerald-700">{p.first_name?.[0]}{p.last_name?.[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/workforce-passport/${p.id}`}>
                      <p className="text-sm font-medium truncate hover:text-primary">{p.full_name}</p>
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">{p.desired_position || 'General'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-[10px] text-emerald-600">Ready: {p.readiness_score}/100</Badge>
                    <Badge variant="secondary" className="text-[10px]">{p.availability?.replace(/_/g, ' ')}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setCoachingWorker(p)}>
                    <MessageSquare className="w-3 h-3 mr-1" />Coach
                  </Button>
                  {p.pipeline_stage === 'eligible' && (
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => advancePipeline(p.id)}>
                      <ArrowRight className="w-3 h-3 mr-1" />Assign
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Workers In Training */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-4 h-4 text-violet-500" />
          <h2 className="text-sm font-semibold">Workers In Training</h2>
          <Badge variant="outline" className="text-[10px] ml-auto">{dashboard?.in_training?.length || 0}</Badge>
        </div>
        {(dashboard?.in_training || []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No workers in training</p>
        ) : (
          <div className="space-y-2">
            {(dashboard?.in_training || []).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40">
                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-violet-700">{p.first_name?.[0]}{p.last_name?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/workforce-passport/${p.id}`}>
                    <p className="text-sm font-medium truncate hover:text-primary">{p.full_name}</p>
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">Training: {p.training_completed?.length || 0} courses completed</p>
                </div>
                <Progress value={p.readiness_score || 0} className="w-20 h-1.5" />
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => advancePipeline(p.id)}>
                  <ArrowRight className="w-3 h-3 mr-1" />Advance
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Career Advancement Recommendations */}
      {(dashboard?.advancement_recommendations || []).length > 0 && (
        <Card className="p-5 border border-purple-200 bg-purple-50">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-purple-700">Career Advancement Recommendations</h2>
          </div>
          <div className="space-y-2">
            {(dashboard?.advancement_recommendations || []).map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200">
                <div>
                  <p className="text-sm font-medium text-purple-800">{r.worker_name}</p>
                  <p className="text-xs text-purple-600 mt-0.5">{r.current_level} → {r.recommended_level} (Readiness: {r.readiness}/100)</p>
                </div>
                <Link to={`/workforce-passport/${r.worker_id}`}>
                  <Button size="sm" variant="outline" className="text-purple-600 border-purple-300">Review</Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Workers Needing Follow-up */}
      {(dashboard?.needing_followup || []).length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold">Workers Needing Follow-up</h2>
            <Badge variant="outline" className="text-[10px] ml-auto">{dashboard?.needing_followup?.length || 0}</Badge>
          </div>
          <div className="space-y-2">
            {(dashboard?.needing_followup || []).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40">
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-orange-700">{p.first_name?.[0]}{p.last_name?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">Last coaching: {p.last_coaching_date ? new Date(p.last_coaching_date).toLocaleDateString() : 'Never'}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setCoachingWorker(p)}>
                  <MessageSquare className="w-3 h-3 mr-1" />Follow up
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Coaching Notes */}
      {(dashboard?.recent_coaching || []).length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold">Recent Coaching Notes</h2>
          </div>
          <div className="space-y-2">
            {(dashboard?.recent_coaching || []).slice(0, 5).map(n => (
              <div key={n.id} className="p-3 rounded-lg border border-border/40 bg-muted/20">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-medium">{n.worker_name}</p>
                  <Badge variant="outline" className="text-[9px]">{n.note_type}</Badge>
                  <Badge variant="secondary" className="text-[9px]">{n.category}</Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">{n.director_name}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.note_text}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Coaching Note Dialog */}
      <Dialog open={!!coachingWorker} onOpenChange={(open) => !open && setCoachingWorker(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Coaching Note — {coachingWorker?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Note Type</Label>
                <Select value={coaching.note_type} onValueChange={v => setCoaching({...coaching, note_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coaching">Coaching</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="praise">Praise</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="check_in">Check-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={coaching.category} onValueChange={v => setCoaching({...coaching, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="professionalism">Professionalism</SelectItem>
                    <SelectItem value="attendance">Attendance</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                    <SelectItem value="reliability">Reliability</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="customer_service">Customer Service</SelectItem>
                    <SelectItem value="ethics">Ethics</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Rating (1-5)</Label>
              <Select value={String(coaching.rating)} onValueChange={v => setCoaching({...coaching, rating: parseInt(v)})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — Needs major improvement</SelectItem>
                  <SelectItem value="2">2 — Below expectations</SelectItem>
                  <SelectItem value="3">3 — Meets expectations</SelectItem>
                  <SelectItem value="4">4 — Exceeds expectations</SelectItem>
                  <SelectItem value="5">5 — Outstanding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Note</Label>
              <Textarea rows={4} value={coaching.note_text} onChange={e => setCoaching({...coaching, note_text: e.target.value})} placeholder="Detailed coaching note..." />
            </div>
            <div>
              <Label className="text-xs">Action Items (comma-separated)</Label>
              <Textarea rows={2} value={coaching.action_items.join(", ")} onChange={e => setCoaching({...coaching, action_items: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})} placeholder="Complete safety training, Schedule check-in..." />
            </div>
            <p className="text-[10px] text-muted-foreground">This note will be propagated to Enterprise Memory, Development Memory, Knowledge Graph, and Organizational Intelligence.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoachingWorker(null)}>Cancel</Button>
            <Button onClick={handleSaveCoaching} disabled={savingCoaching || !coaching.note_text}>
              {savingCoaching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Coaching Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}