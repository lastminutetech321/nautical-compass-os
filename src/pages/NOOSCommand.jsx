import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Building2, Crown, Zap, Network, RefreshCw, AlertTriangle,
  CheckCircle2, TrendingUp, Brain, Users, Activity, Sparkles,
  ArrowRight, Layers, Shield
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

import DepartmentGrid from "@/components/noos/DepartmentGrid";
import ExecutiveBoardPanel from "@/components/noos/ExecutiveBoardPanel";
import OrgIntelligencePanel from "@/components/noos/OrgIntelligencePanel";
import OrgMemoryPanel from "@/components/noos/OrgMemoryPanel";
import DependencyMapPanel from "@/components/noos/DependencyMapPanel";
import DailyBriefingPanel from "@/components/noos/DailyBriefingPanel";

export default function NOOSCommand() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [activeTab, setActiveTab] = useState("board");

  const loadOverview = useCallback(async () => {
    try {
      const resp = await base44.functions.invoke('ncNOOS', { operation: 'overview' });
      setOverview(resp.data);
    } catch (e) {
      // ignore
    }
  }, []);

  const loadReadiness = useCallback(async () => {
    try {
      const resp = await base44.functions.invoke('ncNOOS', { operation: 'org_readiness' });
      setReadiness(resp.data);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadOverview();
    loadReadiness();
  }, [loadOverview, loadReadiness]);

  const handleInit = async () => {
    setLoading(true);
    try {
      const resp = await base44.functions.invoke('ncNOOS', { operation: 'init' });
      toast({ title: "NOOS Initialized", description: resp.data.message });
      loadOverview();
    } catch (e) {
      toast({ title: "Init failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      const resp = await base44.functions.invoke('ncNOOS', { operation: 'evaluate_health' });
      toast({ title: "Health Evaluated", description: `${resp.data.departments_evaluated} departments scored` });
      loadReadiness();
    } catch (e) {
      toast({ title: "Evaluation failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleBoard = async () => {
    setLoading(true);
    try {
      const resp = await base44.functions.invoke('ncNOOS', { operation: 'executive_board' });
      toast({ title: "Board Snapshot Generated", description: `${resp.data.departments} departments, readiness: ${resp.data.org_readiness_score}%` });
    } catch (e) {
      toast({ title: "Board generation failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const readinessColor = (score) => {
    if (score >= 75) return "text-emerald-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            NC Operations & Organizational OS
          </h1>
          <p className="text-muted-foreground mt-1">
            The operating system that turns every module into one intelligent organization
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleInit} disabled={loading}>
            <Sparkles className="h-4 w-4 mr-2" /> Initialize NOOS
          </Button>
          <Button variant="outline" onClick={handleEvaluate} disabled={loading}>
            <Activity className="h-4 w-4 mr-2" /> Evaluate Health
          </Button>
          <Button variant="outline" onClick={handleBoard} disabled={loading}>
            <Crown className="h-4 w-4 mr-2" /> Board Snapshot
          </Button>
        </div>
      </div>

      {/* Readiness + Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" /> Organizational Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            {readiness ? (
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <span className={`text-4xl font-bold ${readinessColor(readiness.overall_score)}`}>
                      {readiness.overall_score}%
                    </span>
                    <Badge variant="secondary" className="ml-2">{readiness.label}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {readiness.remaining_to_self_managing}% to self-managing
                  </span>
                </div>
                <Progress value={readiness.overall_score} className="h-3" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {readiness.dimensions?.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold">{d.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Loading readiness...</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Departments</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview?.departments || 0}</div>
            <p className="text-xs text-muted-foreground">Organizational units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">AI Executives</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-1">
              <Brain className="h-6 w-6 text-primary" /> {overview?.ai_executives || 0}
            </div>
            <p className="text-xs text-muted-foreground">C-suite coordinators</p>
          </CardContent>
        </Card>
      </div>

      {overview?.status === 'not_initialized' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">NOOS not initialized</p>
              <p className="text-sm text-amber-700">Click "Initialize NOOS" to seed departments and AI executives.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="board" className="text-xs"><Crown className="h-3 w-3 mr-1" />Board</TabsTrigger>
          <TabsTrigger value="departments" className="text-xs"><Building2 className="h-3 w-3 mr-1" />Depts</TabsTrigger>
          <TabsTrigger value="intelligence" className="text-xs"><Brain className="h-3 w-3 mr-1" />Intel</TabsTrigger>
          <TabsTrigger value="memory" className="text-xs"><Layers className="h-3 w-3 mr-1" />Memory</TabsTrigger>
          <TabsTrigger value="deps" className="text-xs"><Network className="h-3 w-3 mr-1" />Deps</TabsTrigger>
          <TabsTrigger value="briefing" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />Briefing</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4">
          <ExecutiveBoardPanel />
        </TabsContent>
        <TabsContent value="departments" className="mt-4">
          <DepartmentGrid />
        </TabsContent>
        <TabsContent value="intelligence" className="mt-4">
          <OrgIntelligencePanel />
        </TabsContent>
        <TabsContent value="memory" className="mt-4">
          <OrgMemoryPanel />
        </TabsContent>
        <TabsContent value="deps" className="mt-4">
          <DependencyMapPanel />
        </TabsContent>
        <TabsContent value="briefing" className="mt-4">
          <DailyBriefingPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}