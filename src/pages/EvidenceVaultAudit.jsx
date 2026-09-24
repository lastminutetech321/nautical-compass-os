import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { base44 } from '@/api/base44';
import { AlertCircle, CheckCircle, ShieldAlert, FileCheck } from 'lucide-react';

export default function EvidenceVaultAudit() {
  const [runAudit, setRunAudit] = useState(false);

  const { data: auditResults, isLoading, error, refetch } = useQuery({
    queryKey: ['evidence-vault-audit'],
    queryFn: async () => {
      const response = await base44.functions.execute('audit_evidence_vault');
      return response.data;
    },
    enabled: runAudit,
    refetchOnWindowFocus: false
  });

  const handleRunAudit = () => {
    setRunAudit(true);
    refetch();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Evidence Vault Audit</h1>
        <p className="text-muted-foreground">
          Review chain-of-custody records for integrity, attribution, and compliance
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Audit Controls</CardTitle>
          <CardDescription>
            Run a comprehensive audit of all Evidence Vault entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRunAudit} disabled={isLoading}>
            <FileCheck className="mr-2 h-4 w-4" />
            {isLoading ? 'Running Audit...' : 'Run Audit'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Audit failed: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {auditResults && (
        <>
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{auditResults.total_entries}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{auditResults.compliance_rate}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {auditResults.statistics.total_compliant} compliant
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{auditResults.issues_found.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Issue Breakdown */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Issue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Missing Hash</p>
                  <p className="text-2xl font-semibold">
                    {auditResults.statistics.missing_integrity_hash}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Missing Attribution</p>
                  <p className="text-2xl font-semibold">
                    {auditResults.statistics.missing_source_attribution}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Missing Custody Log</p>
                  <p className="text-2xl font-semibold">
                    {auditResults.statistics.missing_custody_log}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Missing Access Level</p>
                  <p className="text-2xl font-semibold">
                    {auditResults.statistics.missing_access_level}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invalid Custody Log</p>
                  <p className="text-2xl font-semibold">
                    {auditResults.statistics.invalid_custody_log}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {auditResults.recommendations.length > 0 && (
            <Alert className="mb-6">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Recommendations:</p>
                <ul className="list-disc list-inside space-y-1">
                  {auditResults.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Issues Detail */}
          {auditResults.issues_found.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Issues Detail</CardTitle>
                <CardDescription>
                  {auditResults.issues_found.length} entries require attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditResults.issues_found.map((issue, idx) => (
                    <div key={idx} className="border-l-4 border-destructive pl-4 py-2">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{issue.title}</p>
                          <p className="text-sm text-muted-foreground">
                            ID: {issue.evidence_id}
                          </p>
                        </div>
                        <Badge variant="destructive">{issue.issues.length} issues</Badge>
                      </div>
                      <ul className="space-y-1">
                        {issue.issues.map((desc, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start">
                            <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            {desc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Clear */}
          {auditResults.issues_found.length === 0 && auditResults.total_entries > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                All {auditResults.total_entries} evidence entries are fully compliant with chain-of-custody requirements.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
