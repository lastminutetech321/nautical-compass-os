import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44Client } from '../api/base44';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function JurisEngineStatus() {
  const { data: status, isLoading, error, refetch } = useQuery({
    queryKey: ['jurisengine-status'],
    queryFn: async () => {
      const result = await base44Client.functions.jurisengine_validate_dependencies({});
      return result;
    },
    refetchInterval: 30000 // Auto-refresh every 30s
  });

  const unblockMutation = useMutation({
    mutationFn: async () => {
      return await base44Client.workflows.jurisengine_unblock.trigger({});
    },
    onSuccess: () => {
      refetch();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              Error Loading Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">JurisEngine v1 Status</h1>
          <p className="text-gray-600 mt-1">Dependency validation and unblock controls</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={status?.ready ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status?.ready ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            )}
            {status?.ready ? 'JurisEngine Ready' : 'JurisEngine Blocked'}
          </CardTitle>
          <CardDescription>
            {status?.ready
              ? 'All dependencies satisfied. JurisEngine v1 can proceed.'
              : 'Dependencies not met. Review blockers below.'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Canon Status */}
      <Card>
        <CardHeader>
          <CardTitle>NC Canon Status</CardTitle>
          <CardDescription>Verified legal doctrine entries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Entries</p>
              <p className="text-2xl font-bold">{status?.canonStatus?.totalEntries || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Verified Entries</p>
              <p className="text-2xl font-bold text-green-600">{status?.canonStatus?.verifiedEntries || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status?.canonStatus?.readyForJuris ? (
              <Badge variant="success">Ready for JurisEngine</Badge>
            ) : (
              <Badge variant="destructive">Not Ready</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Evidence Vault Status */}
      <Card>
        <CardHeader>
          <CardTitle>Evidence Vault Status</CardTitle>
          <CardDescription>Access control validation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Access Controls Active</span>
              {status?.vaultStatus?.accessControlsActive ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Validation Test Passed</span>
              {status?.vaultStatus?.testPassed ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blockers */}
      {status?.blockers && status.blockers.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Blockers</CardTitle>
            <CardDescription>Issues preventing JurisEngine activation</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {status.blockers.map((blocker, idx) => (
                <li key={idx} className="flex items-start gap-2 text-red-700">
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{blocker}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {status?.warnings && status.warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-700">Warnings</CardTitle>
            <CardDescription>Non-blocking issues to address</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {status.warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2 text-yellow-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Unblock Action */}
      {!status?.ready && (
        <Card>
          <CardHeader>
            <CardTitle>Unblock JurisEngine</CardTitle>
            <CardDescription>
              Run the automated unblock workflow to verify Canon entries and test Evidence Vault access controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => unblockMutation.mutate()}
              disabled={unblockMutation.isPending}
              className="w-full"
            >
              {unblockMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running Unblock Workflow...
                </>
              ) : (
                'Run Unblock Workflow'
              )}
            </Button>
            {unblockMutation.isError && (
              <p className="text-red-600 text-sm mt-2">Error: {unblockMutation.error.message}</p>
            )}
            {unblockMutation.isSuccess && (
              <p className="text-green-600 text-sm mt-2">Workflow triggered. Refreshing status...</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
