import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  DollarSign, TrendingUp, Users, AlertTriangle, CheckCircle,
  Loader2, Zap, Target, Clock, ArrowRight, BarChart3, RefreshCw,
  Star, Mail, Phone, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SUBSCRIPTION_PLANS = [
  { name: "Starter", price: 99, features: ["Decision Compass (10 queries/mo)", "Evidence Vault (5GB)", "Case Files (10 cases)", "Email Support"], target: "Solo practitioners, individuals" },
  { name: "Professional", price: 299, features: ["JurisEngine (50 queries/mo)", "Decision Compass (unlimited)", "Evidence Vault (50GB)", "Case Files (unlimited)", "FOIA Tracker", "Priority Support"], target: "Small law firms, nonprofits" },
  { name: "Enterprise", price: 999, features: ["All Professional features", "Custom Canon categories", "Multi-user (5 seats)", "API access", "SLA guarantee", "Dedicated onboarding"], target: "Law firms, legal aid orgs, enterprises" },
];

const REVENUE_OPPORTUNITIES = [
  { type: "subscription", title: "Activate Stripe & Create Subscription Plans", value: 499, timeline: "This week", description: "Set up Stripe, publish 3 tiers, share payment link", requires_founder: true, action: "Install Stripe" },
  { type: "enterprise", title: "First Enterprise Organization Demo", value: 2500, timeline: "2-4 weeks", description: "Identify one legal org, offer free 14-day trial, convert to Enterprise", requires_founder: true, action: "Identify Prospect" },
  { type: "upsell", title: "Starter → Professional Upsell Trigger", value: 200, timeline: "After first subscriber", description: "Auto-detect Starter users hitting query limits, offer Professional upgrade", requires_founder: false, action: "Auto-Setup" },
  { type: "referral", title: "Attorney Referral Program", value: 1000, timeline: "1 month", description: "Give attorneys 20% commission for referring clients. Track via ReferralRecord entity.", requires_founder: false, action: "Build Program" },
  { type: "trial", title: "14-Day Free Trial → Paid Conversion", value: 299, timeline: "Ongoing", description: "Every enterprise prospect gets free trial. Auto-follow-up on day 12.", requires_founder: false, action: "Configure" },
  { type: "invoice", title: "Invoice Follow-Up Automation", value: 0, timeline: "Immediate", description: "Auto-remind clients of open invoices at day 7, 14, 30", requires_founder: false, action: "Auto-Setup" },
];

export default function RevenueSurvivalMode() {
  const [subs, setSubs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [survival, setSurvival] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(null);
  const [actioned, setActioned] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [s, inv, surv, enterpriseOrgs] = await Promise.all([
      base44.entities.Subscription.filter({ status: "active" }).catch(() => []),
      base44.entities.Invoice.filter({ status: "open" }).catch(() => []),
      base44.entities.SurvivalMetric.list("-created_date", 1).catch(() => []),
      base44.entities.EnterpriseOrg.list("-created_date", 20).catch(() => []),
    ]);
    setSubs(s); setInvoices(inv);
    if (surv.length > 0) setSurvival(surv[0]);
    setOrgs(enterpriseOrgs);
    setLoading(false);
  };

  const totalMRR = subs.reduce((sum, s) => sum + (s.mrr || 0), 0);
  const totalUnpaid = invoices.reduce((sum, i) => sum + (i.amount_due || 0), 0);
  const monthlyCost = survival?.monthly_platform_cost || 200;
  const runway = survival?.cash_on_hand && monthlyCost > 0 ? ((survival.cash_on_hand - totalMRR) / Math.max(1, monthlyCost - totalMRR)).toFixed(1) : "∞";
  const breakEvenGap = Math.max(0, monthlyCost - totalMRR);

  const activateOpportunity = async (opp) => {
    setActivating(opp.title);
    if (!opp.requires_founder) {
      // Create agent task to execute
      await base44.entities.AgentTask.create({
        title: `Execute revenue opportunity: ${opp.title}`,
        description: opp.description,
        agent_name: "Product Manager Agent",
        task_type: "analyze",
        status: "queued",
        priority: "high",
      });
      await base44.entities.Notification.create({
        title: `Revenue Task Queued: ${opp.title}`,
        message: `Agent dispatched to execute: ${opp.description}. Estimated value: $${opp.value}/mo`,
        type: "info",
        severity: "medium",
        action_url: "/agent-queue",
        action_label: "View Task",
      });
    } else {
      // Create ApprovalGate
      await base44.entities.ApprovalGate.create({
        title: `Founder Approval: ${opp.title}`,
        description: `${opp.description}\n\nEstimated revenue impact: $${opp.value}/mo\nTimeline: ${opp.timeline}`,
        action_type: "spend_money",
        risk_level: "medium",
        status: "pending",
        requesting_agent: "Revenue Survival Engine",
        payload_summary: `Opportunity: ${opp.title}\nValue: $${opp.value}/mo\nTimeline: ${opp.timeline}`,
      });
    }
    setActioned(a => ({ ...a, [opp.title]: true }));
    setActivating(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Revenue Intelligence</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-emerald-500" />Revenue Survival Mode
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Continuously search for, activate, and grow every revenue stream.</p>
      </div>

      {/* Survival KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Current MRR", value: `$${totalMRR.toLocaleString()}`, sub: totalMRR === 0 ? "🚨 Critical" : "Monthly Recurring", color: totalMRR === 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50", icon: DollarSign },
          { label: "Break-Even Gap", value: `$${breakEvenGap.toLocaleString()}`, sub: `Need ${breakEvenGap > 0 ? `$${breakEvenGap}/mo more` : "Break-even!"}`, color: breakEvenGap > 0 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50", icon: Target },
          { label: "Unpaid Invoices", value: `$${totalUnpaid.toLocaleString()}`, sub: `${invoices.length} open`, color: totalUnpaid > 0 ? "text-orange-600 bg-orange-50" : "text-emerald-600 bg-emerald-50", icon: Clock },
          { label: "Active Subs", value: subs.length, sub: "Paying customers", color: subs.length === 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50", icon: Users },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-3.5 h-3.5" /></div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className="text-xl font-bold pl-9">{k.value}</p>
            <p className="text-[10px] text-muted-foreground pl-9 mt-0.5">{k.sub}</p>
          </Card>
        ))}
      </div>

      {/* Break-even progress */}
      {monthlyCost > 0 && (
        <Card className="p-4 border border-border/60 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase">Break-Even Progress</p>
            <span className="text-xs text-muted-foreground">Target: ${monthlyCost}/mo</span>
          </div>
          <Progress value={Math.min(100, Math.round((totalMRR / Math.max(1, monthlyCost)) * 100))} className="h-3 mb-2" />
          <p className="text-xs text-muted-foreground">${totalMRR}/mo of ${monthlyCost}/mo needed to break even</p>
        </Card>
      )}

      <Tabs defaultValue="opportunities">
        <TabsList className="mb-5">
          <TabsTrigger value="opportunities">Revenue Opportunities</TabsTrigger>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="enterprise">Enterprise Pipeline ({orgs.length})</TabsTrigger>
          <TabsTrigger value="invoices">Open Invoices ({invoices.length})</TabsTrigger>
        </TabsList>

        {/* OPPORTUNITIES */}
        <TabsContent value="opportunities">
          <div className="space-y-3">
            {REVENUE_OPPORTUNITIES.map(opp => (
              <Card key={opp.title} className={`p-4 border ${opp.requires_founder ? "border-amber-200 bg-amber-50/30" : "border-border/60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-[9px] capitalize">{opp.type}</Badge>
                      {opp.value > 0 && <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-300">+${opp.value}/mo</Badge>}
                      <span className="text-[10px] text-muted-foreground"><Clock className="w-2.5 h-2.5 inline mr-0.5" />{opp.timeline}</span>
                      {opp.requires_founder && <Badge className="text-[9px] bg-amber-100 text-amber-700 border border-amber-300">Founder Required</Badge>}
                    </div>
                    <p className="text-sm font-semibold">{opp.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opp.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {actioned[opp.title] ? (
                      <Badge className="text-[10px] bg-blue-100 text-blue-700 border border-blue-300">
                        <CheckCircle className="w-3 h-3 mr-1" />{opp.requires_founder ? "Escalated" : "Queued"}
                      </Badge>
                    ) : (
                      <Button size="sm" className="h-7 text-xs" onClick={() => activateOpportunity(opp)} disabled={!!activating}>
                        {activating === opp.title ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                        {opp.action}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SUBSCRIPTION PLANS */}
        <TabsContent value="plans">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />
            <strong>Stripe not yet activated.</strong> These plans are ready to publish once Stripe is installed. Contact support to install Base44 Payments.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SUBSCRIPTION_PLANS.map((plan, i) => (
              <Card key={plan.name} className={`p-5 border ${i === 1 ? "border-primary ring-1 ring-primary" : "border-border/60"}`}>
                {i === 1 && <Badge className="mb-3 text-[10px]">Most Popular</Badge>}
                <p className="text-lg font-bold">{plan.name}</p>
                <p className="text-3xl font-black mt-1">${plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">{plan.target}</p>
                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ENTERPRISE PIPELINE */}
        <TabsContent value="enterprise">
          {orgs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground mb-3">No enterprise organizations yet.</p>
              <p className="text-xs text-muted-foreground">Add enterprise prospects via the Enterprise Orgs panel to track the pipeline.</p>
              <Button size="sm" className="mt-3" onClick={async () => {
                await base44.entities.AgentTask.create({
                  title: "Research 5 enterprise law firm prospects for NCOS demo outreach",
                  description: "Research 5 law firms, legal aid organizations, or nonprofits that would benefit from NCOS legal platform. For each: name, size, pain points, contact approach, estimated contract value.",
                  agent_name: "Product Manager Agent",
                  task_type: "research",
                  status: "queued",
                  priority: "high",
                });
                alert("Research task dispatched to Product Manager Agent. Check Agent Work Queue.");
              }}>
                <Zap className="w-3.5 h-3.5 mr-1.5" />AI Research Enterprise Prospects
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {orgs.map(org => (
                <Card key={org.id} className="p-4 border border-border/60">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{org.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px]">{org.tier}</Badge>
                        <Badge variant="outline" className="text-[9px] capitalize">{org.status}</Badge>
                        {org.mrr > 0 && <span className="text-[10px] text-emerald-600 font-medium">${org.mrr}/mo MRR</span>}
                      </div>
                    </div>
                    {org.contract_end_date && new Date(org.contract_end_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                      <Badge className="text-[10px] bg-red-100 text-red-700 border border-red-300"><AlertTriangle className="w-3 h-3 mr-1" />Renew Soon</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* INVOICES */}
        <TabsContent value="invoices">
          {invoices.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
              <p className="text-sm text-muted-foreground">No open invoices. All accounts current.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map(inv => (
                <Card key={inv.id} className="p-4 border border-orange-200 bg-orange-50/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{inv.client_name || inv.description || "Invoice"}</p>
                      <p className="text-xs text-muted-foreground">{inv.invoice_number} · Due {inv.due_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-orange-600">${(inv.amount_due || 0).toLocaleString()}</p>
                      <Badge variant="outline" className="text-[9px] text-orange-600 border-orange-300">Open</Badge>
                    </div>
                  </div>
                </Card>
              ))}
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-semibold">Total Receivable</span>
                <span className="text-base font-bold text-orange-600">${totalUnpaid.toLocaleString()}</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}