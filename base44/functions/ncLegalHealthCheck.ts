import { getSecrets } from '@base44/sdk';
import { logLegalAPICall, fetchCourtListenerAlerts, searchFederalRegister, fetchCornellLIIStatute } from '../shared/legal.ts';

export async function handler() {
  const results = [];
  try {
    await fetchCourtListenerAlerts('1');
    results.push({ service: 'CourtListener', status: 'healthy' });
  } catch (error) {
    results.push({ service: 'CourtListener', status: 'unhealthy', error: error.message });
    await logLegalAPICall('CourtListener', '/health', 500, error.message);
  }
  try {
    await searchFederalRegister('labor', false);
    results.push({ service: 'FederalRegister', status: 'healthy' });
  } catch (error) {
    results.push({ service: 'FederalRegister', status: 'unhealthy', error: error.message });
    await logLegalAPICall('FederalRegister', '/health', 500, error.message);
  }
  try {
    await fetchCornellLIIStatute('29', '201');
    results.push({ service: 'Cornell LII', status: 'healthy' });
  } catch (error) {
    results.push({ service: 'Cornell LII', status: 'unhealthy', error: error.message });
    await logLegalAPICall('Cornell LII', '/health', 500, error.message);
  }
  const secrets = await getSecrets();
  results.push({ service: 'Stripe Identity', status: secrets.STRIPE_SECRET_KEY ? 'configured' : 'not_configured' });
  results.push({ service: 'EEOC', status: 'no_api_available' });
  results.push({ service: 'NLRB', status: 'no_api_available' });
  results.push({ service: 'CFPB', status: 'no_api_available' });
  return { timestamp: new Date().toISOString(), results };
}
