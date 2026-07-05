import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles, RefreshCw, AlertTriangle, TrendingUp, Building2,
  DollarSign, Bot, BookOpen, Target, Users
} from "lucide-react";

export default function DailyBriefingPanel() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await base44.functions.invoke('ncNOOS', { operation: 'daily_briefing' });
      setBriefing(resp.data.briefing);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Generating daily briefing...</div>;

  if (!briefing) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Unable to generate briefing.</p>
        </CardContent>
      </Card>
    );
  }

  const Section = ({ icon: Icon, title, items, renderItem, color }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className={`h-4 w-4 ${color || 'text-primary'}`} /> {title}
          {items?.length > 0 && <Badge variant="secondary" className="text-xs">{items.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items && items.length > 0 ? items.map((item, i) => renderItem ? renderItem(item, i) : (
          <div key={i} className="border rounded p-2 bg-muted/30 text-xs">
            {item.title && <div className="font-medium">{item.title}</div>}
            {item.action && <p className="text-primary mt-0.5">{item.action}</p>}
            {item.customer && <div className="font-medium">{item.customer}</div>}
            {item.reason && <p className="text-muted-foreground">{item.reason}</p>}
            {item.name && <div className="font-medium">{item.name}</div>}
            {item.issue && <p className="text-muted-foreground">{item.issue}</p>}
            {item.level && <Badge variant="destructive" className="text-xs mt-1">{item.level}</Badge>}
            {item.risk && <Badge variant={item.risk === 'critical' || item.risk === 'high' ? 'destructive' : 'secondary'} className="text-xs mt-1">{item.risk}</Badge>}
            {item.priority && <Badge variant="secondary" className="text-xs ml-1">Priority: {item.priority}</Badge>}
            {item.severity && <Badge variant="destructive" className="text-xs mt-1">{item.severity}</Badge>}
          </div>
        )) : <p className="text-xs text-muted-foreground">None today</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Founder Daily Briefing
          </h2>
          <p className="text-xs text-muted-foreground">{briefing.date}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
        </Button>
      </div>

      {/* Highest ROI Task */}
      {briefing.highest_roi_task && (
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Highest ROI Task Today</span>
            </div>
            <div className="font-semibold">{briefing.highest_roi_task.title}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="destructive">{briefing.highest_roi_task.priority}</Badge>
              {briefing.highest_roi_task.due && <Badge variant="secondary">Due: {briefing.highest_roi_task.due}</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section icon={Target} title="Today's Priorities" items={briefing.today_priorities} color="text-primary" />
        <Section icon={AlertTriangle} title="Critical Risks" items={briefing.critical_risks} color="text-red-500" />
        <Section icon={DollarSign} title="Revenue Opportunities" items={briefing.revenue_opportunities} color="text-emerald-500" />
        <Section icon={Building2} title="Departments Needing Attention" items={briefing.departments_needing_attention} color="text-amber-500" />
        <Section icon={Users} title="Customers Needing Follow-up" items={briefing.customers_needing_followup} color="text-orange-500" />
        <Section icon={Bot} title="Automation Recommendations" items={briefing.automation_recommendations} color="text-purple-500" />
      </div>

      {/* Knowledge Gained */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-blue-500" /> Knowledge Gained Yesterday
          </CardTitle>
        </CardHeader>
        <CardContent>
          {briefing.knowledge_gained_yesterday?.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {briefing.knowledge_gained_yesterday.map((k, i) => (
                <li key={i} className="flex items-start gap-2">
                  <TrendingUp className="h-3 w-3 text-emerald-500 mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{k}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-muted-foreground">No new knowledge captured yesterday</p>}
        </CardContent>
      </Card>
    </div>
  );
}