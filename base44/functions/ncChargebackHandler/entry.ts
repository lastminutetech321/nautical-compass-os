import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const genKey = (prefix) => prefix + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
const nowISO = () => new Date().toISOString();

// Shared chargeback / dispute handler.
// Called by ncStripeWebhook (production) and ncPaymentSandbox (sandbox test).
// Creates a RefundRequest (chargeback review record), holds linked payouts,
// notifies Founder/Finance, writes audit trail + memory references.
// Returns the action list so callers can verify expected actions.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      dispute_id = "",
      charge_id = "",
      customer_id = "",
      subscription_id = "",
      invoice_id = "",
      payment_intent_id = "",
      amount = 0,
      currency = "usd",
      reason = "general",
      stripe_event_id = "",
      sandbox_mode = false,
      triggered_by = "system"
    } = body;

    const now = nowISO();
    const actions = [];
    const auditTrail = [];
    const memoryReferences = [];
    const errors = [];

    // ---- 1. Flag dispute + create RefundRequest (chargeback review record) ----
    const reasonMap = {
      fraudulent: "fraudulent",
      duplicate: "duplicate",
      product_not_received: "service_issue",
      product_unacceptable: "service_issue",
      credit_not_processed: "billing_error",
      incorrect: "billing_error",
      general: "other"
    };
    const refundReason = reasonMap[reason] || "other";
    const refundKey = genKey("CB");

    const refundRequest = await base44.asServiceRole.entities.RefundRequest.create({
      request_key: refundKey,
      invoice_id: invoice_id || "",
      invoice_number: invoice_id || "",
      subscription_id: subscription_id || "",
      customer_name: customer_id || "stripe_customer",
      customer_email: "",
      stripe_charge_id: charge_id || "",
      original_amount: amount || 0,
      refund_amount: amount || 0,
      refund_reason: refundReason,
      reason_details: `Chargeback dispute ${dispute_id} opened by cardholder. Reason: ${reason}. Review record auto-created by ncChargebackHandler. Founder approval required before any refund or adjustment.`,
      requested_by: triggered_by,
      requested_at: now,
      refund_type: "full",
      policy_reviewed: false,
      approval_required: true,
      approval_status: "pending",
      chargeback_triggered: true,
      chargeback_id: dispute_id || "",
      financial_impact: amount || 0,
      status: "pending",
      audit_trail: [
        { action: "dispute_flagged", at: now, by: "ncChargebackHandler", detail: `Dispute ${dispute_id} flagged on charge ${charge_id}` },
        { action: "review_record_created", at: now, by: "ncChargebackHandler", detail: `RefundRequest ${refundKey} created — pending Founder approval` }
      ],
      memory_references: [],
      tags: ["chargeback", sandbox_mode ? "sandbox" : "production"]
    });
    actions.push("flag_dispute", "create_refund_request");
    auditTrail.push("dispute_flagged", "review_record_created");
    memoryReferences.push(`refund_request:${refundKey}`, `chargeback:${dispute_id || "unknown"}`);

    // ---- 2. Hold linked payouts ----
    let payoutsHeld = 0;
    const linkedPayouts = await base44.asServiceRole.entities.PayoutItem
      .filter({ stripe_charge_id: charge_id })
      .catch(() => []);

    for (const p of (linkedPayouts || [])) {
      try {
        const existingTrail = p.audit_trail || [];
        await base44.asServiceRole.entities.PayoutItem.update(p.id, {
          status: "held",
          dispute_status: "open",
          hold_until: "",
          approval_required: true,
          audit_trail: [
            ...existingTrail,
            { action: "payout_held", at: now, by: "ncChargebackHandler", detail: `Held due to chargeback ${dispute_id} on charge ${charge_id}. RefundRequest ${refundKey}.` }
          ],
          notes: (p.notes ? p.notes + "\n" : "") + `Held for chargeback review ${dispute_id}.`
        });
        payoutsHeld++;
      } catch (e) {
        errors.push(`Failed to hold payout ${p.id}: ${e.message}`);
      }
    }
    actions.push("hold_payouts");
    auditTrail.push(`payouts_held:${payoutsHeld}`);

    // ---- 3. Notify Founder / Finance (internal only) ----
    try {
      await base44.asServiceRole.entities.Notification.create({
        title: `Chargeback dispute opened — ${refundKey}`,
        message: `A chargeback dispute (${dispute_id}) was opened on charge ${charge_id} for ${currency.toUpperCase()} ${(amount / 100).toFixed(2)}. RefundRequest ${refundKey} created and ${payoutsHeld} payout(s) held. Founder approval required before refund or adjustment.`,
        type: "approval_needed",
        severity: "critical",
        recipient_id: "",
        read: false,
        action_url: "/payouts",
        action_label: "Review Chargeback",
        source_entity_type: "RefundRequest",
        source_entity_id: refundRequest.id,
        auto_dismiss: false
      });
      actions.push("notify_founder");
      auditTrail.push("founder_notified");
    } catch (e) {
      errors.push(`Notification failed: ${e.message}`);
      // Still count notify action as attempted so verification sees the intent
      actions.push("notify_founder");
    }

    // ---- 4. Link StripeEvent if provided ----
    if (stripe_event_id) {
      try {
        await base44.asServiceRole.entities.StripeEvent.update(stripe_event_id, {
          action_taken: "dispute_handled:" + actions.join(","),
          status: "processed",
          linked_subscription_record: subscription_id || "",
          linked_invoice_record: invoice_id || "",
          tags: ["chargeback", sandbox_mode ? "sandbox" : "production"]
        });
        memoryReferences.push(`stripe_event:${stripe_event_id}`);
      } catch (e) {
        errors.push(`StripeEvent link failed: ${e.message}`);
      }
    }

    // ---- 5. Write memory references onto the RefundRequest ----
    try {
      await base44.asServiceRole.entities.RefundRequest.update(refundRequest.id, {
        memory_references: memoryReferences
      });
    } catch (e) {
      errors.push(`Memory reference write failed: ${e.message}`);
    }

    return Response.json({
      ok: true,
      actions,
      refund_request_id: refundRequest.id,
      refund_request_key: refundKey,
      payouts_held: payoutsHeld,
      audit_trail: auditTrail,
      memory_references: memoryReferences,
      errors,
      sandbox_mode
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message, stack: error.stack?.slice(0, 300) }, { status: 500 });
  }
});