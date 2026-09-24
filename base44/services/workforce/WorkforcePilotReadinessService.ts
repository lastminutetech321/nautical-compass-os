import { LaunchReadinessCheck } from '../../entities/LaunchReadinessCheck';

export interface PilotReadinessReport {
  overall_status: 'ready' | 'pending' | 'blocked';
  gate: 'pilot';
  checks: LaunchReadinessCheck[];
  blockers: LaunchReadinessCheck[];
  warnings: LaunchReadinessCheck[];
  score: number;
  timestamp: string;
}

export class WorkforcePilotReadinessService {
  /**
   * Generate pilot readiness checks for Workforce domain
   */
  static generatePilotChecks(): LaunchReadinessCheck[] {
    return [
      {
        domain: 'workforce',
        check_name: 'pilot_candidate_selection',
        description: 'Pilot participant selection criteria and recruitment process defined',
        status: 'unknown',
        gate: 'pilot',
        auto_check: false,
        recommended_priority: 'critical',
        weight: 3,
        score: 0,
        responsible_department: 'Workforce',
        tags: ['pilot', 'recruitment'],
        dependencies: []
      },
      {
        domain: 'workforce',
        check_name: 'pilot_onboarding_flow',
        description: 'Streamlined onboarding process for pilot participants ready',
        status: 'unknown',
        gate: 'pilot',
        auto_check: false,
        recommended_priority: 'critical',
        weight: 3,
        score: 0,
        responsible_department: 'Workforce',
        tags: ['pilot', 'onboarding'],
        dependencies: ['pilot_candidate_selection']
      },
      {
        domain: 'workforce',
        check_name: 'pilot_success_metrics',
        description: 'Success criteria and KPIs for pilot program defined and trackable',
        status: 'unknown',
        gate: 'pilot',
        auto_check: false,
        recommended_priority: 'high',
        weight: 2,
        score: 0,
        responsible_department: 'Workforce',
        tags: ['pilot', 'metrics'],
        dependencies: []
      },
      {
        domain: 'workforce',
        check_name: 'pilot_feedback_mechanism',
        description: 'Structured feedback collection system in place for pilot participants',
        status: 'unknown',
        gate: 'pilot',
        auto_check: false,
        recommended_priority: 'high',
        weight: 2,
        score: 0,
        responsible_department: 'Workforce',
        tags: ['pilot', 'feedback'],
        dependencies: []
      },
      {
        domain: 'workforce',
        check_name: 'pilot_support_resources',
        description: 'Dedicated support resources allocated for pilot participants',
        status: 'unknown',
        gate: 'pilot',
        auto_check: false,
        recommended_priority: 'high',
        weight: 2,
        score: 0,
        responsible_department: 'Customer Success',
        tags: ['pilot', 'support'],
        dependencies: []
      },
      {
        domain: 'infrastructure',
        check_name: 'pilot_feature_flags',
        description: 'Feature flags configured to control pilot participant access',
        status: 'unknown',
        gate: 'pilot',
        auto_check: true,
        recommended_priority: 'critical',
        weight: 3,
        score: 0,
        responsible_department: 'Infrastructure',
        tags: ['pilot', 'infrastructure'],
        dependencies: []
      },
      {
        domain: 'security',
        check_name: 'pilot_data_isolation',
        description: 'Pilot data properly isolated and flagged for analysis',
        status: 'unknown',
        gate: 'pilot',
        auto_check: true,
        recommended_priority: 'critical',
        weight: 3,
        score: 0,
        responsible_department: 'Security',
        tags: ['pilot', 'security', 'data'],
        dependencies: []
      },
      {
        domain: 'legal',
        check_name: 'pilot_terms_consent',
        description: 'Pilot-specific terms and informed consent process approved',
        status: 'unknown',
        gate: 'pilot',
        auto_check: false,
        recommended_priority: 'critical',
        weight: 3,
        score: 0,
        responsible_department: 'Legal',
        tags: ['pilot', 'legal', 'compliance'],
        dependencies: []
      },
      {
        domain: 'testing',
        check_name: 'pilot_smoke_tests',
        description: 'Core smoke tests passing for pilot features',
        status: 'unknown',
        gate: 'pilot',
        auto_check: true,
        recommended_priority: 'critical',
        weight: 3,
        score: 0,
        responsible_department: 'Testing',
        tags: ['pilot', 'testing'],
        dependencies: []
      },
      {
        domain: 'documentation',
        check_name: 'pilot_participant_guide',
        description: 'Participant guide and documentation prepared',
        status: 'unknown',
        gate: 'pilot',
        auto_check: false,
        recommended_priority: 'high',
        weight: 2,
        score: 0,
        responsible_department: 'Documentation',
        tags: ['pilot', 'documentation'],
        dependencies: []
      }
    ];
  }

  /**
   * Evaluate readiness based on checks
   */
  static evaluateReadiness(checks: LaunchReadinessCheck[]): PilotReadinessReport {
    const blockers = checks.filter(c => c.status === 'blocked' || c.status === 'fail');
    const warnings = checks.filter(c => c.status === 'warn');
    const passing = checks.filter(c => c.status === 'pass');

    const totalWeight = checks.reduce((sum, c) => sum + (c.weight || 1), 0);
    const earnedWeight = passing.reduce((sum, c) => sum + (c.weight || 1), 0);
    const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

    let overall_status: 'ready' | 'pending' | 'blocked' = 'pending';
    if (blockers.length > 0) {
      overall_status = 'blocked';
    } else if (passing.length === checks.length) {
      overall_status = 'ready';
    }

    return {
      overall_status,
      gate: 'pilot',
      checks,
      blockers,
      warnings,
      score,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get pilot readiness report
   */
  static getReadinessReport(): PilotReadinessReport {
    const checks = this.generatePilotChecks();
    return this.evaluateReadiness(checks);
  }
}
