import { Compass, Sparkles, Heart, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CompassShell({ data, onReflection, onPrefs, children }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Compass className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold font-heading">Daily Compass</h1>
            <Badge variant="secondary" className="capitalize">{data.role} Console</Badge>
          </div>
          <p className="text-muted-foreground mt-1">{data.greeting}</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            {new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onPrefs}>
            <Sparkles className="w-4 h-4" /> My Intelligence
          </Button>
          <Button
            variant={data.reflection_submitted_today ? "secondary" : "default"}
            size="sm"
            onClick={onReflection}
          >
            {data.reflection_submitted_today
              ? <><CheckCircle2 className="w-4 h-4" /> Reflection Done</>
              : <><Heart className="w-4 h-4" /> End-of-Day Reflection</>}
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}