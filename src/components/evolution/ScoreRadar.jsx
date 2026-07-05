import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function ScoreRadar({ proposal }) {
  const data = [
    { metric: 'Business', value: proposal.business_value_score || 0 },
    { metric: 'Engineering', value: proposal.engineering_value_score || 0 },
    { metric: 'Customer', value: proposal.customer_value_score || 0 },
    { metric: 'Legal', value: proposal.legal_value_score || 0 },
    { metric: 'Revenue', value: proposal.revenue_impact_score || 0 },
    { metric: 'Effort', value: proposal.implementation_effort_score || 0 },
    { metric: 'Risk', value: proposal.risk_score || 0 }
  ];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadarChart data={data}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 8 }} angle={90} />
        <Radar name="Scores" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}