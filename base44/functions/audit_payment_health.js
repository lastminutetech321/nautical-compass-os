export default async function handler(context) {
  const { base44, user } = context;
  if (!user || user.role !== 'admin') {
    return { statusCode: 403, body: { error: 'Admin access required' } };
  }
  try {
    const auditResults = { revenue_leaks: [], cost_opportunities: [], metrics: { total_transactions: 0, unreconciled_count: 0, unreconciled_amount: 0, failed_payments_count: 0, failed_payments_amount: 0, disputed_count: 0, disputed_amount: 0, stripe_fees_total: 0, platform_fees_total: 0, net_revenue_total: 0 }, timestamp: new Date().toISOString() };
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const transactions = await base44.entity('payment_transaction').find({ where: { created_at: { $gte: ninetyDaysAgo.toISOString() } }, limit: 10000 });
    auditResults.metrics.total_transactions = transactions.length;
    for (const txn of transactions) {
      if (!txn.net_revenue && txn.amount) {
        const stripeFee = txn.stripe_fee || (txn.amount * 0.029 + 30);
        const platformFee = txn.platform_fee || 0;
        txn.net_revenue = txn.amount - stripeFee - platformFee;
        await base44.entity('payment_transaction').update(txn.id, { stripe_fee: stripeFee, platform_fee: platformFee, net_revenue: txn.net_revenue });
      }
      auditResults.metrics.stripe_fees_total += (txn.stripe_fee || 0);
      auditResults.metrics.platform_fees_total += (txn.platform_fee || 0);
      auditResults.metrics.net_revenue_total += (txn.net_revenue || 0);
      if (!txn.reconciled) {
        auditResults.metrics.unreconciled_count++;
        auditResults.metrics.unreconciled_amount += txn.amount;
        if (txn.amount > 1000) {
          const leak = await base44.entity('revenue_leak_detection').create({ leak_type: 'unreconciled_transaction', severity: txn.amount > 10000 ? 'high' : 'medium', user_id: txn.user_id, transaction_id: txn.id, estimated_loss: txn.amount, description: `Unreconciled transaction of $${(txn.amount / 100).toFixed(2)}`, detection_data: { transaction: txn }, status: 'detected' });
          auditResults.revenue_leaks.push(leak);
        }
      }
      if (txn.status === 'failed') {
        auditResults.metrics.failed_payments_count++;
        auditResults.metrics.failed_payments_amount += txn.amount;
        const leak = await base44.entity('revenue_leak_detection').create({ leak_type: 'failed_payment', severity: 'high', user_id: txn.user_id, transaction_id: txn.id, subscription_id: txn.subscription_id, estimated_loss: txn.amount, description: `Failed payment of $${(txn.amount / 100).toFixed(2)}`, detection_data: { transaction: txn }, status: 'detected' });
        auditResults.revenue_leaks.push(leak);
      }
      if (txn.status === 'disputed') {
        auditResults.metrics.disputed_count++;
        auditResults.metrics.disputed_amount += txn.amount;
        const leak = await base44.entity('revenue_leak_detection').create({ leak_type: 'disputed_charge', severity: 'critical', user_id: txn.user_id, transaction_id: txn.id, estimated_loss: txn.amount, description: `Disputed charge of $${(txn.amount / 100).toFixed(2)}`, detection_data: { transaction: txn }, status: 'detected' });
        auditResults.revenue_leaks.push(leak);
      }
    }
    const avgMonthlyRevenue = auditResults.metrics.net_revenue_total / 3;
    if (auditResults.metrics.stripe_fees_total > avgMonthlyRevenue * 0.03) {
      const potentialSavings = auditResults.metrics.stripe_fees_total - (avgMonthlyRevenue * 0.029);
      if (potentialSavings > 10000) {
        const opportunity = await base44.entity('cost_optimization_opportunity').create({ category: 'payment_processing', opportunity_type: 'stripe_fee_optimization', current_cost: auditResults.metrics.stripe_fees_total, potential_savings: potentialSavings, savings_frequency: 'monthly', implementation_effort: 'medium', priority_score: Math.min(100, (potentialSavings / 1000)), description: 'Stripe fees exceed optimal rate - negotiate volume discount or optimize payment methods', recommended_action: 'Contact Stripe for volume pricing review', analysis_data: { avg_fee_percent: (auditResults.metrics.stripe_fees_total / auditResults.metrics.net_revenue_total) }, status: 'identified' });
        auditResults.cost_opportunities.push(opportunity);
      }
    }
    return { statusCode: 200, body: auditResults };
  } catch (error) {
    return { statusCode: 500, body: { error: error.message } };
  }
}