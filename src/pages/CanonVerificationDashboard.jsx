import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { client } from '../api/client';

export default function CanonVerificationDashboard() {
  const queryClient = useQueryClient();
  const [verificationResult, setVerificationResult] = useState(null);

  // Fetch pending entries count
  const { data: pendingStats, isLoading: statsLoading } = useQuery({
    queryKey: ['canon-pending-stats'],
    queryFn: async () => {
      const pending = await client.entities.find('CanonEntry', {
        where: { verification_status: { $in: ['pending', 'unverified', null] } }
      });
      const verified = await client.entities.find('CanonEntry', {
        where: { verification_status: 'verified' }
      });
      return {
        pending_count: pending?.length || 0,
        verified_count: verified?.length || 0,
        total_count: (pending?.length || 0) + (verified?.length || 0)
      };
    },
    refetchInterval: 5000
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: async () => {
      return await client.functions.invoke('verify-pending-canon-entries', {});
    },
    onSuccess: (data) => {
      setVerificationResult(data);
      queryClient.invalidateQueries(['canon-pending-stats']);
    }
  });

  const handleVerifyAll = () => {
    if (window.confirm(`Verify all ${pendingStats?.pending_count || 0} pending Canon entries?`)) {
      verifyMutation.mutate();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Canon Verification Dashboard</h1>
          <p className="text-muted-foreground mt-2">Bulk verify pending Canon entries to unblock JurisEngine</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Pending Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-4xl font-bold">{pendingStats?.pending_count || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-4xl font-bold">{pendingStats?.verified_count || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Total Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-4xl font-bold">{pendingStats?.total_count || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verification Action */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will verify all pending Canon entries immediately. JurisEngine legal services will become operational once verification is complete.
          </p>
          <Button
            onClick={handleVerifyAll}
            disabled={verifyMutation.isPending || (pendingStats?.pending_count || 0) === 0}
            size="lg"
          >
            {verifyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              `Verify All ${pendingStats?.pending_count || 0} Entries`
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Verification Result */}
      {verificationResult && (
        <Alert className={verificationResult.success ? 'border-green-500' : 'border-red-500'}>
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">{verificationResult.message}</div>
              <div className="text-sm">
                <div>Verified: {verificationResult.verified_count}</div>
                <div>Total Pending: {verificationResult.total_pending}</div>
                {verificationResult.errors && verificationResult.errors.length > 0 && (
                  <div className="text-red-500">Errors: {verificationResult.errors.length}</div>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {verifyMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            Error: {verifyMutation.error?.message || 'Verification failed'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
