/**
 * Canon Verification Function
 * Marks a canon entry as verified and logs verification metadata
 */

import { FunctionContext } from '@base44/sdk';

interface VerifyCanonEntryInput {
  entryId: string;
  verifiedBy: string;
  notes?: string;
}

export default async function verifyCanonEntry(
  input: VerifyCanonEntryInput,
  context: FunctionContext
) {
  const { entryId, verifiedBy, notes } = input;
  const { entities, user } = context;

  // Authorization check
  if (!user || (!user.roles?.includes('admin') && !user.roles?.includes('canon_editor'))) {
    throw new Error('Unauthorized: Only admins and canon editors can verify entries');
  }

  // Fetch the entry
  const entry = await entities.nc_canon_entry.get(entryId);
  if (!entry) {
    throw new Error(`Canon entry not found: ${entryId}`);
  }

  // Update verification status
  const updated = await entities.nc_canon_entry.update(entryId, {
    verified: true,
    verified_by: verifiedBy,
    verified_at: new Date().toISOString(),
    metadata: JSON.stringify({
      ...JSON.parse(entry.metadata || '{}'),
      verification_notes: notes || '',
      verification_user_id: user.id
    })
  });

  // Log verification event
  await entities.audit_log.create({
    entity_type: 'nc_canon_entry',
    entity_id: entryId,
    action: 'verified',
    user_id: user.id,
    timestamp: new Date().toISOString(),
    details: JSON.stringify({
      verified_by: verifiedBy,
      notes: notes || ''
    })
  });

  return {
    success: true,
    entry: updated,
    message: `Canon entry "${entry.title}" verified by ${verifiedBy}`
  };
}
