import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Activity, Calendar, TrendingUp, Target, Rocket, Users, TrendingDown, Clock, Zap } from "lucide-react";
import DirectorMetrics from "@/components/director/DirectorMetrics";
import ApprovalPanel from "@/components/director/ApprovalPanel";
import { DailyBriefing, WeeklyRoadmap, MonthlyMilestones, RecommendedSprint, RecommendedStaffing, RecommendedPriorities } from "@/components/director/ReportSections";

const TABS = [
  { key: "briefing", label: "Daily Briefing", icon: Calendar },
  { key: "roadmap", label: "Weekly Roadmap", icon: TrendingUp },
  { key: "milestones", label: "Monthly Milestones", icon: Target },
  { key: "sprint", label: "Recommended Sprint", icon: Rocket },
  { key: "staffing", label: "Recommended Staffing", icon: Users },
  { key: "priorities", label: "Recommended Priorities", icon: Zap },
];

export default function NCProjectDirector() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("briefing");
  const [status, setStatus] = useState(null);

  const fetchLatest = async () => {
    setLoading(true);
    try {
      const [latestRes, statusRes] = await Promise.all([
        base44.functions.invoke('ncProjectDirector', { operation: 'latest', params: {} }),
        base44.functions.invoke('ncProjectDirector', { operation: 'status', params: {} }),
      ]);
      setReport(latestRes.data?.report || null);
      setStatus(statusRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchLatest(); }, []);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await base44.functions.invoke('ncProjectDirector', { operation: 'evaluate', params: {} });
      setReport(res.data?.report || null);
      setStatus(null);
      fetchLatest();
    } catch (e) { console.error(e); }
    setEvaluating(false);
  };

  const handleApprove = async () => {
    if (!report) return;
    setProcessing(true);
    try {
      await base44.functions.invoke('ncProjectDirector', {
        operation: 'approve',
        params: { report_id: report.id, approved_by: 'Founder' }
      });
      fetchLatest();
    } catch (e) { console.error(e); }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!report) return;
    setProcessing(true);
    try {
      await base44.functions.invoke('ncProjectDirector', {
        operation: 'reject',
        params: { report_id: report.id, reason: 'Founder reviewed and rejected recommendations' }
      });
      fetchLatest();
    } catch (e) { console.error(e); }
    setProcessing(false);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Executive Project Management</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-amber-600" />NC Project Director
          </h1>
          <p className="text-muted-foreground text-sm">
            AI Executive PM · Hourly evaluation · Founder approval required for all actions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status?.is_operational && (
            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />Operational
            </Badge>
          )}
          {status?.next_evaluation && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />Next: {new Date(status.next_evaluation).toLocaleTimeString()}
            </span>
          )}
          <Button onClick={handleEvaluate} size="sm" disabled={evaluating} className="bg-amber-600 hover:bg-amber-700 text-white">
            {evaluating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
            {evaluating ? "Evaluating…" : "Run Evaluation"}
          </Button>
        </div>
      </div>

      {/* Continuous Operation Banner */}
      <Card className="p-2.5 border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
        <div className="flex items-center gap-2 text-[10px] text-amber-700 dark:text-amber-400">
          <Activity className="w-3.5 h-3.5" />
          <span className="font-semibold">Continuous Operation:</span>
          <span>Evaluates every hour · Projects, deadlines, dependencies, resources, risks, cash flow, engineering velocity</span>
          <span className="text-red-600 font-semibold">· Never modifies production automatically</span>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !report ? (
        <Card className="p-8 text-center border border-dashed border-border/40">
          <Activity className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm font-semibold">No evaluations yet</p>
          <p className="text-xs text-muted-foreground mb-3">Run the first evaluation to generate executive outputs.</p>
          <Button size="sm" onClick={handleEvaluate} className="bg-amber-600 hover:bg-amber-700 text-white">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />Run First Evaluation
          </Button>
        </Card>
      ) : (
        <>
          {/* Metrics */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Latest Evaluation Metrics</p>
            <DirectorMetrics metrics={report.metrics_snapshot} />
          </div>

          {/* Approval Panel */}
          <ApprovalPanel
            report={report}
            onApprove={handleApprove}
            onReject={handleReject}
            isProcessing={processing}
          />

          {/* Tab Navigation */}
          <div className="flex gap-1.5 flex-wrap">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  activeTab === key ? 'bg-amber-600 text-white' : 'border border-border hover:bg-accent text-muted-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          {/* Active Tab Content */}
          <div>
            {activeTab === "briefing" && <DailyBriefing data={report.daily_briefing} />}
            {activeTab === "roadmap" && <WeeklyRoadmap data={report.weekly_roadmap} />}
            {activeTab === "milestones" && <MonthlyMilestones data={report.monthly_milestones} />}
            {activeTab === "sprint" && <RecommendedSprint data={report.recommended_sprint} />}
            {activeTab === "staffing" && <RecommendedStaffing data={report.recommended_staffing} />}
            {activeTab === "priorities" && <RecommendedPriorities data={report.recommended_priorities} />}
          </div>
        </>
      )}
    </div>
  );
}