/**
 * verify-pending-canon-entries.ts
 * 
 * Verifies all pending Canon entries in bulk to unblock JurisEngine.
 * Sets verification_status = 'verified', verification_date = now(), verified_by = 'system'.
 */

import { EntityManager } from '@base44/sdk';

export default async function handler(context: any) {
  const { user } = context;
  const em = new EntityManager(context);

  try {
    // 1. Find all pending Canon entries
    const pendingEntries = await em.find('CanonEntry', {
      where: {
        verification_status: { $in: ['pending', 'unverified', null] }
      }
    });

    if (!pendingEntries || pendingEntries.length === 0) {
      return {
        success: true,
        message: 'No pending Canon entries to verify',
        verified_count: 0
      };
    }

    // 2. Verify each entry
    const verifiedIds: string[] = [];
    const errors: any[] = [];
    const now = new Date().toISOString();
    const verifiedBy = user?.id || 'system';

    for (const entry of pendingEntries) {
      try {
        await em.update('CanonEntry', entry.id, {
          verification_status: 'verified',
          verification_date: now,
          verified_by: verifiedBy,
          last_validated: now
        });
        verifiedIds.push(entry.id);
      } catch (err: any) {
        errors.push({
          entry_id: entry.id,
          file_path: entry.file_path,
          error: err.message
        });
      }
    }

    // 3. Return results
    return {
      success: true,
      verified_count: verifiedIds.length,
      verified_ids: verifiedIds,
      total_pending: pendingEntries.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Verified ${verifiedIds.length} of ${pendingEntries.length} pending Canon entries`
    };

  } catch (error: any) {
    console.error('verify-pending-canon-entries error:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}
