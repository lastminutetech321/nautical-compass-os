/**
 * Evidence Vault Access Control Function
 * Validates user access to evidence vault items based on ownership and sharing rules
 */

import { FunctionContext } from '@base44/sdk';

interface CheckAccessInput {
  itemId: string;
  userId: string;
  requestedAction: 'read' | 'update' | 'delete';
}

interface AccessResult {
  granted: boolean;
  reason: string;
  accessLevel?: string;
}

export default async function checkEvidenceAccess(
  input: CheckAccessInput,
  context: FunctionContext
): Promise<AccessResult> {
  const { itemId, userId, requestedAction } = input;
  const { entities, user } = context;

  // Ensure authenticated
  if (!user) {
    return {
      granted: false,
      reason: 'Not authenticated'
    };
  }

  // Admin override
  if (user.roles?.includes('admin')) {
    return {
      granted: true,
      reason: 'Admin access',
      accessLevel: 'admin'
    };
  }

  // Fetch the evidence item
  const item = await entities.evidence_vault_item.get(itemId);
  if (!item) {
    return {
      granted: false,
      reason: 'Item not found'
    };
  }

  // Owner check
  if (item.owner_id === userId) {
    return {
      granted: true,
      reason: 'Owner access',
      accessLevel: 'owner'
    };
  }

  // Shared access check
  const sharedWith = item.shared_with ? JSON.parse(item.shared_with) : [];
  const isShared = Array.isArray(sharedWith) && sharedWith.includes(userId);

  if (isShared) {
    // Shared users can only read
    if (requestedAction === 'read') {
      return {
        granted: true,
        reason: 'Shared access',
        accessLevel: 'shared'
      };
    }
    return {
      granted: false,
      reason: 'Shared users have read-only access'
    };
  }

  // Access level check for restricted items
  if (item.access_level === 'restricted') {
    return {
      granted: false,
      reason: 'Item is restricted and user is not owner or shared recipient'
    };
  }

  // Public items (if access_level is 'public')
  if (item.access_level === 'public' && requestedAction === 'read') {
    return {
      granted: true,
      reason: 'Public access',
      accessLevel: 'public'
    };
  }

  return {
    granted: false,
    reason: 'Access denied'
  };
}
