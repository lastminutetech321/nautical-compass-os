import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Loader2, Users, UserPlus, GitBranch, Award, TrendingUp,
  AlertCircle, CheckCircle, Clock, ArrowRight, Briefcase,
  MapPin, Mail, Phone, FileText, Star
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";

const PIPELINE_STAGES = [
  { key: "interest", label: "Interest", icon: UserPlus, color: "text-blue-600 bg-blue-50" },
  { key: "profile", label: "Workforce Profile", icon: FileText, color: "text-cyan-600 bg-cyan-50" },
  { key: "assessment", label: "Assessment", icon: AlertCircle, color: "text-amber-600 bg-amber-50" },
  { key: "training", label: "Training", icon: Award, color: "text-violet-600 bg-violet-50" },
  { key: "compliance", label: "Compliance", icon: CheckCircle, color: "text-orange-600 bg-orange-50" },
  { key: "readiness", label: "Readiness", icon: TrendingUp, color: "text-teal-600 bg-teal-50" },
  { key: "mentor_assignment", label: "Mentor Assignment", icon: Users, color: "text-indigo-600 bg-indigo-50" },
  { key: "eligible", label: "Eligible for Work", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
  { key: "assignments", label: "Assignments", icon: Briefcase, color: "text-green-600 bg-green-50" },
  { key: "performance_review", label: "Performance Reviews", icon: Star, color: "text-yellow-600 bg-yellow-50" },
  { key: "career_advancement", label: "Career Advancement", icon: TrendingUp, color: "text-purple-600 bg-purple-50" }
];

export default function WorkforceGateway() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    city: "", state: "", industry_interests: [], desired_position: "",
    experience_level: "entry", years_experience: 0,
    skills: [], availability: "full_time",
    transportation: "none", preferred_travel_distance_miles: 25,
    career_goals: ""
  });

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncWorkforceGateway', { operation: 'dashboard', params: {} });
      setDashboard(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await base44.functions.invoke('ncWorkforceGateway', {
        operation: 'create_profile',
        params: {
          ...formData,
          industry_interests: formData.industry_interests,
          skills: formData.skills.length > 0 ? formData.skills : formData.desired_position ? [formData.desired_position] : []
        }
      });
      setShowApply(false);
      setFormData({ first_name: "", last_name: "", email: "", phone: "", city: "", state: "", industry_interests: [], desired_position: "", experience_level: "entry", years_experience: 0, skills: [], availability: "full_time", transportation: "none", preferred_travel_distance_miles: 25, career_goals: "" });
      loadDashboard();
    } catch (e) {
      console.error(e);
    }
    setApplying(false);
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
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Workforce Gateway</p>
          <h1 className="text-3xl font-bold tracking-tight">NC Workforce Gateway</h1>
          <p className="text-muted-foreground mt-1">The official entry point for anyone seeking work through Nautical Compass</p>
        </div>
        <div className="flex gap-2">
          <Link to="/workforce-director">
            <Button variant="outline" className="gap-2"><Users className="w-4 h-4" />Director Workspace</Button>
          </Link>
          <Link to="/workforce-templates">
            <Button variant="outline" className="gap-2"><GitBranch className="w-4 h-4" />Industry Templates</Button>
          </Link>
          <Dialog open={showApply} onOpenChange={setShowApply}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="w-4 h-4" />Enter Gateway</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Enter the NC Workforce Gateway</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">First Name *</Label>
                    <Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs">Last Name *</Label>
                    <Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Email *</Label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">City</Label>
                    <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs">State</Label>
                    <Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Desired Position</Label>
                  <Input value={formData.desired_position} onChange={e => setFormData({...formData, desired_position: e.target.value})} placeholder="e.g. AV Technician, Stagehand..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Experience Level</Label>
                    <Select value={formData.experience_level} onValueChange={v => setFormData({...formData, experience_level: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Years of Experience</Label>
                    <Input type="number" value={formData.years_experience} onChange={e => setFormData({...formData, years_experience: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Availability</Label>
                    <Select value={formData.availability} onValueChange={v => setFormData({...formData, availability: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="per_diem">Per Diem</SelectItem>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Transportation</Label>
                    <Select value={formData.transportation} onValueChange={v => setFormData({...formData, transportation: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal_vehicle">Personal Vehicle</SelectItem>
                        <SelectItem value="public_transit">Public Transit</SelectItem>
                        <SelectItem value="rideshare">Rideshare</SelectItem>
                        <SelectItem value="walking">Walking</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Preferred Travel Distance (miles)</Label>
                  <Input type="number" value={formData.preferred_travel_distance_miles} onChange={e => setFormData({...formData, preferred_travel_distance_miles: parseInt(e.target.value) || 25})} />
                </div>
                <div>
                  <Label className="text-xs">Skills (comma-separated)</Label>
                  <Input value={formData.skills.join(", ")} onChange={e => setFormData({...formData, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})} placeholder="Audio setup, lighting, rigging..." />
                </div>
                <div>
                  <Label className="text-xs">Career Goals</Label>
                  <Textarea value={formData.career_goals} onChange={e => setFormData({...formData, career_goals: e.target.value})} placeholder="What do you want to achieve?" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowApply(false)}>Cancel</Button>
                <Button onClick={handleApply} disabled={applying || !formData.first_name || !formData.last_name || !formData.email}>
                  {applying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Submit Application
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Workers", value: m.total_workers || 0, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "New Applicants", value: m.new_applicants || 0, icon: UserPlus, color: "text-cyan-600 bg-cyan-50" },
          { label: "In Training", value: m.in_training || 0, icon: Award, color: "text-violet-600 bg-violet-50" },
          { label: "Ready for Work", value: m.ready_for_assignments || 0, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
          { label: "Avg Readiness", value: `${m.avg_readiness || 0}/100`, icon: TrendingUp, color: "text-teal-600 bg-teal-50" },
          { label: "Avg Trust", value: `${m.avg_trust || 0}/100`, icon: Star, color: "text-amber-600 bg-amber-50" },
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

      {/* Career Pipeline Visualization */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Career Pipeline</h2>
          <Badge variant="outline" className="text-[10px] ml-auto">Founder-configurable</Badge>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {PIPELINE_STAGES.map((stage, i) => {
            const count = (dashboard?.new_applicants || []).filter(p => p.pipeline_stage === stage.key).length +
              (dashboard?.awaiting_onboarding || []).filter(p => p.pipeline_stage === stage.key).length +
              (dashboard?.ready_for_assignments || []).filter(p => p.pipeline_stage === stage.key).length;
            return (
              <React.Fragment key={stage.key}>
                <div className="flex flex-col items-center gap-1 min-w-[100px]">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stage.color}`}>
                    <stage.icon className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-medium text-center">{stage.label}</p>
                  {count > 0 && <Badge variant="secondary" className="text-[9px]">{count}</Badge>}
                </div>
                {i < PIPELINE_STAGES.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* New Applicants */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-cyan-500" />
          <h2 className="text-sm font-semibold">New Applicants</h2>
          <Badge variant="outline" className="text-[10px] ml-auto">{dashboard?.new_applicants?.length || 0}</Badge>
        </div>
        {(dashboard?.new_applicants || []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No new applicants</p>
        ) : (
          <div className="space-y-2">
            {(dashboard?.new_applicants || []).slice(0, 10).map(p => (
              <Link key={p.id} to={`/workforce-passport/${p.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{p.first_name?.[0]}{p.last_name?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.desired_position || 'No position specified'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-[10px]">{p.experience_level}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{p.pipeline_stage.replace(/_/g, ' ')}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Industry Templates */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-4 h-4 text-violet-500" />
          <h2 className="text-sm font-semibold">Industry Career Paths</h2>
          <Link to="/workforce-templates" className="ml-auto">
            <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">Manage Templates →</Badge>
          </Link>
        </div>
        {(dashboard?.industry_templates || []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No industry templates active</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(dashboard?.industry_templates || []).map(t => (
              <div key={t.id} className="p-3 rounded-lg border border-border/40 bg-muted/20">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.description || 'No description'}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Badge variant="outline" className="text-[10px]">{t.levels?.length || 0} levels</Badge>
                  <Badge variant="secondary" className="text-[10px]">{t.industry_type}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}