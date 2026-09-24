/**
 * Parses self-healing diagnostics output and structures issues for task creation
 */
export default async function parseHealingDiagnostics({ diagnostics, module }, context) {
  if (!diagnostics || !diagnostics.issues) {
    return {
      issues: [],
      summary: 'No issues detected'
    };
  }

  // Transform raw diagnostics into structured issue records
  const issues = diagnostics.issues.map((issue, index) => {
    // Infer priority from severity
    let priority = 'medium';
    if (issue.severity === 'critical') priority = 'immediate';
    else if (issue.severity === 'high') priority = 'urgent';
    else if (issue.severity === 'low') priority = 'routine';

    return {
      type: issue.type || 'unknown',
      severity: issue.severity || 'medium',
      description: issue.description || `Issue #${index + 1} in ${module}`,
      priority,
      metadata: {
        raw_diagnostic: issue,
        detection_timestamp: diagnostics.timestamp || new Date().toISOString(),
        module,
        source: 'self_healing_engine_v3'
      }
    };
  });

  return {
    issues,
    total_count: issues.length,
    critical_count: issues.filter(i => i.severity === 'critical').length,
    high_count: issues.filter(i => i.severity === 'high').length,
    summary: `${issues.length} issues parsed from ${module} diagnostics`
  };
}
