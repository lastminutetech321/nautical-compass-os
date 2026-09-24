import { base44, getSecrets } from '@base44/sdk';
import { logLegalAPICall } from '../shared/legal.ts';

export async function handler(event: any) {
  const { user_id } = event;
  try {
    const flags = await base44.getEntity('nc_feature_flags', 'nc_legal_identity_verify');
    if (!flags || !flags.enabled) return { success: false, error: 'Feature disabled' };
    const secrets = await getSecrets();
    const stripeKey = secrets.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured');
    const response = await fetch('https://api.stripe.com/v1/identity/verification_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        type: 'document',
        'metadata[user_id]': user_id
      })
    });
    if (!response.ok) throw new Error(`Stripe Identity API error: ${response.status}`);
    const session = await response.json();
    await base44.updateEntity('users', user_id, {
      stripe_identity_session_id: session.id,
      identity_verified: false
    });
    await logLegalAPICall('Stripe Identity', '/v1/identity/verification_sessions', 200, null, user_id);
    return { success: true, session_url: session.url };
  } catch (error) {
    await logLegalAPICall('Stripe Identity', '/v1/identity/verification_sessions', 500, error.message, user_id);
    throw error;
  }
}
