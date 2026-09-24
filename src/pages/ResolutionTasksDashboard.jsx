import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44Client } from '../api/base44';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function ResolutionTasksDashboard() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const { data: tasks, isLoading, error, refetch } = useQuery({
    queryKey: ['resolution_tasks', filterStatus, filterSeverity],
    queryFn: async () => {
      let query = {};
      if (filterStatus !== 'all') query.status = filterStatus;
      if (filterSeverity !== 'all') query.severity = filterSeverity;
      
      const response = await base44Client.entities('resolution_tasks').list({
        filter: query,
        sort: [{ field: 'created_at', direction: 'desc' }],
        limit: 100
      });
      return response.data;
    }
  });

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500'
    };
    return colors[severity] || 'bg-gray-500';
  };

  const getStatusIcon = (status) => {
    if (status === 'resolved') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'in_progress') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    if (status === 'failed') return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>Error loading tasks: {error.message}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = {
    total: tasks?.length || 0,
    pending: tasks?.filter(t => t.status === 'pending').length || 0,
    in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
    resolved: tasks?.filter(t => t.status === 'resolved').length || 0,
    critical: tasks?.filter(t => t.severity === 'critical').length || 0
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Resolution Tasks Dashboard</h1>
          <p className="text-muted-foreground mt-1">Auto-generated tasks from Self-Healing Engine v3</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-sm text-muted-foreground">Critical</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex gap-2">
          <span className="text-sm font-medium">Status:</span>
          {['all', 'pending', 'assigned', 'in_progress', 'resolved', 'failed'].map(status => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <span className="text-sm font-medium">Severity:</span>
          {['all', 'critical', 'high', 'medium', 'low'].map(severity => (
            <Button
              key={severity}
              variant={filterSeverity === severity ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSeverity(severity)}
            >
              {severity}
            </Button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks?.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No tasks found matching the selected filters.
            </CardContent>
          </Card>
        ) : (
          tasks?.map(task => (
            <Card key={task.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <CardTitle className="text-lg">{task.module}</CardTitle>
                      <Badge className={getSeverityColor(task.severity)}>{task.severity}</Badge>
                      <Badge variant="outline">{task.issue_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>Created: {new Date(task.created_at).toLocaleString()}</div>
                    {task.assigned_worker && <div>Assigned: {task.assigned_worker}</div>}
                    {task.resolved_at && <div>Resolved: {new Date(task.resolved_at).toLocaleString()}</div>}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
