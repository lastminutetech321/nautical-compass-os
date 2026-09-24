/**
 * Welcome Brian Casto – Founder-Directed Standby Agent
 * Case ID: 6ab3249d8d6aaa385649de04
 */

export default async function handler(req, context) {
  const { base44, userId } = context;
  const body = await req.json().catch(() => ({}));
  const BRIAN_CASE_ID = '6ab3249d8d6aaa385649de04';
  const timestamp = new Date().toISOString();

  const isBrian = (body.name && body.name.toLowerCase().includes('brian casto')) || 
                  (body.email && body.email.toLowerCase().includes('brian'));

  if (!isBrian) {
    return new Response(JSON.stringify({ status: 'standby' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  await base44.entity('CaseTimeline').create({
    caseId: BRIAN_CASE_ID,
    timestamp,
    event: 'arrival_detected',
    channel: body.source || 'intake_form',
    details: { message: 'Brian Casto has entered the system', payload: body },
    actor: 'system',
    visibility: 'internal'
  });

  const welcomeMsg = 'Welcome to Nautical Compass, Brian! I am your dedicated NC agent, here to guide you through every step. How can I help you today? Legal assistance, workforce onboarding, rights restoration, or another service? I will stay with you throughout the entire process.';

  await base44.entity('UserNotification').create({
    userId: userId || body.userId,
    title: 'Welcome to Nautical Compass',
    message: welcomeMsg,
    type: 'greeting',
    read: false,
    timestamp
  });

  await base44.entity('CaseTimeline').create({
    caseId: BRIAN_CASE_ID,
    timestamp: new Date().toISOString(),
    event: 'welcome_sent',
    channel: body.source || 'app',
    details: { message: welcomeMsg },
    actor: 'nc_agent',
    visibility: 'external'
  });

  await base44.entity('SystemNotification').create({
    type: 'founder_priority',
    title: 'Brian Casto has arrived',
    message: 'Brian Casto entered via ' + (body.source || 'intake form') + '. Agent is now actively engaged.',
    caseId: BRIAN_CASE_ID,
    timestamp,
    severity: 'high',
    read: false
  });

  return new Response(JSON.stringify({ status: 'success', message: 'Brian welcomed' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
