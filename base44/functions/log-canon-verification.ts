/**
 * log-canon-verification.ts
 * 
 * Logs Canon verification results to CanonVerificationLog entity
 */

import { EntityManager } from '@base44/sdk';

export default async function handler(context: any) {
  const { verification_results } = context.input;
  const { user } = context;
  const em = new EntityManager(context);

  try {
    // Create log entry
    const logEntry = await em.create('CanonVerificationLog', {
      verification_date: new Date().toISOString(),
      verified_count: verification_results?.verified_count || 0,
      total_pending: verification_results?.total_pending || 0,
      verified_ids: verification_results?.verified_ids || [],
      errors: verification_results?.errors || [],
      triggered_by: user?.id || 'system',
      success: verification_results?.success || false,
      message: verification_results?.message || 'No message'
    });

    return {
      success: true,
      log_id: logEntry.id,
      message: 'Verification results logged'
    };
  } catch (error: any) {
    console.error('log-canon-verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
