import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Loader2, Award, Clock, Star, TrendingUp, Briefcase, Users,
  FileText, CheckCircle, Lightbulb, Wrench, GraduationCap,
  ArrowLeft, MessageSquare, Shield, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function CareerPassport() {
  const { workerId } = useParams();
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (workerId) loadPassport();
  }, [workerId]);

  const loadPassport = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncWorkforceGateway', {
        operation: 'get_passport',
        params: { worker_profile_id: workerId }
      });
      setPassport(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (!passport) return <div className="text-center py-12 text-muted-foreground">Worker not found</div>;

  const { profile, passport: pp } = passport;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/workforce-director">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Career Passport</p>
            <h1 className="text-3xl font-bold tracking-tight">{profile?.full_name}</h1>
            <p className="text-muted-foreground mt-1">{profile?.desired_position || 'General'} · {profile?.experience_level || 'Entry'} · {profile?.pipeline_stage?.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Readiness", value: profile?.readiness_score || 0, icon: TrendingUp, color: "text-teal-600 bg-teal-50" },
          { label: "Contribution", value: profile?.contribution_score || 0, icon: Award, color: "text-purple-600 bg-purple-50" },
          { label: "Trust", value: profile?.trust_score || 0, icon: Shield, color: "text-blue-600 bg-blue-50" },
          { label: "Reputation", value: profile?.reputation_score || 0, icon: Star, color: "text-amber-600 bg-amber-50" },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold">{s.value}<span className="text-sm text-muted-foreground">/100</span></p>
            <Progress value={s.value} className="h-1.5 mt-2" />
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Hours Worked", value: pp.total_hours || 0, icon: Clock },
          { label: "Assignments", value: pp.total_assignments || 0, icon: Briefcase },
          { label: "Clients", value: pp.clients?.length || 0, icon: Users },
          { label: "Skills Learned", value: pp.skills_learned?.length || 0, icon: GraduationCap },
          { label: "Supervisor Rating", value: pp.avg_supervisor_rating || 0, icon: Star },
          { label: "Customer Rating", value: pp.avg_customer_rating || 0, icon: Star },
        ].map(s => (
          <Card key={s.label} className="p-3 text-center">
            <s.icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'timeline', label: 'Career Timeline', icon: Clock },
          { key: 'knowledge', label: 'Knowledge Capture', icon: Lightbulb },
          { key: 'skills', label: 'Skills & Equipment', icon: Wrench },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3">Profile Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span>{profile?.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone:</span><span>{profile?.phone || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Location:</span><span>{[profile?.city, profile?.state].filter(Boolean).join(', ') || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Availability:</span><span>{profile?.availability?.replace(/_/g, ' ') || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Transportation:</span><span>{profile?.transportation?.replace(/_/g, ' ') || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Travel Distance:</span><span>{profile?.preferred_travel_distance_miles || 0} miles</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Compliance:</span><Badge variant="outline" className="text-[10px]">{profile?.compliance_status}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Background Check:</span><Badge variant="outline" className="text-[10px]">{profile?.background_check_status}</Badge></div>
              {profile?.assigned_director_name && <div className="flex justify-between"><span className="text-muted-foreground">Director:</span><span>{profile.assigned_director_name}</span></div>}
              {profile?.assigned_mentor_name && <div className="flex justify-between"><span className="text-muted-foreground">Mentor:</span><span>{profile.assigned_mentor_name}</span></div>}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3">Career Goals</h3>
            <p className="text-sm text-muted-foreground">{profile?.career_goals || 'No career goals set'}</p>
            <h3 className="text-sm font-semibold mt-4 mb-3">Skills</h3>
            <div className="flex flex-wrap gap-1">
              {(profile?.skills || []).map((s, i) => <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>)}
            </div>
            <h3 className="text-sm font-semibold mt-4 mb-3">Certifications</h3>
            <div className="flex flex-wrap gap-1">
              {(profile?.certifications || []).map((c, i) => <Badge key={i} variant="outline" className="text-[10px]">{c.name || c}</Badge>)}
            </div>
          </Card>
        </div>
      )}

      {tab === 'timeline' && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Career Timeline</h3>
          <div className="space-y-3">
            {(pp.timeline || []).map((entry, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    entry.entry_type === 'milestone' ? 'bg-primary/10 text-primary' :
                    entry.entry_type === 'assignment' || entry.entry_type === 'knowledge_capture' ? 'bg-emerald-10 text-emerald-600' :
                    entry.entry_type === 'training' ? 'bg-violet-100 text-violet-600' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {entry.entry_type === 'milestone' ? <CheckCircle className="w-4 h-4" /> :
                     entry.entry_type === 'assignment' ? <Briefcase className="w-4 h-4" /> :
                     entry.entry_type === 'training' ? <GraduationCap className="w-4 h-4" /> :
                     <FileText className="w-4 h-4" />}
                  </div>
                  {i < (pp.timeline || []).length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{entry.title}</p>
                    <Badge variant="outline" className="text-[9px]">{entry.entry_type.replace(/_/g, ' ')}</Badge>
                  </div>
                  {entry.description && <p className="text-xs text-muted-foreground mb-1">{entry.description}</p>}
                  {entry.client_name && <p className="text-xs text-muted-foreground">Client: {entry.client_name}</p>}
                  <p className="text-[10px] text-muted-foreground">{new Date(entry.entry_date).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {(pp.timeline || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No timeline entries yet</p>}
          </div>
        </Card>
      )}

      {tab === 'knowledge' && (
        <div className="space-y-4">
          {(pp.assignments || []).filter(a => a.what_worked || a.what_failed || a.what_was_learned).map((entry, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-semibold">{entry.title}</p>
                <Badge variant="secondary" className="text-[10px] ml-auto">{entry.client_name || 'N/A'}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {entry.what_worked && <div className="p-2 bg-emerald-50 rounded border border-emerald-100"><strong className="text-emerald-700">What Worked:</strong> <span className="text-emerald-800">{entry.what_worked}</span></div>}
                {entry.what_failed && <div className="p-2 bg-red-50 rounded border border-red-100"><strong className="text-red-700">What Failed:</strong> <span className="text-red-800">{entry.what_failed}</span></div>}
                {entry.what_was_learned && <div className="p-2 bg-blue-50 rounded border border-blue-100"><strong className="text-blue-700">What Was Learned:</strong> <span className="text-blue-800">{entry.what_was_learned}</span></div>}
                {entry.what_nc_should_remember && <div className="p-2 bg-violet-50 rounded border border-violet-100"><strong className="text-violet-700">NC Should Remember:</strong> <span className="text-violet-800">{entry.what_nc_should_remember}</span></div>}
                {entry.suggested_improvements && <div className="p-2 bg-amber-50 rounded border border-amber-100"><strong className="text-amber-700">Suggested Improvements:</strong> <span className="text-amber-800">{entry.suggested_improvements}</span></div>}
              </div>
              {entry.knowledge_stored && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Stored in Enterprise Memory, Development Memory, Knowledge Graph{entry.training_library_id ? ', Training Library' : ''}
                </div>
              )}
            </Card>
          ))}
          {(pp.assignments || []).filter(a => a.what_worked || a.what_failed || a.what_was_learned).length === 0 && (
            <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">No knowledge captured yet</p></Card>
          )}
        </div>
      )}

      {tab === 'skills' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3">Skills Learned</h3>
            <div className="flex flex-wrap gap-2">
              {(pp.skills_learned || []).map((s, i) => <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>)}
              {(pp.skills_learned || []).length === 0 && <p className="text-sm text-muted-foreground">No skills recorded yet</p>}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3">Equipment Used</h3>
            <div className="flex flex-wrap gap-2">
              {(pp.equipment_used || []).map((e, i) => <Badge key={i} variant="outline" className="text-xs">{e}</Badge>)}
              {(pp.equipment_used || []).length === 0 && <p className="text-sm text-muted-foreground">No equipment recorded yet</p>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}