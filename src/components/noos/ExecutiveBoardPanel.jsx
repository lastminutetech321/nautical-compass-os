import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Crown, AlertTriangle, TrendingUp, Package, Zap,
  User, Star, DollarSign, Network, RefreshCw
} from "lucide-react";

export default function ExecutiveBoardPanel() {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await base44.entities.ExecutiveBoard.list('-created_date', 1);
      if (resp.length > 0) setBoard(resp[0]);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateBoard = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke('ncNOOS', { operation: 'executive_board' });
      load();
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading executive board...</div>;

  if (!board) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Crown className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">No board snapshot yet.</p>
          <Button onClick={generateBoard}><Crown className="h-4 w-4 mr-2" /> Generate Board Snapshot</Button>
        </CardContent>
      </Card>
    );
  }

  const Section = ({ icon: Icon, title, items, color }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className={`h-4 w-4 ${color || 'text-primary'}`} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items && items.length > 0 ? items.map((item, i) => (
          <div key={i} className="border rounded p-2 bg-muted/30">
            {item.title && <div className="font-medium text-sm">{item.title}</div>}
            {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
            {item.action && <p className="text-xs text-primary mt-1">{item.action}</p>}
            {item.what_it_unlocks && <p className="text-xs text-emerald-600 mt-1">Unlocks: {item.what_it_unlocks}</p>}
            {(item.priority || item.priority_score) && (
              <Badge variant="secondary" className="mt-1 text-xs">Priority: {item.priority || item.priority_score}</Badge>
            )}
          </div>
        )) : <p className="text-xs text-muted-foreground">None detected</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Crown className="h-5 w-5" /> Executive Board
          </h2>
          <p className="text-xs text-muted-foreground">
            Snapshot: {new Date(board.snapshot_date).toLocaleString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={generateBoard}>
          <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
        </Button>
      </div>

      {/* Org Readiness */}
      <Card className="bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Organizational Readiness Score</div>
              <div className="text-4xl font-bold">{board.org_readiness_score}%</div>
              <Badge variant="secondary" className="mt-1">{board.readiness_label}</Badge>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>{(board.department_health || []).length} departments tracked</div>
              <div>{(board.top_risks || []).length} active risks</div>
              <div>{(board.top_opportunities || []).length} opportunities</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Risks & Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section icon={AlertTriangle} title="Top Risks" items={board.top_risks} color="text-red-500" />
        <Section icon={TrendingUp} title="Top Opportunities" items={board.top_opportunities} color="text-emerald-500" />
      </div>

      {/* Standouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Package className="h-4 w-4" /> Most Valuable Project</CardTitle></CardHeader>
          <CardContent>
            {board.most_valuable_project ? (
              <div>
                <div className="font-medium text-sm">{board.most_valuable_project.name}</div>
                <div className="text-xs text-muted-foreground mt-1">Value: ${board.most_valuable_project.value?.toLocaleString() || 0}</div>
                <Badge variant="secondary" className="mt-2">{board.most_valuable_project.status}</Badge>
              </div>
            ) : <p className="text-xs text-muted-foreground">None</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Zap className="h-4 w-4 text-amber-500" /> Largest Bottleneck</CardTitle></CardHeader>
          <CardContent>
            {board.largest_bottleneck ? (
              <div>
                <div className="font-medium text-sm">{board.largest_bottleneck.title}</div>
                <p className="text-xs text-muted-foreground mt-1">{board.largest_bottleneck.description}</p>
                <Badge variant="destructive" className="mt-2">Priority: {board.largest_bottleneck.priority}</Badge>
              </div>
            ) : <p className="text-xs text-muted-foreground">None</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Star className="h-4 w-4 text-purple-500" /> Highest Performing AI</CardTitle></CardHeader>
          <CardContent>
            {board.highest_performing_ai ? (
              <div>
                <div className="font-medium text-sm">{board.highest_performing_ai.name}</div>
                <div className="text-xs text-muted-foreground mt-1">Performance: {board.highest_performing_ai.performance_score}</div>
                <div className="text-xs text-muted-foreground">Tasks completed: {board.highest_performing_ai.tasks_completed}</div>
              </div>
            ) : <p className="text-xs text-muted-foreground">None</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><DollarSign className="h-4 w-4 text-emerald-500" /> Biggest Revenue Opportunity</CardTitle></CardHeader>
          <CardContent>
            {board.biggest_revenue_opportunity ? (
              <div>
                <div className="font-medium text-sm">{board.biggest_revenue_opportunity.title}</div>
                <p className="text-xs text-primary mt-1">{board.biggest_revenue_opportunity.action}</p>
                <Badge variant="secondary" className="mt-2">Impact: {board.biggest_revenue_opportunity.revenue_impact}</Badge>
              </div>
            ) : <p className="text-xs text-muted-foreground">None</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-blue-500" /> Most Valuable Employee</CardTitle></CardHeader>
          <CardContent>
            {board.most_valuable_employee ? (
              <div>
                <div className="font-medium text-sm">{board.most_valuable_employee.name}</div>
                <p className="text-xs text-muted-foreground mt-1">{board.most_valuable_employee.note}</p>
              </div>
            ) : <p className="text-xs text-muted-foreground">None</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Network className="h-4 w-4 text-orange-500" /> Critical Dependencies</CardTitle></CardHeader>
          <CardContent>
            {(board.critical_dependencies || []).length > 0 ? (
              <div className="space-y-1">
                {board.critical_dependencies.slice(0, 3).map((dep, i) => (
                  <div key={i} className="text-xs">
                    <div className="font-medium">{dep.title}</div>
                    <Badge variant="destructive" className="mt-0.5">Priority: {dep.priority}</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground">None</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}