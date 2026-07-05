import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Crown, AlertTriangle, CheckCircle, Clock, DollarSign, Zap,
  Shield, ArrowRight, Loader2, BookOpen, TrendingUp, Lock, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

const FOUNDER_ITEMS = [
  {
    id: "canon_population",
    priority: 1,
    title: "Populate NC Canon — Zero Verified Entries",
    category: "Legal Infrastructure",
    why_blocked: "Canon entries require verified legal authority that cannot be fabricated by AI. A licensed attorney or legal researcher must confirm accuracy.",
    what_is_required: [
      "Upload 42 U.S.C. § 1983 text via Canon Ingestion",
      "Upload 5 U.S.C. § 552 (FOIA) via Canon Ingestion",
      "Verify AI-drafted entries in Canon Review Queue",
      "Mark verified entries as Active",
    ],
    estimated_completion: "2-4 hours after you start",
    business_impact: "Unblocks JurisEngine, Legal Research Agent, FOIA Agent, and Civil Rights Agent",
    revenue_impact: 5000,
    ai_waiting: ["JurisEngine", "Canon Librarian Agent", "FOIA Agent", "Civil Rights Agent"],
    action_url: "/canon-population",
    action_label: "Go to Canon Population Hub",
    severity: "critical",
  },
  {
    id: "stripe_activation",
    priority: 2,
    title: "Activate Stripe — $0 MRR, Platform at Financial Risk",
    category: "Revenue Engine",
    why_blocked: "Payment processing requires legal/financial setup: Stripe Terms of Service acceptance, bank account linking, and business verification. Cannot be automated.",
    what_is_required: [
      "Install Base44 Payments / Stripe integration",
      "Verify business identity with Stripe",
      "Configure 3 subscription tiers (Starter $99, Professional $299, Enterprise $999)",
      "Share first payment link with a prospect",
    ],
    estimated_completion: "1-2 hours",
    business_impact: "Every day without revenue, the platform burns runway. First subscriber proves product-market fit.",
    revenue_impact: 499,
    ai_waiting: ["Revenue Survival Engine", "Subscription Agent"],
    action_url: "/business-platform",
    action_label: "Go to Business Platform",
    severity: "critical",
  },
  {
    id: "blocked_builds",
    priority: 3,
    title: "Resolve 3 Blocked Builds — JurisEngine, JurisEngine v1, Resource Compass",
    category: "Build Dependencies",
    why_blocked: "Build blockers require strategic decisions about which features are prerequisite and in what order they should be resolved.",
    what_is_required: [
      "Review each blocked build in Build Registry",
      "Decide if Canon population resolves JurisEngine blockers",
      "Determine if Resource Compass needs a new page built first",
      "Clear blocked_by list for each resolved build",
    ],
    estimated_completion: "30 minutes",
    business_impact: "3 blocked builds = 3 rails stalled. Directly delays revenue and platform readiness.",
    revenue_impact: 3000,
    ai_waiting: ["Dependency Resolution Engine", "Product Manager Agent"],
    action_url: "/dependency-engine",
    action_label: "Go to Dependency Engine",
    severity: "high",
  },
  {
    id: "survival_metrics",
    priority: 4,
    title: "Record First Survival Period — Runway Unknown",
    category: "Financial Survival",
    why_blocked: "Only you know the actual costs and cash position. AI cannot access your bank account or billing statements.",
    what_is_required: [
      "Enter monthly platform costs (Base44 subscription, AI API credits)",
      "Enter current cash on hand",
      "Enter any existing revenue",
      "Review auto-calculated runway",
    ],
    estimated_completion: "5 minutes",
    business_impact: "Without survival metrics, NCOS cannot calculate runway, prioritize correctly, or warn you before it's too late.",
    revenue_impact: 0,
    ai_waiting: ["Survival Engine", "Revenue Survival Mode"],
    action_url: "/self-governance",
    action_label: "Enter Survival Metrics",
    severity: "high",
  },
  {
    id: "enterprise_outreach",
    priority: 5,
    title: "Approve First Enterprise Demo Outreach",
    category: "Enterprise Sales",
    why_blocked: "Sending external communications to prospects requires founder approval — no agent can contact third parties without explicit approval.",
    what_is_required: [
      "Review AI-researched prospect list in Agent Work Queue",
      "Approve outreach to 1-2 qualified prospects",
      "Provide contact information or LinkedIn handle",
      "Approve personalized outreach draft",
    ],
    estimated_completion: "15 minutes to approve, then agent executes",
    business_impact: "First enterprise demo = first $999+/mo contract opportunity",
    revenue_impact: 999,
    ai_waiting: ["Product Manager Agent", "Revenue Survival Engine"],
    action_url: "/agent-queue",
    action_label: "Review Agent Research",
    severity: "medium",
  },
];

const severityStyle = {
  critical: "border-red-200 bg-red-50/30",
  high: "border-orange-200 bg-orange-50/30",
  medium: "border-amber-200 bg-amber-50/30",
};

const severityBadge = {
  critical: "text-red-700 border-red-300 bg-red-100",
  high: "text-orange-700 border-orange-300 bg-orange-100",
  medium: "text-amber-700 border-amber-300 bg-amber-100",
};

export default function FounderActionPackage() {
  const [approvals, setApprovals] = useState([]);
  const [improvements, setImprovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [appr, imp] = await Promise.all([
      base44.entities.ApprovalGate.filter({ status: "pending" }, "-created_date", 20).catch(() => []),
      base44.entities.ImprovementItem.filter({ status: "queued", requires_approval: true }, "-created_date", 20).catch(() => []),
    ]);
    setApprovals(appr); setImprovements(imp);
    setLoading(false);
  };

  const totalRevenueUnlocked = FOUNDER_ITEMS.reduce((s, i) => s + i.revenue_impact, 0);
  const criticalCount = FOUNDER_ITEMS.filter(i => i.severity === "critical").length;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Executive Layer</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Crown className="w-6 h-6 text-amber-500" />Founder Action Package
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Everything that requires your decision. Nothing else. All AI systems waiting.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Critical Decisions", value: criticalCount, color: "text-red-600 bg-red-50", icon: AlertTriangle },
          { label: "Revenue Unlockable", value: `$${totalRevenueUnlocked.toLocaleString()}/mo`, color: "text-emerald-600 bg-emerald-50", icon: DollarSign },
          { label: "Pending Approvals", value: approvals.length, color: approvals.length > 0 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50", icon: Shield },
          { label: "AI Systems Waiting", value: FOUNDER_ITEMS.reduce((sum, i) => sum + i.ai_waiting.length, 0), color: "text-violet-600 bg-violet-50", icon: Zap },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-3.5 h-3.5" /></div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className="text-xl font-bold pl-9">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Action items */}
      <div className="space-y-4 mb-8">
        {FOUNDER_ITEMS.map((item, idx) => (
          <Card key={item.id} className={`p-5 border ${severityStyle[item.severity]}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.priority}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={`text-[9px] border ${severityBadge[item.severity]}`}>{item.severity.toUpperCase()}</Badge>
                    <Badge variant="outline" className="text-[9px]">{item.category}</Badge>
                    {item.revenue_impact > 0 && <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-300">+${item.revenue_impact.toLocaleString()}/mo if done</Badge>}
                  </div>
                  <h3 className="text-sm font-bold">{item.title}</h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Why AI Cannot Resolve This</p>
                <p className="text-xs text-muted-foreground bg-white border border-border/40 rounded p-2">{item.why_blocked}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">What You Need to Do</p>
                <ul className="space-y-1">
                  {item.what_is_required.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-primary font-bold flex-shrink-0">{i + 1}.</span>{req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-xs">
              <div className="p-2 bg-white border border-border/40 rounded">
                <p className="text-muted-foreground">Est. Time</p>
                <p className="font-semibold mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{item.estimated_completion}</p>
              </div>
              <div className="p-2 bg-white border border-border/40 rounded">
                <p className="text-muted-foreground">Business Impact</p>
                <p className="font-semibold mt-0.5 text-[11px]">{item.business_impact}</p>
              </div>
              <div className="p-2 bg-white border border-border/40 rounded col-span-2 md:col-span-1">
                <p className="text-muted-foreground">AI Systems Waiting</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {item.ai_waiting.map(a => <Badge key={a} variant="secondary" className="text-[9px]">{a}</Badge>)}
                </div>
              </div>
            </div>

            <Link to={item.action_url}>
              <Button size="sm" className="gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" />{item.action_label}
              </Button>
            </Link>
          </Card>
        ))}
      </div>

      {/* Pending approval gates */}
      {approvals.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-3 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />Pending Approval Gates ({approvals.length})</p>
          <div className="space-y-2">
            {approvals.map(gate => (
              <Card key={gate.id} className="p-4 border border-amber-200 bg-amber-50/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{gate.title}</p>
                    {gate.requesting_agent && <p className="text-xs text-muted-foreground">From: {gate.requesting_agent}</p>}
                    {gate.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gate.description}</p>}
                  </div>
                  <Link to="/self-governance">
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0">
                      <Shield className="w-3 h-3 mr-1" />Review
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}