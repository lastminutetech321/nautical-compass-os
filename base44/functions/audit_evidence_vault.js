/**
 * Audit Evidence Vault Chain-of-Custody Records
 * Reviews all evidence entries for integrity, attribution, custody logs, and access levels
 */

import { Base44 } from '@base44/sdk';

export default async function auditEvidenceVault(req, context) {
  const base44 = new Base44({ appId: context.env.BASE44_APP_ID });
  
  try {
    // Fetch all evidence vault entries
    const evidenceEntries = await base44.entity('evidence_vault').list({
      limit: 1000,
      orderBy: 'created_at',
      orderDirection: 'desc'
    });

    const auditResults = {
      timestamp: new Date().toISOString(),
      total_entries: evidenceEntries.length,
      issues_found: [],
      compliant_entries: [],
      statistics: {
        missing_integrity_hash: 0,
        missing_source_attribution: 0,
        missing_custody_log: 0,
        missing_access_level: 0,
        invalid_custody_log: 0,
        total_compliant: 0
      }
    };

    for (const entry of evidenceEntries) {
      const issues = [];
      
      // Check 1: Integrity hash
      if (!entry.integrity_hash || entry.integrity_hash.trim() === '') {
        issues.push('Missing integrity hash');
        auditResults.statistics.missing_integrity_hash++;
      } else if (!/^[a-f0-9]{64}$/i.test(entry.integrity_hash)) {
        issues.push('Invalid integrity hash format (expected SHA-256)');
      }

      // Check 2: Source attribution
      if (!entry.source_attribution || entry.source_attribution.trim() === '') {
        issues.push('Missing source attribution');
        auditResults.statistics.missing_source_attribution++;
      }

      // Check 3: Custody log
      if (!entry.custody_log) {
        issues.push('Missing custody log');
        auditResults.statistics.missing_custody_log++;
      } else {
        try {
          const custodyLog = typeof entry.custody_log === 'string' 
            ? JSON.parse(entry.custody_log) 
            : entry.custody_log;
          
          if (!Array.isArray(custodyLog) || custodyLog.length === 0) {
            issues.push('Custody log is empty or not an array');
            auditResults.statistics.invalid_custody_log++;
          } else {
            // Validate custody log entries
            for (let i = 0; i < custodyLog.length; i++) {
              const logEntry = custodyLog[i];
              if (!logEntry.timestamp || !logEntry.action || !logEntry.user) {
                issues.push(`Custody log entry ${i} missing required fields (timestamp, action, user)`);
                auditResults.statistics.invalid_custody_log++;
                break;
              }
            }
          }
        } catch (e) {
          issues.push('Custody log is not valid JSON');
          auditResults.statistics.invalid_custody_log++;
        }
      }

      // Check 4: Access level
      if (!entry.access_level || entry.access_level.trim() === '') {
        issues.push('Missing access_level assignment');
        auditResults.statistics.missing_access_level++;
      } else {
        const validLevels = ['public', 'internal', 'confidential', 'restricted', 'founder_only'];
        if (!validLevels.includes(entry.access_level)) {
          issues.push(`Invalid access_level: ${entry.access_level} (must be one of: ${validLevels.join(', ')})`);
        }
      }

      // Record results
      if (issues.length > 0) {
        auditResults.issues_found.push({
          evidence_id: entry.evidence_id,
          title: entry.title,
          issues: issues,
          created_at: entry.created_at
        });
      } else {
        auditResults.compliant_entries.push(entry.evidence_id);
        auditResults.statistics.total_compliant++;
      }
    }

    // Calculate compliance rate
    auditResults.compliance_rate = auditResults.total_entries > 0
      ? ((auditResults.statistics.total_compliant / auditResults.total_entries) * 100).toFixed(2) + '%'
      : 'N/A';

    // Generate recommendations
    auditResults.recommendations = [];
    if (auditResults.statistics.missing_integrity_hash > 0) {
      auditResults.recommendations.push(
        `${auditResults.statistics.missing_integrity_hash} entries need integrity hash generation`
      );
    }
    if (auditResults.statistics.missing_source_attribution > 0) {
      auditResults.recommendations.push(
        `${auditResults.statistics.missing_source_attribution} entries need source attribution`
      );
    }
    if (auditResults.statistics.missing_custody_log > 0) {
      auditResults.recommendations.push(
        `${auditResults.statistics.missing_custody_log} entries need custody log initialization`
      );
    }
    if (auditResults.statistics.missing_access_level > 0) {
      auditResults.recommendations.push(
        `${auditResults.statistics.missing_access_level} entries need access_level assignment`
      );
    }
    if (auditResults.statistics.invalid_custody_log > 0) {
      auditResults.recommendations.push(
        `${auditResults.statistics.invalid_custody_log} entries have invalid custody log format`
      );
    }

    return {
      status: 200,
      body: auditResults
    };

  } catch (error) {
    return {
      status: 500,
      body: {
        error: 'Audit failed',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}
