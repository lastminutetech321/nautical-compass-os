import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Code, Shield, Layout, Database, Zap, Eye, MessageSquare, CheckSquare, FileText, AlertTriangle, Lightbulb, CheckCircle2, Users } from "lucide-react";

const CATEGORY_META = {
  engineering: { icon: Code, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", label: "Engineering" },
  architecture: { icon: Layout, color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30", label: "Architecture" },
  security: { icon: Shield, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30", label: "Security" },
  ux: { icon: Eye, color: "text-pink-600", bg: "bg-pink-100 dark:bg-pink-900/30", label: "UX" },
  database: { icon: Database, color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/30", label: "Database" },
  performance: { icon: Zap, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", label: "Performance" },
  prompt: { icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", label: "Prompt" },
  testing: { icon: CheckSquare, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", label: "Testing" },
  documentation: { icon: FileText, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30", label: "Documentation" },
};

const DIFFICULTY_BADGE = {
  beginner: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  intermediate: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  advanced: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  expert: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default function LessonCard({ lesson, onAssign, compact }) {
  const meta = CATEGORY_META[lesson.category] || CATEGORY_META.engineering;

  return (
    <Card className={`p-3 border border-border/60 ${compact ? "" : "hover:border-primary/40 transition-colors"}`}>
      <div className="flex items-start gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${meta.bg} flex-shrink-0`}>
          <meta.icon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{lesson.title}</p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <Badge variant="outline" className={`text-[8px] ${meta.bg} ${meta.color} border-0`}>{meta.label}</Badge>
            <Badge className={`text-[8px] ${DIFFICULTY_BADGE[lesson.difficulty] || DIFFICULTY_BADGE.intermediate}`}>{lesson.difficulty}</Badge>
            {lesson.auto_generated && <Badge variant="outline" className="text-[8px] text-muted-foreground">Auto</Badge>}
          </div>
        </div>
      </div>
      {!compact && <p className="text-xs text-muted-foreground mb-2">{lesson.content}</p>}
      {!compact && lesson.key_takeaways && lesson.key_takeaways.length > 0 && (
        <div className="mb-2">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1"><Lightbulb className="w-2.5 h-2.5" />Key Takeaways</p>
          <ul className="space-y-0.5">
            {lesson.key_takeaways.slice(0, 3).map((t, i) => <li key={i} className="text-[10px] flex gap-1"><span className="text-primary">•</span>{t}</li>)}
          </ul>
        </div>
      )}
      {!compact && lesson.mistakes_to_avoid && lesson.mistakes_to_avoid.length > 0 && (
        <div className="mb-2">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" />Mistakes to Avoid</p>
          <ul className="space-y-0.5">
            {lesson.mistakes_to_avoid.slice(0, 2).map((m, i) => <li key={i} className="text-[10px] flex gap-1"><span className="text-red-500">•</span>{m}</li>)}
          </ul>
        </div>
      )}
      {onAssign && (
        <Button size="sm" variant="outline" className="w-full text-xs h-7 mt-2" onClick={() => onAssign(lesson)}>
          <Users className="w-3 h-3 mr-1" />Assign to Agent
        </Button>
      )}
    </Card>
  );
}