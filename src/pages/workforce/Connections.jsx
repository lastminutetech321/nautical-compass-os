import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { apiClient } from '../../api/base44';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Loader2, Building2, CheckCircle2, XCircle, Clock, Users, Shield } from 'lucide-react';

export default function WorkforceConnections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);

  // Fetch active organization membership with workforce scope
  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ['organizationMembership', user?.id],
    queryFn: async () => {
      const results = await apiClient.entity('OrganizationMembership').list({
        filters: [
          { field: 'user_id', operator: 'eq', value: user.id },
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'verified', operator: 'eq', value: true }
        ]
      });
      // Find first membership with workforce scope
      return results.find(m => m.scopes?.includes('workforce'));
    },
    enabled: !!user?.id
  });

  // Fetch worker profile (technician owns this)
  const { data: workerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['workerProfile', user?.id],
    queryFn: async () => {
      const results = await apiClient.entity('WorkerProfile').list({
        filters: [
          { field: 'user_id', operator: 'eq', value: user.id }
        ]
      });
      return results[0] || null;
    },
    enabled: !!user?.id
  });

  // Fetch organization tech connections (only if verified membership exists)
  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ['orgTechConnections', membership?.organization_id, user?.id],
    queryFn: async () => {
      if (!membership?.organization_id) return [];
      const results = await apiClient.entity('OrganizationTechConnection').list({
        filters: [
          { field: 'organization_id', operator: 'eq', value: membership.organization_id },
          { field: 'worker_profile_id', operator: 'eq', value: workerProfile?.id }
        ]
      });
      return results;
    },
    enabled: !!membership?.organization_id && !!workerProfile?.id
  });

  // Fetch pending claims (private to technician, explicitly unverified)
  const { data: pendingClaims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['technicianClaims', user?.id],
    queryFn: async () => {
      if (!workerProfile?.id) return [];
      const results = await apiClient.entity('TechnicianClaim').list({
        filters: [
          { field: 'worker_profile_id', operator: 'eq', value: workerProfile.id },
          { field: 'status', operator: 'eq', value: 'pending' }
        ]
      });
      return results;
    },
    enabled: !!workerProfile?.id
  });

  // Accept connection mutation
  const acceptConnection = useMutation({
    mutationFn: async (connectionId) => {
      return await apiClient.entity('OrganizationTechConnection').update(connectionId, {
        status: 'active',
        activated_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orgTechConnections']);
      setError(null);
    },
    onError: (err) => {
      setError('Failed to accept connection: ' + err.message);
    }
  });

  // Revoke connection mutation (organization can revoke link, not edit profile)
  const revokeConnection = useMutation({
    mutationFn: async (connectionId) => {
      return await apiClient.entity('OrganizationTechConnection').update(connectionId, {
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: user.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orgTechConnections']);
      setError(null);
    },
    onError: (err) => {
      setError('Failed to revoke connection: ' + err.message);
    }
  });

  const isLoading = membershipLoading || profileLoading || connectionsLoading || claimsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Block access if no verified active membership with workforce scope
  if (!membership) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            You need a verified, active organization membership with workforce scope to access this page.
            Please contact your organization administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!workerProfile) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert>
          <Users className="h-4 w-4" />
          <AlertTitle>Worker Profile Required</AlertTitle>
          <AlertDescription>
            You need to create a worker profile before managing organization connections.
            Visit your profile settings to set one up.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeConnections = connections.filter(c => c.status === 'active');
  const pendingConnections = connections.filter(c => c.status === 'pending');
  const revokedConnections = connections.filter(c => c.status === 'revoked');

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Connections</h1>
        <p className="text-muted-foreground mt-2">
          Manage your workforce connections. Organizations hold a revocable link — you own your profile.
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Invariant notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Privacy & Ownership</AlertTitle>
        <AlertDescription>
          You own your WorkerProfile. Organizations can only hold a revocable link to dispatch work.
          They cannot edit your profile data. Pending claims are private and non-dispatchable until verified.
        </AlertDescription>
      </Alert>

      {/* Active Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Active Connections ({activeConnections.length})
          </CardTitle>
          <CardDescription>
            Organizations you are actively connected with for dispatch
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeConnections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active connections yet.</p>
          ) : (
            <div className="space-y-4">
              {activeConnections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Connection #{conn.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        Activated {new Date(conn.activated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Active</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeConnection.mutate(conn.id)}
                      disabled={revokeConnection.isPending}
                    >
                      {revokeConnection.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Revoke'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Pending Connections ({pendingConnections.length})
          </CardTitle>
          <CardDescription>
            Connection requests awaiting your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingConnections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending connections.</p>
          ) : (
            <div className="space-y-4">
              {pendingConnections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Connection Request #{conn.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        Requested {new Date(conn.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">Pending</Badge>
                    <Button
                      size="sm"
                      onClick={() => acceptConnection.mutate(conn.id)}
                      disabled={acceptConnection.isPending}
                    >
                      {acceptConnection.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Accept'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Claims (Private, Non-Dispatchable) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Pending Claims ({pendingClaims.length})
          </CardTitle>
          <CardDescription>
            Private claims awaiting verification — not visible to organizations, non-dispatchable
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingClaims.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending claims.</p>
          ) : (
            <div className="space-y-4">
              {pendingClaims.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">Claim #{claim.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      Submitted {new Date(claim.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status: Unverified • Private to you • Not dispatchable
                    </p>
                  </div>
                  <Badge variant="secondary">Pending Verification</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoked Connections (History) */}
      {revokedConnections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Revoked Connections ({revokedConnections.length})
            </CardTitle>
            <CardDescription>
              Past connections that have been revoked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revokedConnections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Connection #{conn.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        Revoked {new Date(conn.revoked_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive">Revoked</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
