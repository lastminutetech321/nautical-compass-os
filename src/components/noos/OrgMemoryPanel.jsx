import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, RefreshCw, FileText, BookOpen, AlertCircle, Lightbulb } from "lucide-react";

export default function OrgMemoryPanel() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await base44.entities.OrgMemoryProject.list('-created_date', 20);
      setMemories(items);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Layers className="h-5 w-5" /> Organizational Memory
        </h2>
        <p className="text-xs text-muted-foreground">Every completed project generates exec, tech, and business summaries with lessons and improvements</p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading memory...</div>
      ) : memories.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No project memories yet. Memories are auto-generated when projects complete.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {memories.map((mem) => (
            <Card key={mem.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{mem.project_name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Completed: {mem.completion_date ? new Date(mem.completion_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {mem.affected_departments?.slice(0, 3).map((d, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="border rounded p-2">
                    <div className="flex items-center gap-1 text-xs font-medium mb-1"><FileText className="h-3 w-3" /> Executive</div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{mem.executive_summary || 'N/A'}</p>
                  </div>
                  <div className="border rounded p-2">
                    <div className="flex items-center gap-1 text-xs font-medium mb-1"><BookOpen className="h-3 w-3" /> Technical</div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{mem.technical_summary || 'N/A'}</p>
                  </div>
                  <div className="border rounded p-2">
                    <div className="flex items-center gap-1 text-xs font-medium mb-1"><Layers className="h-3 w-3" /> Business</div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{mem.business_summary || 'N/A'}</p>
                  </div>
                </div>

                {(mem.lessons_learned || []).length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-xs font-medium mb-1"><Lightbulb className="h-3 w-3 text-amber-500" /> Lessons Learned</div>
                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                      {mem.lessons_learned.slice(0, 3).map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                  </div>
                )}

                {(mem.mistakes || []).length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-xs font-medium mb-1"><AlertCircle className="h-3 w-3 text-red-500" /> Mistakes</div>
                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                      {mem.mistakes.slice(0, 2).map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}

                {(mem.future_improvements || []).length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-xs font-medium mb-1"><RefreshCw className="h-3 w-3 text-emerald-500" /> Future Improvements</div>
                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                      {mem.future_improvements.slice(0, 3).map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t text-xs">
                  <span className="text-muted-foreground">Time: {mem.time_spent_hours || 0}h</span>
                  {mem.knowledge_stored && <Badge variant="secondary" className="text-xs">Knowledge Stored</Badge>}
                  {mem.departments_notified && <Badge variant="secondary" className="text-xs">Depts Notified</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}