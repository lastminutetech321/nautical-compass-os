import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, TrendingUp, TrendingDown, Minus } from "lucide-react";

const LEVEL_COLORS = {
  building: 'text-amber-500',
  established: 'text-blue-500',
  strong: 'text-emerald-500',
  ambassador: 'text-violet-500',
};

export default function TrustScoreGauge() {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    try {
      const res = await base44.functions.invoke('ncDirectorAssistant', { operation: 'getDashboard' });
      setScores(res.data?.trust_scores || []);
    } catch (e) { console.error(e); }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
    if (trend === 'declining') return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Heart className="w-4 h-4 text-rose-500" /> Trust Scores</CardTitle></CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4 bg-muted p-3 rounded-md">
          Trust is built through clear answers, helpful resources, completed onboarding, voluntary returns, satisfaction, and goal achievement — never through subscription sales.
        </p>
        {scores.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No trust scores yet. Trust builds as directors have conversations and members complete milestones.</p>
        ) : (
          <div className="space-y-3">
            {scores.map((s, i) => (
              <div key={s.id || i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{s.entity_name || s.entity_id?.slice(-8)}</p>
                    {getTrendIcon(s.trust_trend)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs capitalize ${LEVEL_COLORS[s.trust_level] || ''}`}>{s.trust_level}</Badge>
                    <span className="text-lg font-bold">{s.trust_score}</span>
                  </div>
                </div>
                <Progress value={s.trust_score} className="h-1.5" />
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Q&A clear: {s.questions_answered_clearly || 0}</span>
                  <span>Resources: {s.resources_helpful || 0}</span>
                  <span>Returns: {s.voluntary_returns || 0}</span>
                  <span>Satisfaction: {s.satisfaction_reports || 0}</span>
                  <span>Goals: {s.goals_achieved || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}