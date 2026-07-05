import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Building2, Activity, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

const riskColor = (risk) => {
  if (risk === 'critical') return 'bg-red-500';
  if (risk === 'high') return 'bg-orange-500';
  if (risk === 'medium') return 'bg-amber-500';
  return 'bg-emerald-500';
};

const riskBadge = (risk) => {
  if (risk === 'critical') return 'destructive';
  if (risk === 'high') return 'destructive';
  if (risk === 'medium') return 'secondary';
  return 'secondary';
};

export default function DepartmentGrid() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await base44.entities.Department.list('-health_score', 100);
      setDepartments(items);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading departments...</div>;

  if (departments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No departments yet. Initialize NOOS to create the department structure.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{departments.length} departments operating</p>
        <Button variant="ghost" size="sm" onClick={load}>
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {departments.map((dept) => (
          <Card key={dept.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{dept.dept_name}</CardTitle>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{dept.dept_type.replace(/_/g, ' ')}</p>
                </div>
                <Badge variant={riskBadge(dept.risk_level)} className="text-xs">
                  {dept.risk_level}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground line-clamp-2">{dept.mission}</p>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground">Health</span>
                    <span className="font-semibold">{dept.health_score || 50}</span>
                  </div>
                  <Progress value={dept.health_score || 50} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground">Ready</span>
                    <span className="font-semibold">{dept.readiness_score || 50}</span>
                  </div>
                  <Progress value={dept.readiness_score || 50} className="h-1.5" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 pt-2 text-xs">
                <div className="text-center"><div className="font-semibold">{dept.productivity_score || 50}</div><div className="text-muted-foreground">Prod</div></div>
                <div className="text-center"><div className="font-semibold">{dept.automation_score || 0}</div><div className="text-muted-foreground">Auto</div></div>
                <div className="text-center"><div className="font-semibold">{dept.knowledge_score || 50}</div><div className="text-muted-foreground">Know</div></div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center gap-1 text-xs">
                  <Activity className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">AI Exec:</span>
                  <span className="font-medium truncate">{dept.assigned_ai_executive || 'Unassigned'}</span>
                </div>
              </div>

              {(dept.recommended_priorities || []).length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs font-medium mb-1">Top Priority:</div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{dept.recommended_priorities[0]}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t text-xs">
                <div>
                  <span className="text-muted-foreground">Systems: </span>
                  <span className="font-semibold">{(dept.owned_systems || []).length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Revenue: </span>
                  <span className="font-semibold">${(dept.revenue_impact || 0).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}