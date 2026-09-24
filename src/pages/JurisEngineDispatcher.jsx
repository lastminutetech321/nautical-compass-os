import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44';

export default function JurisEngineDispatcher() {
  const [dispatchLog, setDispatchLog] = useState([]);

  const { data: pendingTasks, isLoading, refetch } = useQuery({
    queryKey: ['juris-pending-tasks'],
    queryFn: async () => {
      const result = await base44.functions.call('jurisengine/get-pending-resolutions');
      return result.tasks || [];
    }
  });

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.workflows.trigger('juris-engine-dispatcher');
      return result;
    },
    onSuccess: (data) => {
      setDispatchLog(prev => [{
        timestamp: new Date().toISOString(),
        status: 'success',
        message: `Dispatched ${data.dispatched_count || 0} resolution tasks`
      }, ...prev]);
      refetch();
    },
    onError: (error) => {
      setDispatchLog(prev => [{
        timestamp: new Date().toISOString(),
        status: 'error',
        message: error.message
      }, ...prev]);
    }
  });

  const priorityColors = {
    critical: 'destructive',
    high: 'destructive',
    medium: 'default',
    low: 'secondary'
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">JurisEngine Dispatcher</h1>
          <p className="text-muted-foreground">Auto-resolution task management for JurisEngine v1</p>
        </div>
        <Button
          onClick={() => dispatchMutation.mutate()}
          disabled={dispatchMutation.isPending || isLoading || !pendingTasks?.length}
        >
          {dispatchMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Dispatching...</>
          ) : (
            <><Play className="mr-2 h-4 w-4" /> Dispatch All</>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Resolution Tasks</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${pendingTasks?.length || 0} tasks awaiting dispatch`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !pendingTasks?.length ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>No pending resolution tasks. All clear!</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {pendingTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={priorityColors[task.priority]}>{task.priority}</Badge>
                          <span className="text-sm text-muted-foreground">#{task.id}</span>
                        </div>
                        <p className="font-medium">{task.description}</p>
                        <p className="text-sm text-muted-foreground">
                          Detected: {new Date(task.detected_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {dispatchLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dispatch Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dispatchLog.map((entry, idx) => (
                <Alert key={idx} variant={entry.status === 'error' ? 'destructive' : 'default'}>
                  {entry.status === 'error' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <span className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span>
                    {' — '}
                    {entry.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
