/**
 * JurisEngine Dependency Validation Function
 * Checks that NC Canon has verified entries and Evidence Vault access controls are operational
 */

import { FunctionContext } from '@base44/sdk';

interface ValidationResult {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  canonStatus: {
    totalEntries: number;
    verifiedEntries: number;
    readyForJuris: boolean;
  };
  vaultStatus: {
    accessControlsActive: boolean;
    testPassed: boolean;
  };
}

export default async function validateJurisEngineDependencies(
  input: {},
  context: FunctionContext
): Promise<ValidationResult> {
  const { entities, functions } = context;
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Check NC Canon
  const allCanonEntries = await entities.nc_canon_entry.list({ limit: 1000 });
  const verifiedEntries = allCanonEntries.filter((e: any) => e.verified === true);

  const canonReady = verifiedEntries.length > 0;
  if (!canonReady) {
    blockers.push('NC Canon has no verified entries');
  }
  if (verifiedEntries.length < 5) {
    warnings.push(`Only ${verifiedEntries.length} verified canon entries (recommend 10+)`);
  }

  // Check Evidence Vault access controls
  let vaultAccessControlsActive = false;
  let vaultTestPassed = false;

  try {
    // Create a test evidence item
    const testItem = await entities.evidence_vault_item.create({
      title: 'JurisEngine Dependency Test Item',
      evidence_type: 'test',
      date_acquired: new Date().toISOString(),
      access_level: 'restricted',
      owner_id: 'test_owner_id',
      verified: false
    });

    // Test access control function
    const accessResult = await functions.evidence_vault_check_access({
      itemId: testItem.id,
      userId: 'unauthorized_user',
      requestedAction: 'read'
    });

    vaultAccessControlsActive = true;
    vaultTestPassed = accessResult.granted === false; // Should deny unauthorized access

    // Clean up test item
    await entities.evidence_vault_item.delete(testItem.id);

    if (!vaultTestPassed) {
      blockers.push('Evidence Vault access controls failed validation test');
    }
  } catch (error) {
    blockers.push(`Evidence Vault access control error: ${error.message}`);
  }

  const ready = blockers.length === 0;

  return {
    ready,
    blockers,
    warnings,
    canonStatus: {
      totalEntries: allCanonEntries.length,
      verifiedEntries: verifiedEntries.length,
      readyForJuris: canonReady
    },
    vaultStatus: {
      accessControlsActive: vaultAccessControlsActive,
      testPassed: vaultTestPassed
    }
  };
}
