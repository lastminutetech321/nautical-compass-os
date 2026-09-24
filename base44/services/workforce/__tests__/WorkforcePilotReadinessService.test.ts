import { WorkforcePilotReadinessService } from '../WorkforcePilotReadinessService';
import { LaunchReadinessCheck } from '../../../entities/LaunchReadinessCheck';

describe('WorkforcePilotReadinessService', () => {
  describe('generatePilotChecks', () => {
    it('should generate all pilot readiness checks', () => {
      const checks = WorkforcePilotReadinessService.generatePilotChecks();
      
      expect(checks).toBeInstanceOf(Array);
      expect(checks.length).toBeGreaterThan(0);
      
      checks.forEach(check => {
        expect(check).toHaveProperty('domain');
        expect(check).toHaveProperty('check_name');
        expect(check).toHaveProperty('status');
        expect(check).toHaveProperty('gate', 'pilot');
        expect(check).toHaveProperty('auto_check');
      });
    });

    it('should include critical workforce checks', () => {
      const checks = WorkforcePilotReadinessService.generatePilotChecks();
      const checkNames = checks.map(c => c.check_name);
      
      expect(checkNames).toContain('pilot_candidate_selection');
      expect(checkNames).toContain('pilot_onboarding_flow');
      expect(checkNames).toContain('pilot_success_metrics');
      expect(checkNames).toContain('pilot_feedback_mechanism');
    });

    it('should include infrastructure and security checks', () => {
      const checks = WorkforcePilotReadinessService.generatePilotChecks();
      const checkNames = checks.map(c => c.check_name);
      
      expect(checkNames).toContain('pilot_feature_flags');
      expect(checkNames).toContain('pilot_data_isolation');
    });

    it('should mark automated checks correctly', () => {
      const checks = WorkforcePilotReadinessService.generatePilotChecks();
      const autoChecks = checks.filter(c => c.auto_check);
      
      expect(autoChecks.length).toBeGreaterThan(0);
      expect(autoChecks.map(c => c.check_name)).toContain('pilot_feature_flags');
      expect(autoChecks.map(c => c.check_name)).toContain('pilot_data_isolation');
      expect(autoChecks.map(c => c.check_name)).toContain('pilot_smoke_tests');
    });

    it('should assign appropriate weights', () => {
      const checks = WorkforcePilotReadinessService.generatePilotChecks();
      
      checks.forEach(check => {
        expect(check.weight).toBeGreaterThanOrEqual(1);
        expect(check.weight).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('evaluateReadiness', () => {
    it('should return blocked status when checks fail', () => {
      const checks: LaunchReadinessCheck[] = [
        {
          domain: 'workforce',
          check_name: 'test_check',
          status: 'fail',
          weight: 1,
          score: 0
        }
      ];
      
      const report = WorkforcePilotReadinessService.evaluateReadiness(checks);
      
      expect(report.overall_status).toBe('blocked');
      expect(report.blockers.length).toBe(1);
      expect(report.gate).toBe('pilot');
    });

    it('should return ready status when all checks pass', () => {
      const checks: LaunchReadinessCheck[] = [
        {
          domain: 'workforce',
          check_name: 'test_check_1',
          status: 'pass',
          weight: 1,
          score: 100
        },
        {
          domain: 'workforce',
          check_name: 'test_check_2',
          status: 'pass',
          weight: 2,
          score: 100
        }
      ];
      
      const report = WorkforcePilotReadinessService.evaluateReadiness(checks);
      
      expect(report.overall_status).toBe('ready');
      expect(report.blockers.length).toBe(0);
      expect(report.score).toBe(100);
    });

    it('should calculate weighted score correctly', () => {
      const checks: LaunchReadinessCheck[] = [
        {
          domain: 'workforce',
          check_name: 'test_check_1',
          status: 'pass',
          weight: 2,
          score: 100
        },
        {
          domain: 'workforce',
          check_name: 'test_check_2',
          status: 'unknown',
          weight: 2,
          score: 0
        }
      ];
      
      const report = WorkforcePilotReadinessService.evaluateReadiness(checks);
      
      expect(report.score).toBe(50);
    });

    it('should identify warnings', () => {
      const checks: LaunchReadinessCheck[] = [
        {
          domain: 'workforce',
          check_name: 'test_check',
          status: 'warn',
          weight: 1,
          score: 50
        }
      ];
      
      const report = WorkforcePilotReadinessService.evaluateReadiness(checks);
      
      expect(report.warnings.length).toBe(1);
      expect(report.overall_status).toBe('pending');
    });
  });

  describe('getReadinessReport', () => {
    it('should generate complete readiness report', () => {
      const report = WorkforcePilotReadinessService.getReadinessReport();
      
      expect(report).toHaveProperty('overall_status');
      expect(report).toHaveProperty('gate', 'pilot');
      expect(report).toHaveProperty('checks');
      expect(report).toHaveProperty('blockers');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('score');
      expect(report).toHaveProperty('timestamp');
      
      expect(report.checks.length).toBeGreaterThan(0);
    });
  });
});
