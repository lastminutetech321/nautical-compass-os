import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44Client } from '../api/base44';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertTriangle, TrendingDown, DollarSign, Calendar, RefreshCw } from 'lucide-react';

export default function SurvivalDashboard() {
  const queryClient = useQueryClient();
  const [lastChecked, setLastChecked] = useState(null);

  // Fetch latest survival metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['survival-metrics'],
    queryFn: async () => {
      const result = await base44Client.entity('SurvivalMetric').list({
        sort: [{ field: 'date', direction: 'desc' }],
        limit: 10
      });
      return result;
    }
  });

  // Run survival check
  const checkMutation = useMutation({
    mutationFn: async () => {
      const result = await base44Client.function('monitor-survival-metrics').invoke();
      return result;
    },
    onSuccess: (data) => {
      setLastChecked(new Date());
      queryClient.invalidateQueries(['survival-metrics']);
    }
  });

  const latest = metrics?.[0];
  const checkData = checkMutation.data;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Survival Dashboard</h1>
          <p className="text-gray-600 mt-1">Cash runway and survival metrics monitoring</p>
        </div>
        <Button
          onClick={() => checkMutation.mutate()}
          disabled={checkMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${checkMutation.isPending ? 'animate-spin' : ''}`} />
          Run Check
        </Button>
      </div>

      {/* Status Alert */}
      {checkData && checkData.status !== 'healthy' && (
        <Alert className={`border-2 ${getStatusColor(checkData.status)}`}>
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            <div className="font-semibold mb-2">{checkData.alerts?.[0]}</div>
            {checkData.alerts?.slice(1).map((alert, i) => (
              <div key={i} className="text-sm mt-1">{alert}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Cash Runway</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {checkData?.runway_months === 'sustainable' ? '∞' :
               checkData?.runway_months ? `${checkData.runway_months.toFixed(1)}mo` :
               latest ? `${((latest.cash_balance || 0) / (latest.monthly_burn || 1)).toFixed(1)}mo` : 'N/A'}
            </div>
            {checkData?.days_until_zero && (
              <p className="text-sm text-gray-600 mt-1">
                ~{checkData.days_until_zero} days
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="w-4 h-4 mr-1" />
              Cash Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(latest?.cash_balance)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              As of {latest?.date ? new Date(latest.date).toLocaleDateString() : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingDown className="w-4 h-4 mr-1" />
              Monthly Burn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(latest?.monthly_burn)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Net: {formatCurrency((latest?.monthly_burn || 0) - (latest?.mrr || 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(latest?.mrr)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {latest?.mrr === 0 ? 'No revenue' : 'Recurring'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {checkData?.recommendations && checkData.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
            <CardDescription>
              Based on current survival metrics analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {checkData.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Historical Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Metrics</CardTitle>
          <CardDescription>
            Last 10 recorded survival metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics && metrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium text-right">Cash</th>
                    <th className="pb-2 font-medium text-right">Burn</th>
                    <th className="pb-2 font-medium text-right">MRR</th>
                    <th className="pb-2 font-medium text-right">Runway</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {metrics.map((metric, i) => {
                    const runway = (metric.cash_balance || 0) / ((metric.monthly_burn || 0) - (metric.mrr || 0) || 1);
                    return (
                      <tr key={i}>
                        <td className="py-2">
                          {new Date(metric.date).toLocaleDateString()}
                        </td>
                        <td className="py-2 text-right">{formatCurrency(metric.cash_balance)}</td>
                        <td className="py-2 text-right">{formatCurrency(metric.monthly_burn)}</td>
                        <td className="py-2 text-right">{formatCurrency(metric.mrr)}</td>
                        <td className="py-2 text-right">
                          {runway > 100 ? '∞' : `${runway.toFixed(1)}mo`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No historical data available</p>
          )}
        </CardContent>
      </Card>

      {lastChecked && (
        <p className="text-sm text-gray-600 text-center">
          Last checked: {lastChecked.toLocaleString()}
        </p>
      )}
    </div>
  );
}
