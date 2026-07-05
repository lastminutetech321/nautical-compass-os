import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingDown, TrendingUp, AlertTriangle, FileText } from 'lucide-react';

export function CFOReport({ report }) {
  if (!report) return null;
  const h = report.financial_health;

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-slate-900/50 border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Daily CFO Report</h3>
          <span className="text-xs text-slate-500">{report.report_date ? new Date(report.report_date).toLocaleDateString() : ''}</span>
        </div>
        <p className="text-sm text-slate-300 mb-4">{report.executive_summary}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded bg-slate-900/60">
            <div className="text-xs text-slate-400">Health Score</div>
            <div className={`text-xl font-bold ${h?.score >= 65 ? 'text-emerald-400' : h?.score >= 45 ? 'text-amber-400' : 'text-red-400'}`}>{h?.score}/100</div>
            <div className="text-xs text-slate-500 capitalize">{h?.status?.replace('_', ' ')}</div>
          </div>
          <div className="p-3 rounded bg-slate-900/60">
            <div className="text-xs text-slate-400">MRR / ARR</div>
            <div className="text-xl font-bold text-emerald-400">${(report.key_metrics?.mrr || 0).toLocaleString()}</div>
            <div className="text-xs text-slate-500">${(report.key_metrics?.arr || 0).toLocaleString()}/yr</div>
          </div>
          <div className="p-3 rounded bg-slate-900/60">
            <div className="text-xs text-slate-400">Runway</div>
            <div className="text-xl font-bold text-blue-400">{report.key_metrics?.runway_days || 0}d</div>
            <div className="text-xs text-slate-500">Burn: ${(report.key_metrics?.burn_rate || 0).toLocaleString()}/mo</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded bg-slate-900/60">
            <h4 className="text-xs font-semibold text-slate-400 mb-1">Revenue Analysis</h4>
            <p className="text-xs text-slate-300">{report.revenue_analysis}</p>
          </div>
          <div className="p-3 rounded bg-slate-900/60">
            <h4 className="text-xs font-semibold text-slate-400 mb-1">Expense Analysis</h4>
            <p className="text-xs text-slate-300">{report.expense_analysis}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4 bg-red-950/20 border-red-500/30">
          <h4 className="text-xs font-semibold text-red-300 mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Key Risks</h4>
          <ul className="text-xs text-slate-300 space-y-1">{report.key_risks?.map((r, i) => <li key={i}>• {r}</li>)}</ul>
        </Card>
        <Card className="p-4 bg-emerald-950/20 border-emerald-500/30">
          <h4 className="text-xs font-semibold text-emerald-300 mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Opportunities</h4>
          <ul className="text-xs text-slate-300 space-y-1">{report.opportunities?.map((r, i) => <li key={i}>• {r}</li>)}</ul>
        </Card>
        <Card className="p-4 bg-blue-950/20 border-blue-500/30">
          <h4 className="text-xs font-semibold text-blue-300 mb-2 flex items-center gap-1"><DollarSign className="w-3 h-3" />Recommended Actions</h4>
          <ul className="text-xs text-slate-300 space-y-1">{report.recommended_actions?.map((r, i) => <li key={i}>• {r}</li>)}</ul>
        </Card>
      </div>

      {report.founder_alerts?.length > 0 && (
        <Card className="p-4 bg-red-950/30 border-red-500/50">
          <h4 className="text-sm font-semibold text-red-300 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Founder Alerts</h4>
          <ul className="text-sm text-slate-200 space-y-1">{report.founder_alerts?.map((r, i) => <li key={i}>• {r}</li>)}</ul>
        </Card>
      )}
    </div>
  );
}

export function WeeklyBriefing({ briefing }) {
  if (!briefing) return null;
  return (
    <Card className="p-4 bg-slate-900/50 border-slate-800">
      <h3 className="text-sm font-semibold text-white mb-3">Weekly Financial Briefing</h3>
      <p className="text-sm text-slate-300 mb-4">{briefing.week_summary}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <h4 className="text-xs font-semibold text-emerald-400 mb-1">Key Wins</h4>
          <ul className="text-xs text-slate-300 space-y-1">{briefing.key_wins?.map((r, i) => <li key={i}>• {r}</li>)}</ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-red-400 mb-1">Key Concerns</h4>
          <ul className="text-xs text-slate-300 space-y-1">{briefing.key_concerns?.map((r, i) => <li key={i}>• {r}</li>)}</ul>
        </div>
      </div>
      <div className="mt-3 p-3 rounded bg-slate-900/60">
        <h4 className="text-xs font-semibold text-slate-400 mb-1">Trajectory</h4>
        <p className="text-xs text-slate-300">{briefing.trajectory}</p>
      </div>
      <div className="mt-3">
        <h4 className="text-xs font-semibold text-blue-400 mb-1">Focus Next Week</h4>
        <ul className="text-xs text-slate-300 space-y-1">{briefing.focus_next_week?.map((r, i) => <li key={i}>• {r}</li>)}</ul>
      </div>
    </Card>
  );
}