import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Loader2, Plus, Briefcase, ChevronUp, ChevronDown, Award,
  Shield, DollarSign, TrendingUp, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";

const AV_PRODUCTION_TEMPLATE = {
  name: "AV Production",
  industry_type: "av_production",
  description: "Audio-visual production career path — from entry-level explorer to operations director",
  icon: "Briefcase",
  levels: [
    {
      level_name: "Explorer", level_order: 0,
      description: "Entry point — exploring AV production as a career",
      required_skills: ["Basic interest in AV"],
      required_training: ["NC Orientation", "Safety Basics 101"],
      required_certifications: [],
      min_readiness_score: 20,
      suggested_pay_range_min: 0, suggested_pay_range_max: 0,
      suggested_pay_rate_type: "hourly",
      promotion_requirements: ["Complete orientation", "Pass basic safety training"],
      safety_requirements: ["Complete Safety Basics 101"],
      typical_responsibilities: ["Observe and learn", "Assist with basic setup tasks"]
    },
    {
      level_name: "Apprentice", level_order: 1,
      description: "Learning fundamentals of AV production",
      required_skills: ["Basic cable management", "Equipment identification"],
      required_training: ["AV Fundamentals", "Cable Management 101", "Safety Basics 101"],
      required_certifications: ["OSHA 10"],
      min_readiness_score: 35,
      suggested_pay_range_min: 15, suggested_pay_range_max: 18,
      suggested_pay_rate_type: "hourly",
      promotion_requirements: ["Complete all training modules", "Pass assessment with 70%+", "Mentor recommendation"],
      safety_requirements: ["OSHA 10 certified", "Complete PPE training"],
      typical_responsibilities: ["Cable running", "Basic equipment setup", "Assist technicians"]
    },
    {
      level_name: "Insurance Stagehand", level_order: 2,
      description: "Insured stagehand — cleared for paid event work",
      required_skills: ["Stage setup", "Equipment loading", "Basic rigging awareness"],
      required_training: ["Stage Setup", "Load-In/Load-Out Procedures", "Event Safety"],
      required_certifications: ["OSHA 10", "Stagehand Insurance Coverage"],
      min_readiness_score: 45,
      suggested_pay_range_min: 18, suggested_pay_range_max: 22,
      suggested_pay_rate_type: "hourly",
      promotion_requirements: ["Complete 10 events", "Zero safety incidents", "Supervisor recommendation"],
      safety_requirements: ["OSHA 10", "Active insurance", "PPE compliance"],
      typical_responsibilities: ["Stage construction", "Equipment loading", "Event setup and teardown"]
    },
    {
      level_name: "Stagehand", level_order: 3,
      description: "Experienced stagehand for regular event work",
      required_skills: ["Stage construction", "Audio setup basics", "Lighting setup basics", "Rigging fundamentals"],
      required_training: ["Audio Basics", "Lighting Basics", "Rigging Fundamentals", "Advanced Event Safety"],
      required_certifications: ["OSHA 10", "Stagehand Insurance", "Rigging Awareness"],
      min_readiness_score: 55,
      suggested_pay_range_min: 22, suggested_pay_range_max: 28,
      suggested_pay_rate_type: "hourly",
      promotion_requirements: ["Complete 25 events", "Demonstrate audio/lighting basics", "Mentor sign-off"],
      safety_requirements: ["OSHA 10", "Rigging awareness", "Fall protection training"],
      typical_responsibilities: ["Full stage setup", "Audio and lighting assistance", "Equipment operation"]
    },
    {
      level_name: "Technician", level_order: 4,
      description: "Certified technician — operates AV equipment independently",
      required_skills: ["Audio mixing", "Lighting console operation", "Video switching", "Signal flow"],
      required_training: ["Audio Engineering 101", "Lighting Console Operation", "Video Production Basics"],
      required_certifications: ["OSHA 30", "AV Technician Certification", "First Aid/CPR"],
      min_readiness_score: 65,
      suggested_pay_range_min: 28, suggested_pay_range_max: 38,
      suggested_pay_rate_type: "hourly",
      promotion_requirements: ["Complete 50 events", "Pass technical assessment", "Customer satisfaction 85%+"],
      safety_requirements: ["OSHA 30", "First Aid/CPR", "Electrical safety"],
      typical_responsibilities: ["Operate audio consoles", "Program lighting", "Manage video switchers", "Lead small crews"]
    },
    {
      level_name: "Lead Technician", level_order: 5,
      description: "Senior technician — leads technical execution",
      required_skills: ["Advanced audio mixing", "Advanced lighting design", "System troubleshooting", "Client communication"],
      required_training: ["Advanced Audio Engineering", "Lighting Design", "System Integration", "Client Management"],
      required_certifications: ["OSHA 30", "Advanced AV Certification", "First Aid/CPR", "Electrical Safety"],
      min_readiness_score: 75,
      suggested_pay_range_min: 38, suggested_pay_range_max: 50,
      suggested_pay_rate_type: "hourly",
      promotion_requirements: ["Complete 100 events", "Lead 25+ events", "Train junior technicians", "Director recommendation"],
      safety_requirements: ["OSHA 30", "Advanced electrical safety", "Crew safety management"],
      typical_responsibilities: ["Lead technical setup", "Manage equipment inventory", "Train junior staff", "Client liaison"]
    },
    {
      level_name: "Crew Lead", level_order: 6,
      description: "Manages crew on-site — coordinates multiple technicians",
      required_skills: ["Crew management", "Project planning", "Equipment coordination", "Problem-solving"],
      required_training: ["Crew Leadership", "Project Management Basics", "Conflict Resolution", "Emergency Response"],
      required_certifications: ["OSHA 30", "Crew Leadership Certification", "First Aid/CPR", "Emergency Response"],
      min_readiness_score: 80,
      suggested_pay_range_min: 50, suggested_pay_range_max: 65,
      suggested_pay_rate_type: "hourly",
      promotion_requirements: ["Lead 50+ events as Lead Tech", "Demonstrate crew management", "Complete leadership training"],
      safety_requirements: ["OSHA 30", "Crew safety management", "Emergency response certified"],
      typical_responsibilities: ["Manage on-site crew", "Coordinate equipment", "Ensure safety compliance", "Report to Project Manager"]
    },
    {
      level_name: "Project Manager", level_order: 7,
      description: "Manages full projects — from planning to execution",
      required_skills: ["Project management", "Budget management", "Client relations", "Vendor coordination", "Risk management"],
      required_training: ["Project Management Professional", "Budget Management", "Contract Management", "Advanced Safety Management"],
      required_certifications: ["PMP or equivalent", "OSHA 30", "Advanced Safety Management"],
      min_readiness_score: 85,
      suggested_pay_range_min: 65, suggested_pay_range_max: 90,
      suggested_pay_rate_type: "hourly",
      promotion_requirements: ["Manage 25+ full projects", "Budget adherence 95%+", "Client satisfaction 90%+", "Zero major incidents"],
      safety_requirements: ["Full safety management", "OSHA 30", "Risk assessment certified"],
      typical_responsibilities: ["Plan and execute projects", "Manage budgets", "Coordinate vendors", "Client relationship management"]
    },
    {
      level_name: "Operations Manager", level_order: 8,
      description: "Oversees multiple projects and crews",
      required_skills: ["Multi-project management", "Resource allocation", "Strategic planning", "Team development", "Financial management"],
      required_training: ["Operations Management", "Strategic Planning", "Financial Management", "Team Development"],
      required_certifications: ["Operations Management Certification", "PMP", "OSHA 30"],
      min_readiness_score: 90,
      suggested_pay_range_min: 90, suggested_pay_range_max: 120,
      suggested_pay_rate_type: "hourly",
      promotion_requirements: ["Manage operations for 1+ year", "Oversee 100+ projects", "Team retention 85%+", "Revenue targets met"],
      safety_requirements: ["Full safety oversight", "Compliance management"],
      typical_responsibilities: ["Oversee all operations", "Manage multiple PMs", "Strategic planning", "Team development"]
    },
    {
      level_name: "Director", level_order: 9,
      description: "Executive — sets strategy and vision for AV production",
      required_skills: ["Strategic leadership", "Business development", "Industry expertise", "Mentorship", "Vision"],
      required_training: ["Executive Leadership", "Business Strategy", "Industry Trends", "Mentorship Programs"],
      required_certifications: ["Executive Leadership Certification", "Industry Expert Recognition"],
      min_readiness_score: 95,
      suggested_pay_range_min: 120, suggested_pay_range_max: 200,
      suggested_pay_rate_type: "hourly",
      promotion_requirements: ["5+ years operations management", "Demonstrated leadership", "Founder approval", "Industry recognition"],
      safety_requirements: ["Full compliance oversight", "Governance participation"],
      typical_responsibilities: ["Set strategy and vision", "Lead executive team", "Drive business growth", "Mentor next generation"]
    }
  ],
  default_readiness_thresholds: {
    ready_for_work: 80,
    needs_training: 60,
    needs_mentor: 40,
    needs_compliance: 30
  },
  status: "active"
};

export default function IndustryTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncWorkforceGateway', { operation: 'get_industry_templates', params: {} });
      setTemplates(res.data?.templates || []);
      if (res.data?.templates?.length > 0) setSelectedTemplate(res.data.templates[0]);
    } catch (e) {
      // If no templates, show the AV Production template as seedable
      console.error(e);
    }
    setLoading(false);
  };

  const seedAVProduction = async () => {
    setCreating(true);
    try {
      await base44.functions.invoke('ncWorkforceGateway', {
        operation: 'create_industry_template',
        params: AV_PRODUCTION_TEMPLATE
      });
      loadTemplates();
      setShowCreate(false);
    } catch (e) { console.error(e); }
    setCreating(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Workforce Gateway</p>
          <h1 className="text-3xl font-bold tracking-tight">Industry Templates</h1>
          <p className="text-muted-foreground mt-1">Founder-configured career paths for unlimited industries</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />Seed AV Production Template
        </Button>
      </div>

      {/* Template Selector */}
      {templates.length === 0 ? (
        <Card className="p-8 text-center">
          <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">No industry templates yet. Seed the AV Production template to get started.</p>
          <Button onClick={seedAVProduction} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Seed AV Production Template
          </Button>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          {templates.map(t => (
            <button key={t.id} onClick={() => { setSelectedTemplate(t); setExpandedLevel(null); }}
              className={`px-4 py-2 rounded-lg border text-sm transition-colors ${selectedTemplate?.id === t.id ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:bg-muted'}`}>
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Template Detail */}
      {selectedTemplate && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">{selectedTemplate.name}</h2>
            <Badge variant="outline" className="text-[10px]">{selectedTemplate.industry_type}</Badge>
            <Badge variant="secondary" className="text-[10px]">{selectedTemplate.levels?.length || 0} levels</Badge>
            <Badge variant="outline" className="text-[10px] ml-auto">v{selectedTemplate.version || 1}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{selectedTemplate.description}</p>

          {/* Readiness Thresholds */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {(Object.entries(selectedTemplate.default_readiness_thresholds || {})).map(([k, v]) => (
              <div key={k} className="p-2 rounded-lg bg-muted/30 text-center">
                <p className="text-sm font-bold">{v}%</p>
                <p className="text-[9px] text-muted-foreground">{k.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>

          {/* Levels */}
          <div className="space-y-2">
            {selectedTemplate.levels?.sort((a, b) => a.level_order - b.level_order).map((level, i) => (
              <div key={i} className="border border-border/40 rounded-lg overflow-hidden">
                <button onClick={() => setExpandedLevel(expandedLevel === i ? null : i)}
                  className="flex items-center gap-3 w-full p-3 hover:bg-muted/30 transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{level.level_order}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{level.level_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{level.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-[10px]"><DollarSign className="w-2.5 h-2.5 mr-0.5" />{level.suggested_pay_range_min}-{level.suggested_pay_range_max}/{level.suggested_pay_rate_type}</Badge>
                    <Badge variant="secondary" className="text-[10px]">Min: {level.min_readiness_score}%</Badge>
                    {expandedLevel === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>
                {expandedLevel === i && (
                  <div className="p-4 bg-muted/20 border-t border-border/40 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Award className="w-3 h-3" />Required Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {level.required_skills?.map((s, j) => <Badge key={j} variant="secondary" className="text-[10px]">{s}</Badge>)}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Required Training</p>
                        <div className="flex flex-wrap gap-1">
                          {level.required_training?.map((t, j) => <Badge key={j} variant="outline" className="text-[10px]">{t}</Badge>)}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Shield className="w-3 h-3" />Required Certifications</p>
                        <div className="flex flex-wrap gap-1">
                          {level.required_certifications?.map((c, j) => <Badge key={j} variant="outline" className="text-[10px]">{c}</Badge>)}
                          {level.required_certifications?.length === 0 && <span className="text-[10px] text-muted-foreground">None required</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Shield className="w-3 h-3" />Safety Requirements</p>
                        <div className="flex flex-wrap gap-1">
                          {level.safety_requirements?.map((s, j) => <Badge key={j} variant="outline" className="text-[10px] text-red-600 border-red-200">{s}</Badge>)}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-1">Promotion Requirements</p>
                      <ul className="text-xs space-y-0.5">
                        {level.promotion_requirements?.map((r, j) => <li key={j} className="flex items-start gap-1"><span className="text-primary">→</span>{r}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-1">Typical Responsibilities</p>
                      <ul className="text-xs space-y-0.5">
                        {level.typical_responsibilities?.map((r, j) => <li key={j} className="flex items-start gap-1"><span className="text-muted-foreground">•</span>{r}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Seed Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seed AV Production Template</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">This will create the AV Production industry template with 10 career levels, from Explorer to Director. Each level includes required skills, training, certifications, pay ranges, promotion requirements, and safety requirements.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={seedAVProduction} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}