/**
 * open-pilot-signup.js
 * PUBLIC ENDPOINT: Creates WorkerProfile + pilot OrganizationMembership.
 * HARDENED: No auto-admin on existing-org name match; requires verified owner approval.
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

  const { user_id, email, full_name, organization_name, pilot_mode } = await req.json();

  if (!user_id || !email || !full_name || !organization_name) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validate pilot_mode flag (must be explicitly true for pilot enrollment)
  if (pilot_mode !== true) {
    return new Response(JSON.stringify({ error: 'Invalid pilot enrollment request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check if WorkerProfile already exists
  const { data: existingProfile } = await supabase
    .from('WorkerProfile')
    .select('id')
    .eq('user_id', user_id)
    .single();

  if (existingProfile) {
    return new Response(JSON.stringify({ 
      error: 'Profile already exists',
      profile_id: existingProfile.id 
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // CRITICAL: Check if organization name already exists (case-insensitive)
  const normalizedOrgName = organization_name.toLowerCase().trim();
  const { data: existingOrgs } = await supabase
    .from('Organization')
    .select('id, name, status')
    .ilike('name', normalizedOrgName);

  let organizationId;
  let membershipRole = 'member'; // Default for pilot
  let membershipStatus = 'pending'; // Default for pilot
  let requiresApproval = false;

  if (existingOrgs && existingOrgs.length > 0) {
    // EXISTING ORGANIZATION FOUND
    const existingOrg = existingOrgs[0];
    organizationId = existingOrg.id;
    requiresApproval = true;

    // SECURITY: Never auto-grant admin on name match
    // Membership created as 'pending' — requires verified owner approval
    console.log(`[open-pilot-signup] Existing org found: ${existingOrg.name} (${existingOrg.id}). Membership pending approval.`);

  } else {
    // NEW ORGANIZATION — Create it
    const { data: newOrg, error: orgError } = await supabase
      .from('Organization')
      .insert({
        name: organization_name,
        status: 'active',
        pilot_program: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orgError || !newOrg) {
      console.error('[open-pilot-signup] Organization creation failed:', orgError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create organization',
        details: orgError?.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    organizationId = newOrg.id;
    membershipRole = 'owner'; // First member becomes owner
    membershipStatus = 'active'; // Auto-active for new org founder
    console.log(`[open-pilot-signup] New org created: ${newOrg.name} (${newOrg.id})`);
  }

  // Create WorkerProfile
  const { data: profile, error: profileError } = await supabase
    .from('WorkerProfile')
    .insert({
      user_id,
      full_name,
      email,
      pilot_program: true,
      profile_status: 'active',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (profileError || !profile) {
    console.error('[open-pilot-signup] WorkerProfile creation failed:', profileError);
    return new Response(JSON.stringify({ 
      error: 'Failed to create worker profile',
      details: profileError?.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create OrganizationMembership
  const { data: membership, error: membershipError } = await supabase
    .from('OrganizationMembership')
    .insert({
      user_id,
      organization_id: organizationId,
      role: membershipRole,
      status: membershipStatus,
      verified_at: membershipStatus === 'active' ? new Date().toISOString() : null,
      pilot_enrollment: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (membershipError || !membership) {
    console.error('[open-pilot-signup] OrganizationMembership creation failed:', membershipError);
    return new Response(JSON.stringify({ 
      error: 'Failed to create organization membership',
      details: membershipError?.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Return success with context
  return new Response(JSON.stringify({ 
    success: true,
    profile: { id: profile.id, full_name: profile.full_name },
    organization: { id: organizationId, name: organization_name },
    membership: { 
      id: membership.id, 
      role: membershipRole, 
      status: membershipStatus,
      requires_approval: requiresApproval
    },
    message: requiresApproval 
      ? 'Enrollment pending: existing organization requires owner approval' 
      : 'Pilot enrollment complete'
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}
