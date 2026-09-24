/**
 * Monitor Survival Metrics and Cash Runway
 * 
 * Reviews SurvivalMetric records, calculates current runway,
 * alerts if runway falls below 3 months, and recommends
 * immediate revenue actions if MRR remains zero.
 */

export default async function handler(req, context) {
  const { base44 } = context;
  
  try {
    // Fetch all SurvivalMetric records, sorted by date descending
    const metrics = await base44.entity('SurvivalMetric').list({
      sort: [{ field: 'date', direction: 'desc' }],
      limit: 100
    });

    if (!metrics || metrics.length === 0) {
      return {
        status: 'warning',
        message: 'No survival metrics found. Cannot calculate runway.',
        runway_months: null,
        recommendation: 'Initialize survival tracking by creating first SurvivalMetric record.'
      };
    }

    // Get the most recent metric
    const latest = metrics[0];
    const currentCash = latest.cash_balance || 0;
    const monthlyBurn = latest.monthly_burn || 0;
    const mrr = latest.mrr || 0;
    const netBurn = monthlyBurn - mrr;

    // Calculate runway in months
    let runwayMonths = null;
    if (netBurn > 0) {
      runwayMonths = currentCash / netBurn;
    } else if (monthlyBurn === 0) {
      runwayMonths = Infinity;
    } else {
      // MRR >= monthly burn - sustainable
      runwayMonths = Infinity;
    }

    // Determine status and alerts
    let status = 'healthy';
    const alerts = [];
    const recommendations = [];

    // Alert if runway < 3 months
    if (runwayMonths !== null && runwayMonths !== Infinity && runwayMonths < 3) {
      status = 'critical';
      alerts.push(`CRITICAL: Cash runway is ${runwayMonths.toFixed(1)} months - below 3-month threshold`);
      recommendations.push('Immediate action required: reduce burn or secure funding within 30 days');
    } else if (runwayMonths !== null && runwayMonths !== Infinity && runwayMonths < 6) {
      status = 'warning';
      alerts.push(`WARNING: Cash runway is ${runwayMonths.toFixed(1)} months - approaching critical threshold`);
      recommendations.push('Begin fundraising conversations or cost reduction planning');
    }

    // Alert if MRR is zero
    if (mrr === 0) {
      if (status === 'healthy') status = 'warning';
      alerts.push('MRR is $0 - no recurring revenue');
      recommendations.push(
        'IMMEDIATE REVENUE ACTIONS REQUIRED:',
        '1. Launch pilot program with 3-5 founding clients within 30 days',
        '2. Offer early-access pricing ($500-1500/month per client)',
        '3. Target talent managers actively seeking tech solutions',
        '4. Validate product-market fit before scaling marketing spend',
        '5. Consider hybrid compensation models (rev share + platform fee)'
      );
    }

    // Check burn rate trend (compare last 3 months if available)
    if (metrics.length >= 3) {
      const recent3 = metrics.slice(0, 3);
      const avgBurn = recent3.reduce((sum, m) => sum + (m.monthly_burn || 0), 0) / 3;
      const burnTrend = monthlyBurn - avgBurn;
      
      if (burnTrend > avgBurn * 0.2) {
        alerts.push(`Burn rate increasing: current $${monthlyBurn} vs 3-month avg $${avgBurn.toFixed(0)}`);
        recommendations.push('Review and justify recent cost increases');
      }
    }

    // Calculate days until zero cash (for granular tracking)
    let daysUntilZero = null;
    if (netBurn > 0) {
      const dailyBurn = netBurn / 30;
      daysUntilZero = Math.floor(currentCash / dailyBurn);
    }

    // Create alert record if status is warning or critical
    if (status !== 'healthy') {
      await base44.entity('Alert').create({
        type: 'survival_metric',
        severity: status === 'critical' ? 'high' : 'medium',
        title: alerts[0],
        description: alerts.join('\n'),
        metadata: {
          runway_months: runwayMonths,
          cash_balance: currentCash,
          monthly_burn: monthlyBurn,
          mrr: mrr,
          net_burn: netBurn,
          recommendations: recommendations
        },
        created_at: new Date().toISOString()
      });
    }

    return {
      status,
      runway_months: runwayMonths === Infinity ? 'sustainable' : runwayMonths,
      days_until_zero: daysUntilZero,
      current_metrics: {
        cash_balance: currentCash,
        monthly_burn: monthlyBurn,
        mrr: mrr,
        net_burn: netBurn,
        last_updated: latest.date
      },
      alerts,
      recommendations,
      historical_data: {
        total_records: metrics.length,
        date_range: {
          earliest: metrics[metrics.length - 1]?.date,
          latest: metrics[0]?.date
        }
      }
    };

  } catch (error) {
    console.error('Error monitoring survival metrics:', error);
    return {
      status: 'error',
      error: error.message,
      recommendation: 'Check SurvivalMetric entity configuration and data integrity'
    };
  }
}
