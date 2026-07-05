import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

export default function ActivityLog() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Activity.list("-created_date", 100).then(setActivities).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader title="Activity Log" subtitle="Full audit trail of all actions" />
      {activities.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" description="Actions will appear here as your team uses the platform" />
      ) : (
        <Card className="border border-border/60 overflow-hidden">
          <div className="divide-y divide-border/40">
            {activities.map(a => (
              <div key={a.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{a.user_name || "System"}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>{" "}
                    {a.entity_name && <span className="font-medium">{a.entity_name}</span>}
                  </p>
                  {a.details && <p className="text-xs text-muted-foreground mt-0.5">{a.details}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{moment(a.created_date).format("MMM D, YYYY [at] h:mm A")}</p>
                </div>
                {a.entity_type && (
                  <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md flex-shrink-0">
                    {a.entity_type}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}