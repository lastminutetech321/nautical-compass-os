import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export function RevenueExpenseTrend({ snapshots }) {
  const data = [...snapshots].reverse().map(s => ({
    date: s.snapshot_date ? new Date(s.snapshot_date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
    Revenue: s.mrr || 0,
    Expenses: s.total_expenses || 0,
    Profit: s.profit || 0
  }));

  return (
    <Card className="p-4 bg-slate-900/50 border-slate-800">
      <h3 className="text-sm font-semibold text-white mb-3">Revenue vs Expenses Trend</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
          <YAxis stroke="#94a3b8" fontSize={10} />
          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Line type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2} />
          <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} />
          <Line type="monotone" dataKey="Profit" stroke="#3b82f6" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function ExpenseBreakdown({ snapshot }) {
  const data = [
    { name: 'API', amount: snapshot.api_costs || 0, fill: '#3b82f6' },
    { name: 'Hosting', amount: snapshot.hosting_costs || 0, fill: '#8b5cf6' },
    { name: 'AI Usage', amount: snapshot.ai_usage_costs || 0, fill: '#ec4899' },
    { name: 'Payroll', amount: snapshot.payroll_costs || 0, fill: '#f59e0b' },
    { name: 'Marketing', amount: snapshot.marketing_costs || 0, fill: '#10b981' },
    { name: 'Tools', amount: snapshot.tools_costs || 0, fill: '#06b6d4' },
    { name: 'Other', amount: snapshot.other_costs || 0, fill: '#64748b' }
  ].filter(d => d.amount > 0);

  return (
    <Card className="p-4 bg-slate-900/50 border-slate-800">
      <h3 className="text-sm font-semibold text-white mb-3">Expense Breakdown (Monthly)</h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">No expenses logged yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
            <YAxis stroke="#94a3b8" fontSize={10} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}