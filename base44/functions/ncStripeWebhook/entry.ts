import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const rawBody = await req.text();
    const stripeSignature = req.headers.get('stripe-signature') || '';
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    const nowIso = new Date().toISOString();

    // Parse event body
    let event;
    try { event = JSON.parse(rawBody); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const eventId = event.id || 'evt_unknown';
    const eventType = event.type || 'unknown';

    // Idempotency: skip if already processed
    const existing = await base44.asServiceRole.entities.StripeEvent.list({ filter: { event_id: eventId } }).catch(() => []);
    if (existing && existing.length > 0) {
      return Response.json({ received: true, status: 'duplicate' });
    }

    // Signature validation (if secret configured)
    let signatureValid = false;
    if (webhookSecret && stripeSignature) {
      try {
        const parts = stripeSignature.split(',').reduce((acc, p) => { const [k, v] = p.split('='); acc[k] = v; return acc; }, {});
        const t = parts.t; const v1 = parts.v1;
        const signedPayload = `${t}.${rawBody}`;
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey('raw', enc.encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload));
        const computed = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
        signatureValid = (computed === v1);
      } catch { signatureValid = false; }
    }

    const obj = event.data?.object || {};
    const customer_id = obj.customer || '';
    const subscription_id = obj.subscription || '';
    const invoice_id = obj.invoice || '';
    const payment_intent_id = obj.payment_intent || '';
    const amount = obj.amount_total || obj.amount || 0;

    // Record event
    const recorded = await base44.asServiceRole.entities.StripeEvent.create({
      event_id: eventId, event_type: eventType, api_version: event.api_version || '',
      created_at_stripe: event.created ? new Date(event.created * 1000).toISOString() : '',
      received_at: nowIso, data: event, object_id: obj.id || '', object_type: obj.object || '',
      customer_id, subscription_id, invoice_id, payment_intent_id, amount, currency: obj.currency || 'usd',
      processed: false, status: signatureValid || !webhookSecret ? 'received' : 'failed',
      processing_error: (!webhookSecret) ? 'webhook_secret_not_configured' : (!signatureValid ? 'signature_invalid' : '')
    });

    if (!signatureValid && webhookSecret) {
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Process known event types
    let actionTaken = '';
    try {
      if (eventType.startsWith('invoice.')) {
        const invoices = await base44.asServiceRole.entities.Invoice.list({ filter: { stripe_invoice_id: invoice_id } }).catch(() => []);
        if (invoices?.[0]) {
          const statusMap = { 'invoice.paid': 'paid', 'invoice.payment_failed': 'open', 'invoice.finalized': 'open' };
          await base44.asServiceRole.entities.Invoice.update(invoices[0].id, { status: statusMap[eventType] || invoices[0].status, paid_at: eventType === 'invoice.paid' ? nowIso : invoices[0].paid_at, amount_paid: eventType === 'invoice.paid' ? obj.amount_paid / 100 : invoices[0].amount_paid });
          actionTaken = `invoice:${eventType}`;
        }
      } else if (eventType.startsWith('customer.subscription.')) {
        const subs = await base44.asServiceRole.entities.Subscription.list({ filter: { stripe_subscription_id: subscription_id } }).catch(() => []);
        if (subs?.[0]) {
          const statusMap = { 'customer.subscription.deleted': 'cancelled', 'customer.subscription.updated': 'active', 'customer.subscription.trial_will_end': 'trialing' };
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: statusMap[eventType] || subs[0].status, current_period_start: obj.current_period_start ? new Date(obj.current_period_start * 1000).toISOString() : subs[0].current_period_start, current_period_end: obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : subs[0].current_period_end });
          actionTaken = `subscription:${eventType}`;
        }
      } else if (eventType === 'payment_intent.payment_failed') {
        const subs = await base44.asServiceRole.entities.Subscription.list({ filter: { stripe_customer_id: customer_id } }).catch(() => []);
        if (subs?.[0]) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, { last_payment_status: 'failed', failed_payment_count: (subs[0].failed_payment_count || 0) + 1, last_payment_attempt: nowIso });
          actionTaken = 'payment_failed_recorded';
        }
      } else if (eventType === 'charge.refunded') {
        actionTaken = 'refund_recorded';
      } else if (eventType === 'charge.dispute.created') {
        // Inline chargeback handling: create review record, hold payouts, notify Founder
        const disputeId = obj.id || '';
        const chargeId = obj.charge || '';
        const disputeAmount = obj.amount || 0;
        const disputeReason = obj.reason || 'general';
        const cbNow = nowIso;
        const reasonMap = { fraudulent: 'fraudulent', duplicate: 'duplicate', product_not_received: 'service_issue', product_unacceptable: 'service_issue', credit_not_processed: 'billing_error', incorrect: 'billing_error', general: 'other' };
        const refundReason = reasonMap[disputeReason] || 'other';
        const refundKey = 'CB-' + Math.random().toString(36).slice(2, 8).toUpperCase();
        try {
          const refundReq = await base44.asServiceRole.entities.RefundRequest.create({
            request_key: refundKey,
            invoice_id: invoice_id || '',
            invoice_number: invoice_id || '',
            subscription_id: subscription_id || '',
            customer_name: customer_id || 'stripe_customer',
            stripe_charge_id: chargeId || '',
            original_amount: disputeAmount || 0,
            refund_amount: disputeAmount || 0,
            refund_reason: refundReason,
            reason_details: `Chargeback dispute ${disputeId} opened by cardholder. Reason: ${disputeReason}. Review record auto-created by webhook. Founder approval required before refund or adjustment.`,
            requested_by: 'stripe_webhook',
            requested_at: cbNow,
            refund_type: 'full',
            approval_required: true,
            approval_status: 'pending',
            chargeback_triggered: true,
            chargeback_id: disputeId,
            financial_impact: disputeAmount || 0,
            status: 'pending',
            audit_trail: [
              { action: 'dispute_flagged', at: cbNow, by: 'stripe_webhook', detail: `Dispute ${disputeId} flagged on charge ${chargeId}` },
              { action: 'review_record_created', at: cbNow, by: 'stripe_webhook', detail: `RefundRequest ${refundKey} created — pending Founder approval` }
            ],
            memory_references: [`refund_request:${refundKey}`, `chargeback:${disputeId}`],
            tags: ['chargeback', 'production']
          });
          const cbActions = ['flag_dispute', 'create_refund_request'];
          let payoutsHeld = 0;
          const linkedPayouts = await base44.asServiceRole.entities.PayoutItem.filter({ stripe_charge_id: chargeId }).catch(() => []);
          for (const po of (linkedPayouts || [])) {
            try {
              await base44.asServiceRole.entities.PayoutItem.update(po.id, {
                status: 'held',
                dispute_status: 'open',
                approval_required: true,
                audit_trail: [...(po.audit_trail || []), { action: 'payout_held', at: cbNow, by: 'stripe_webhook', detail: `Held due to chargeback ${disputeId} on charge ${chargeId}. RefundRequest ${refundKey}.` }],
                notes: (po.notes ? po.notes + '\n' : '') + `Held for chargeback review ${disputeId}.`
              });
              payoutsHeld++;
            } catch {}
          }
          cbActions.push('hold_payouts');
          try {
            await base44.asServiceRole.entities.Notification.create({
              title: `Chargeback dispute opened — ${refundKey}`,
              message: `Chargeback ${disputeId} on charge ${chargeId} for ${(disputeAmount / 100).toFixed(2)} ${(obj.currency || 'usd').toUpperCase()}. RefundRequest ${refundKey} created, ${payoutsHeld} payout(s) held. Founder approval required before refund or adjustment.`,
              type: 'approval_needed',
              severity: 'critical',
              action_url: '/payouts',
              action_label: 'Review Chargeback',
              source_entity_type: 'RefundRequest',
              source_entity_id: refundReq.id
            });
            cbActions.push('notify_founder');
          } catch {}
          await base44.asServiceRole.entities.StripeEvent.update(recorded.id, {
            action_taken: 'dispute_handled:' + cbActions.join(','),
            status: 'processed',
            linked_subscription_record: subscription_id || '',
            linked_invoice_record: invoice_id || '',
            tags: ['chargeback', 'production']
          });
          actionTaken = 'dispute_handled:' + cbActions.join(',');
        } catch (e) {
          actionTaken = 'dispute_handler_error:' + e.message;
        }
      } else {
        actionTaken = 'logged';
      }
    } catch (e) {
      actionTaken = `error:${e.message}`;
    }

    // Record financial transaction for paid invoices
    if (eventType === 'invoice.paid' && amount > 0) {
      await base44.asServiceRole.entities.FinancialTransaction.create({
        transaction_date: nowIso.slice(0, 10), transaction_type: 'revenue', category: 'subscription',
        amount: amount / 100, description: `Stripe invoice ${invoice_id} paid`, status: 'completed'
      });
    }

    await base44.asServiceRole.entities.StripeEvent.update(recorded.id, { processed: true, action_taken: actionTaken, status: 'processed' });
    return Response.json({ received: true, event_id: eventId, action_taken: actionTaken });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});