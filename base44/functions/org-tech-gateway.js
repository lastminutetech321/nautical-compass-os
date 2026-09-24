/**
 * org-tech-gateway.js
 * CRITICAL SECURITY BOUNDARY: Validates organization claims before dispatch.
 * ZERO-TRUST: No raw WorkerProfile fields; OrganizationMembership is the ONLY authority.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { user_id, organization_name, action, payload } = await req.json();

  if (!user_id || !organization_name || !action) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // CRITICAL: Fetch verified membership ONLY from OrganizationMembership
  const { data: membership, error: membershipError } = await supabase
    .from('OrganizationMembership')
    .select('id, organization_id, role, status, verified_at')
    .eq('user_id', user_id)
    .eq('status', 'active')
    .not('verified_at', 'is', null)
    .single();

  if (membershipError || !membership) {
    return new Response(JSON.stringify({ 
      error: 'Unauthorized', 
      message: 'No verified active membership found',
      debug: { user_id, organization_name }
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Fetch organization by ID from verified membership
  const { data: org, error: orgError } = await supabase
    .from('Organization')
    .select('id, name, status')
    .eq('id', membership.organization_id)
    .eq('status', 'active')
    .single();

  if (orgError || !org) {
    return new Response(JSON.stringify({ 
      error: 'Organization not found or inactive',
      debug: { organization_id: membership.organization_id }
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // CRITICAL: Name match validation (case-insensitive, normalized)
  const normalizedOrgName = org.name.toLowerCase().trim();
  const normalizedClaimName = organization_name.toLowerCase().trim();

  if (normalizedOrgName !== normalizedClaimName) {
    return new Response(JSON.stringify({ 
      error: 'Organization name mismatch',
      message: 'Claimed organization name does not match verified membership',
      debug: { 
        claimed: organization_name, 
        verified: org.name,
        membership_org_id: membership.organization_id
      }
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Role-based authorization for sensitive actions
  const adminActions = ['create_project', 'invite_member', 'delete_member', 'update_settings'];
  if (adminActions.includes(action) && membership.role !== 'admin' && membership.role !== 'owner') {
    return new Response(JSON.stringify({ 
      error: 'Insufficient permissions',
      message: `Action '${action}' requires admin or owner role`,
      debug: { user_role: membership.role }
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Dispatch to appropriate handler (mock for now — integrate real handlers)
  const result = await dispatchAction(action, {
    user_id,
    organization_id: org.id,
    organization_name: org.name,
    membership_role: membership.role,
    payload
  });

  return new Response(JSON.stringify({ 
    success: true, 
    organization: { id: org.id, name: org.name },
    membership: { role: membership.role, verified_at: membership.verified_at },
    result 
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Dispatch action to appropriate handler.
 * FUTURE: Route to real entity operations, workflows, or NC workers.
 */
async function dispatchAction(action, context) {
  // Mock implementation — replace with real routing
  console.log(`[org-tech-gateway] Dispatching action: ${action}`, context);
  
  switch (action) {
    case 'create_project':
      return { message: 'Project creation queued', context };
    case 'invite_member':
      return { message: 'Invitation sent', context };
    default:
      return { message: 'Action processed', context };
  }
}
