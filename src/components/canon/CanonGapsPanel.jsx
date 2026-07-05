import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Upload, CheckCircle, ChevronRight, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const GAP_STATUS_STYLES = {
  not_imported: { label: "Not Imported",    classes: "bg-red-100 text-red-700 border-red-200" },
  partial:       { label: "Partial",         classes: "bg-amber-100 text-amber-700 border-amber-200" },
  pending_upload:{ label: "Pending Upload",  classes: "bg-blue-100 text-blue-700 border-blue-200" },
  imported:      { label: "Imported",        classes: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function CanonGapsPanel({ compact = false }) {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.CanonEntry.filter({ is_canon_gap: true }, "-created_date", 50)
      .then(data => { setGaps(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const notImported = gaps.filter(g => g.gap_import_status === "not_imported").length;
  const partial = gaps.filter(g => g.gap_import_status === "partial").length;

  if (loading) return null;
  if (gaps.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          <strong>{notImported} Canon gaps</strong> not imported · {partial} partial ·{" "}
          <Link to="/canon-ingestion" className="underline hover:text-amber-900">Open ingestion pipeline →</Link>
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Canon Gaps</h3>
          <Badge className="text-[10px] bg-red-100 text-red-700 border border-red-200">{notImported} not imported</Badge>
          {partial > 0 && <Badge className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200">{partial} partial</Badge>}
        </div>
        <Link to="/canon-ingestion">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
            <Upload className="w-3 h-3" />Upload Documents
          </Button>
        </Link>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Fabrication Prevention Active.</strong> AI services will not synthesize legal rules for these gaps.
          They will return a Canon Gap warning instead of invented law. Upload verified source documents to enable these areas.
        </span>
      </div>

      <div className="space-y-2">
        {gaps.map(gap => {
          const statusStyle = GAP_STATUS_STYLES[gap.gap_import_status] || GAP_STATUS_STYLES.not_imported;
          return (
            <div key={gap.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-muted/20">
              <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-xs font-semibold">{gap.title}</p>
                  <Badge variant="outline" className={`text-[9px] border ${statusStyle.classes}`}>{statusStyle.label}</Badge>
                </div>
                {gap.citation && <p className="text-[10px] text-muted-foreground mb-1">{gap.citation}</p>}
                {gap.gap_notes && (
                  <p className="text-[10px] text-muted-foreground italic">{gap.gap_notes}</p>
                )}
              </div>
              <Link to="/canon-ingestion" className="flex-shrink-0">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}