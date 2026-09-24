/**
 * Shared legal helpers for NC Legal API integrations.
 * Phase 4: CourtListener, Federal Register, no-key connectors
 */

import { twilioSend, resolveTwilioFrom } from './sms.ts';
import { getSecrets } from '@base44/sdk';

export async function fetchCourtListenerAlerts(docketId: string) {
  const secrets = await getSecrets();
  const apiKey = secrets.COURTLISTENER_API_KEY;
  if (!apiKey) throw new Error('COURTLISTENER_API_KEY not configured');
  const url = `https://www.courtlistener.com/api/rest/v3/dockets/${docketId}/`;
  const response = await fetch(url, {
    headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error(`CourtListener API error: ${response.status}`);
  return response.json();
}

export async function fetchRECAPDocument(docId: number) {
  const secrets = await getSecrets();
  const apiKey = secrets.COURTLISTENER_API_KEY;
  if (!apiKey) throw new Error('COURTLISTENER_API_KEY not configured');
  const url = `https://www.courtlistener.com/api/rest/v3/recap-documents/${docId}/`;
  const response = await fetch(url, {
    headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error(`CourtListener RECAP API error: ${response.status}`);
  return response.json();
}

export async function searchFederalRegister(query: string, openForComment = true) {
  const params = new URLSearchParams({
    conditions: JSON.stringify({ term: query, ...(openForComment ? { type: 'PRORULE' } : {}) }),
    fields: 'document_number,title,publication_date,comment_end_date,agencies,abstract,html_url',
    per_page: '20'
  });
  const url = `https://www.federalregister.gov/api/v1/documents.json?${params}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Federal Register API error: ${response.status}`);
  const data = await response.json();
  return data.results || [];
}

export async function fetchCornellLIIStatute(title: string, section: string) {
  const url = `https://www.law.cornell.edu/uscode/text/${title}/${section}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cornell LII error: ${response.status}`);
  const html = await response.text();
  const textMatch = html.match(/<div class="field-item even"[^>]*>([\s\S]*?)<\/div>/);
  const text = textMatch ? textMatch[1].replace(/<[^>]+>/g, '').trim() : 'Text extraction failed';
  return { text, url };
}

export async function getEEOCFilingInstructions(state: string) {
  return {
    url: 'https://www.eeoc.gov/filing-charge-discrimination',
    instructions: `File online at https://publicportal.eeoc.gov/Portal/Login.aspx or call 1-800-669-4000.`
  };
}

export async function getNLRBFilingInstructions(region: string) {
  return {
    url: 'https://www.nlrb.gov/about-nlrb/who-we-are/regional-offices',
    instructions: `Find your regional office and file online via https://www.nlrb.gov/reports/nlrb-forms/e-filing`
  };
}

export async function getCFPBComplaintInstructions() {
  return {
    url: 'https://www.consumerfinance.gov/complaint/',
    instructions: `Submit your consumer complaint online at https://www.consumerfinance.gov/complaint/`
  };
}

export async function sendCourtDateReminder(to: string, courtDate: string, courtName: string, caseNumber: string, userConsented: boolean, userOptedOut: boolean) {
  if (!userConsented || userOptedOut) {
    return { success: false, error: 'User has not consented or has opted out' };
  }
  const message = `Reminder: Court date for case ${caseNumber} at ${courtName} on ${courtDate}. Reply STOP to unsubscribe.`;
  try {
    const from = await resolveTwilioFrom();
    const result = await twilioSend(to, message, from, `court_reminder_${caseNumber}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function logLegalAPICall(provider: string, endpoint: string, statusCode: number, errorCode?: string, userId?: string) {
  const { base44 } = await import('@base44/sdk');
  await base44.createEntity('nc_legal_api_log', {
    provider,
    endpoint,
    status_code: statusCode,
    error_code: errorCode || null,
    user_id: userId || null,
    timestamp: new Date().toISOString()
  });
}
