import React, { useState } from "react";
import { BookOpen, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";

const blueprints = [
  {
    name: "Legal Intake Platform",
    description: "Full client intake, case management, evidence vault, FOIA tracking, and legal issue spotter.",
    tags: ["legal", "evidence", "foia"],
    modules: ["Evidence Vault", "Case Timeline", "Witness Tracker", "Legal Issue Spotter", "FOIA Tracker", "Client Portal", "Document Library"],
    entities: ["Client", "Case", "Evidence", "FOIARequest", "LegalIssue", "Witness"],
    agents: ["Legal Research Agent", "FOIA Agent", "Evidence Review Agent"],
    complexity: "high"
  },
  {
    name: "Business Operating System",
    description: "Projects, clients, team, documents, AI assistant, activity tracking — a full enterprise OS.",
    tags: ["enterprise", "pm", "crm"],
    modules: ["Dashboard", "Projects", "Clients", "Team", "Documents", "AI Assistant", "Activity Log"],
    entities: ["Project", "Task", "Organization", "Contact", "TeamMember", "Document"],
    agents: ["Project Manager", "Business Operations Agent", "Documentation Writer"],
    complexity: "high"
  },
  {
    name: "Client Portal",
    description: "Secure external portal for clients to view project status, upload files, and communicate.",
    tags: ["client-facing", "portal"],
    modules: ["Client Dashboard", "Project View", "File Upload", "Messaging", "Invoicing"],
    entities: ["Organization", "Project", "Document", "Message", "Invoice"],
    agents: ["Business Operations Agent"],
    complexity: "medium"
  },
  {
    name: "Workforce Portal",
    description: "Internal HR, team scheduling, onboarding, and performance management.",
    tags: ["hr", "team", "internal"],
    modules: ["Team Directory", "Onboarding", "Scheduling", "Reviews", "Documents"],
    entities: ["TeamMember", "OnboardingTask", "Review", "Schedule"],
    agents: ["Project Manager", "Documentation Writer"],
    complexity: "medium"
  },
  {
    name: "Music Platform",
    description: "Artist profiles, track management, releases, royalty tracking, and fan engagement.",
    tags: ["entertainment", "media"],
    modules: ["Artist Profiles", "Catalog", "Releases", "Royalties", "Fan CRM"],
    entities: ["Artist", "Track", "Album", "Release", "Royalty", "Fan"],
    agents: ["Business Operations Agent"],
    complexity: "medium"
  },
  {
    name: "Evidence Review System",
    description: "Standalone evidence collection, video review, chain-of-custody, and reporting platform.",
    tags: ["legal", "evidence", "forensics"],
    modules: ["Evidence Vault", "Video Review", "Case Timeline", "Witness Tracker", "Reporting"],
    entities: ["Evidence", "VideoEvidence", "CaseTimeline", "Witness"],
    agents: ["Evidence Review Agent"],
    complexity: "high"
  },
  {
    name: "FOIA Tracker",
    description: "Manage public records requests, deadlines, agency responses, and evidence linking.",
    tags: ["legal", "foia", "compliance"],
    modules: ["FOIA Request Builder", "Deadline Tracker", "Evidence Vault", "Document Library"],
    entities: ["FOIARequest", "Evidence", "Document"],
    agents: ["FOIA Agent"],
    complexity: "low"
  },
  {
    name: "CRM",
    description: "Contacts, organizations, pipeline management, activity tracking, and reporting.",
    tags: ["sales", "crm"],
    modules: ["Contacts", "Organizations", "Pipeline", "Activities", "Reports"],
    entities: ["Contact", "Organization", "Deal", "Activity"],
    agents: ["Business Operations Agent"],
    complexity: "medium"
  },
  {
    name: "SaaS Subscription Platform",
    description: "User onboarding, subscription billing, feature flags, usage tracking, and analytics.",
    tags: ["saas", "billing", "payments"],
    modules: ["Auth", "Billing", "Dashboard", "Feature Flags", "Analytics", "Admin"],
    entities: ["User", "Subscription", "Plan", "Usage", "Invoice"],
    agents: ["Business Operations Agent", "QA / Testing Agent"],
    complexity: "high"
  },
  {
    name: "AI Chat Application",
    description: "Multi-agent conversation UI, context injection, memory, and tool integrations.",
    tags: ["ai", "chat"],
    modules: ["Chat Interface", "Agent Center", "Capability Registry", "Conversation History"],
    entities: ["Conversation", "Message", "AgentProfile", "Memory"],
    agents: ["Chief Architect", "Feature Builder Agent"],
    complexity: "medium"
  },
];

const complexityColors = { low: "bg-emerald-50 text-emerald-700 border-emerald-200", medium: "bg-amber-50 text-amber-700 border-amber-200", high: "bg-red-50 text-red-700 border-red-200" };

export default function BlueprintLibrary() {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <PageHeader title="Blueprint Library" subtitle="Platform templates ready to build or extend" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {blueprints.map(bp => (
          <Card key={bp.name} className="p-5 border border-border/60 hover:shadow-md transition-all cursor-pointer" onClick={() => setSelected(bp)}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="w-4 h-4 text-primary" /></div>
                <p className="text-sm font-semibold">{bp.name}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] border ${complexityColors[bp.complexity]}`}>{bp.complexity} complexity</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{bp.description}</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {bp.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px] px-1.5">{t}</Badge>)}
            </div>
            <Button variant="ghost" size="sm" className="text-xs px-0 text-primary h-auto">View Blueprint <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-4 h-4" />{selected.name}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">{selected.description}</p>
            <div className="space-y-4 mt-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Modules</p>
                <div className="flex flex-wrap gap-1">{selected.modules.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}</div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Database Entities</p>
                <div className="flex flex-wrap gap-1">{selected.entities.map(e => <Badge key={e} variant="secondary" className="text-xs bg-primary/5">{e}</Badge>)}</div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Recommended Agents</p>
                <div className="flex flex-wrap gap-1">{selected.agents.map(a => <Badge key={a} className="text-xs bg-violet-50 text-violet-700 border border-violet-200">{a}</Badge>)}</div>
              </div>
              <Badge variant="outline" className={`text-xs border ${complexityColors[selected.complexity]}`}>{selected.complexity} complexity build</Badge>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}