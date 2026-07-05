import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';

export default function TransactionLogger({ onLog, logging }) {
  const [form, setForm] = useState({
    transaction_type: 'expense',
    category: 'other_expense',
    amount: '',
    description: '',
    vendor: '',
    recurring: false,
    recurring_frequency: 'one_time',
    transaction_date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = () => {
    if (!form.amount || !form.description) return;
    onLog({ ...form, amount: parseFloat(form.amount) });
    setForm({ ...form, amount: '', description: '', vendor: '' });
  };

  return (
    <Card className="p-4 bg-slate-900/50 border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">Log Financial Transaction</h3>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-400">Type</Label>
            <Select value={form.transaction_type} onValueChange={(v) => setForm({ ...form, transaction_type: v })}>
              <SelectTrigger className="bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-400">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['api_cost', 'hosting', 'ai_usage', 'payroll', 'marketing', 'tools', 'infrastructure', 'other_expense', 'subscription', 'other_revenue'].map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-400">Amount ($)</Label>
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="bg-slate-900 border-slate-700" />
          </div>
          <div>
            <Label className="text-xs text-slate-400">Date</Label>
            <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} className="bg-slate-900 border-slate-700" />
          </div>
        </div>

        <div>
          <Label className="text-xs text-slate-400">Description</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this for?" className="bg-slate-900 border-slate-700" />
        </div>

        <div>
          <Label className="text-xs text-slate-400">Vendor (optional)</Label>
          <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Vendor name" className="bg-slate-900 border-slate-700" />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox checked={form.recurring} onCheckedChange={(v) => setForm({ ...form, recurring: !!v })} />
          <Label className="text-xs text-slate-300">Recurring</Label>
          {form.recurring && (
            <Select value={form.recurring_frequency} onValueChange={(v) => setForm({ ...form, recurring_frequency: v })}>
              <SelectTrigger className="w-32 h-7 bg-slate-900 border-slate-700 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['daily', 'weekly', 'monthly', 'quarterly', 'annual'].map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={logging || !form.amount || !form.description} className="w-full" size="sm">
          {logging ? 'Logging...' : 'Log Transaction'}
        </Button>
      </div>
    </Card>
  );
}