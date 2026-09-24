import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { client } from '@/api/base44';

export default function JurisEngineHealth() {
  const [lastRun, setLastRun] = useState(null);

  const { data: healthLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['jurisengine-health-logs'],
    queryFn: async () => {
      const response = await client.entities.query('jurisengine_health_log', {
        orderBy: { timestamp: 'desc' },
        limit: 10
      });
      return response.data;
    }
  });

  const runHealthCheck = useMutation({
    mutationFn: async () => {
      const response = await client.functions.invoke('jurisengine-dispatch', {});
      return response;
    },
    onSuccess: (data) => {
      setLastRun(data);
      
      // Log the health check result
      client.entities.create('jurisengine_health_log', {
        module: 'JurisEngine',
        health_score: data.health_score,
        total_issues: data.summary.total_issues,
        high_severity: data.summary.high_severity,
        medium_severity: data.summary.medium_severity,
        low_severity: data.summary.low_severity,
        issues: data.issues,
        fixes: data.fixes,
        status: data.health_score >= 80 ? 'healthy' : data.health_score >= 50 ? 'degraded' : 'critical'
      });
      
      refetchLogs();
    }
  });

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthIcon = (score) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 50) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getSeverityBadge = (severity) => {
    const variants = {
      high: 'destructive',
      medium: 'warning',
      low: 'secondary'
    };
    return <Badge variant={variants[severity]}>{severity}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">JurisEngine Health Monitor</h1>
          <p className="text-muted-foreground">Auto-repair diagnostics for legal research infrastructure</p>
        </div>
        <Button
          onClick={() => runHealthCheck.mutate()}
          disabled={runHealthCheck.isPending}
        >
          {runHealthCheck.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</>
          ) : (
            <><RefreshCw className="mr-2 h-4 w-4" /> Run Health Check</>
          )}
        </Button>
      </div>

      {lastRun && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getHealthIcon(lastRun.health_score)}
              Health Score: <span className={getHealthColor(lastRun.health_score)}>{lastRun.health_score}%</span>
            </CardTitle>
            <CardDescription>Last checked: {new Date(lastRun.timestamp).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-2xl font-bold">{lastRun.summary.total_issues}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">High Severity</p>
                <p className="text-2xl font-bold text-red-600">{lastRun.summary.high_severity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Medium Severity</p>
                <p className="text-2xl font-bold text-yellow-600">{lastRun.summary.medium_severity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Severity</p>
                <p className="text-2xl font-bold text-gray-600">{lastRun.summary.low_severity}</p>
              </div>
            </div>

            {lastRun.issues.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Issues Detected</h3>
                <div className="space-y-2">
                  {lastRun.issues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getSeverityBadge(issue.severity)}
                          <span className="font-medium">{issue.type}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{issue.message}</p>
                        {issue.entity && <p className="text-xs text-muted-foreground mt-1">Entity: {issue.entity}</p>}
                        {issue.function && <p className="text-xs text-muted-foreground mt-1">Function: {issue.function}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lastRun.fixes.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Recommended Fixes</h3>
                <div className="space-y-2">
                  {lastRun.fixes.map((fix, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-blue-50">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">Priority {fix.priority}</Badge>
                        {fix.auto_fixable && <Badge variant="secondary">Auto-fixable</Badge>}
                      </div>
                      <p className="text-sm font-medium">{fix.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{fix.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lastRun.recommendations && (
              <div>
                <h3 className="font-semibold mb-2">Recommendations</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {lastRun.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Health Check History</CardTitle>
          <CardDescription>Recent diagnostic runs</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : healthLogs?.length > 0 ? (
            <div className="space-y-2">
              {healthLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getHealthIcon(log.health_score)}
                    <div>
                      <p className="font-medium">{new Date(log.timestamp).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.total_issues} issues ({log.high_severity} high, {log.medium_severity} medium, {log.low_severity} low)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={log.status === 'healthy' ? 'success' : log.status === 'degraded' ? 'warning' : 'destructive'}>
                      {log.status}
                    </Badge>
                    <span className={`font-bold ${getHealthColor(log.health_score)}`}>
                      {log.health_score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground p-6">No health checks recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
