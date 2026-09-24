import { requiresHumanReview, calculateRiskScore } from '../src/pages/DiagnosisDashboard';

describe('Governance Risk Gates', () => {
  test('security_risk category requires human review', () => {
    const issue = { category: 'security_risk', severity: 'medium', affected_modules: [] };
    expect(requiresHumanReview(issue)).toBe(true);
  });

  test('critical severity requires human review', () => {
    const issue = { category: 'missing_feature', severity: 'critical', affected_modules: [] };
    expect(requiresHumanReview(issue)).toBe(true);
  });

  test('3+ affected modules require human review', () => {
    const issue = { category: 'missing_feature', severity: 'low', affected_modules: ['a','b','c'] };
    expect(requiresHumanReview(issue)).toBe(true);
  });

  test('low severity with no risk factors does not require review', () => {
    const issue = { category: 'missing_feature', severity: 'low', affected_modules: ['a'] };
    expect(requiresHumanReview(issue)).toBe(false);
  });

  test('risk score calculation includes severity', () => {
    const critical = { category: 'missing_feature', severity: 'critical', affected_modules: [], detected_at: new Date().toISOString() };
    const low = { category: 'missing_feature', severity: 'low', affected_modules: [], detected_at: new Date().toISOString() };
    expect(calculateRiskScore(critical)).toBeGreaterThan(calculateRiskScore(low));
  });

  test('risk score increases with high-risk category', () => {
    const normal = { category: 'missing_feature', severity: 'medium', affected_modules: [], detected_at: new Date().toISOString() };
    const security = { category: 'security_risk', severity: 'medium', affected_modules: [], detected_at: new Date().toISOString() };
    expect(calculateRiskScore(security)).toBeGreaterThan(calculateRiskScore(normal));
  });

  test('risk score increases with module count', () => {
    const few = { category: 'missing_feature', severity: 'medium', affected_modules: ['a'], detected_at: new Date().toISOString() };
    const many = { category: 'missing_feature', severity: 'medium', affected_modules: ['a','b','c','d','e'], detected_at: new Date().toISOString() };
    expect(calculateRiskScore(many)).toBeGreaterThan(calculateRiskScore(few));
  });

  test('risk score caps at 100', () => {
    const maxRisk = { category: 'security_risk', severity: 'critical', affected_modules: ['a','b','c','d','e','f','g','h'], detected_at: new Date(Date.now() - 60*24*60*60*1000).toISOString() };
    expect(calculateRiskScore(maxRisk)).toBeLessThanOrEqual(100);
  });
});
