import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, HelpCircle, AlertCircle, CheckCircle2 } from "lucide-react";

export default function OrgLearningPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncDirectorAssistant', { operation: 'getOrgLearning', params: { limit: 30 } });
      setData(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading) return <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground text-center">Loading organizational learning...</p></CardContent></Card>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            Organizational Learning is anonymously aggregated from all director interactions. Private member information is never exposed across users.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><HelpCircle className="w-4 h-4 text-blue-500" /> Frequently Asked Questions</CardTitle></CardHeader>
          <CardContent>
            {(data?.top_faqs || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No FAQ patterns detected yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.top_faqs.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate">{f.topic}</span>
                    <Badge variant="secondary" className="text-xs flex-shrink-0 ml-2">{f.count}x</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" /> Common Points of Confusion</CardTitle></CardHeader>
          <CardContent>
            {(data?.common_confusions || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No confusion patterns detected yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.common_confusions.map((c, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate">{c.topic}</span>
                    <Badge variant="secondary" className="text-xs flex-shrink-0 ml-2">{c.count}x</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Onboarding Patterns</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div><p className="text-2xl font-bold">{data?.onboarding_patterns?.success || 0}</p><p className="text-xs text-muted-foreground">Successful onboarding conversations</p></div>
            <div><p className="text-2xl font-bold">{data?.conversations_total || 0}</p><p className="text-xs text-muted-foreground">Total conversations</p></div>
          </div>
        </CardContent>
      </Card>

      {(data?.org_intelligence_entries || []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-violet-500" /> Organizational Intelligence Entries</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.org_intelligence_entries.slice(0, 10).map((e, i) => (
              <div key={e.id || i} className="border rounded-md p-2">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-xs capitalize">{e.insight_type?.replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-muted-foreground">{e.source}</span>
                </div>
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}