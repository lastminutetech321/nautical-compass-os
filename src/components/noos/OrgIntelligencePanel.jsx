import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";

const QUESTION_ICONS = {
  what_we_are_learning: Brain,
  what_keeps_repeating: RefreshCw,
  what_creates_most_value: TrendingUp,
  what_wastes_most_time: TrendingDown,
  what_should_automate_next: Brain,
  what_should_delegate: Brain,
  what_should_remove: Brain
};

const trendIcon = (trend) => {
  if (trend === 'increasing') return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (trend === 'declining') return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

export default function OrgIntelligencePanel() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await base44.entities.OrgIntelligenceEntry.list('-created_date', 10);
      setEntries(items);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke('ncNOOS', { operation: 'org_intelligence' });
      load();
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5" /> Organizational Intelligence
          </h2>
          <p className="text-xs text-muted-foreground">The living layer that continuously answers what NC should do next</p>
        </div>
        <Button variant="outline" size="sm" onClick={generate}>
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh Intelligence
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Analyzing organization...</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No intelligence entries yet.</p>
            <Button onClick={generate}><Brain className="h-4 w-4 mr-2" /> Generate Intelligence</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((entry) => {
            const Icon = QUESTION_ICONS[entry.question_key] || Brain;
            return (
              <Card key={entry.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Icon className="h-4 w-4 text-primary" />
                      {entry.question_text}
                    </CardTitle>
                    {trendIcon(entry.trend)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{entry.answer}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="font-semibold">{entry.confidence}%</span>
                    </div>
                    {(entry.recommended_actions || []).length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {entry.recommended_actions.length} actions
                      </Badge>
                    )}
                  </div>
                  {(entry.recommended_actions || []).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {entry.recommended_actions.slice(0, 2).map((a, i) => (
                        <div key={i} className="text-xs text-primary flex items-start gap-1">
                          <span>→</span> <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}