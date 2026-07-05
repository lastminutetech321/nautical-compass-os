import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare } from 'lucide-react';

export default function InteractionLogger({ customers, onLog, logging }) {
  const [form, setForm] = useState({
    customer_profile_id: '',
    customer_name: '',
    interaction_type: 'check_in',
    channel: 'email',
    description: '',
    outcome: '',
    sentiment: 'neutral',
    follow_up_required: false,
    follow_up_date: '',
    notes: ''
  });

  const handleSubmit = () => {
    if (!form.customer_profile_id || !form.description) return;
    onLog(form);
    setForm({
      ...form,
      description: '',
      outcome: '',
      follow_up_required: false,
      follow_up_date: '',
      notes: ''
    });
  };

  return (
    <Card className="p-4 bg-slate-900/50 border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Log Customer Interaction</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-slate-400">Customer</Label>
          <Select value={form.customer_profile_id} onValueChange={(v) => {
            const cust = customers.find(c => c.id === v);
            setForm({ ...form, customer_profile_id: v, customer_name: cust?.customer_name || '' });
          }}>
            <SelectTrigger className="bg-slate-900 border-slate-700"><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>
              {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-400">Type</Label>
            <Select value={form.interaction_type} onValueChange={(v) => setForm({ ...form, interaction_type: v })}>
              <SelectTrigger className="bg-slate-900 border-slate-780"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['email', 'call', 'meeting', 'support_ticket', 'check_in', 'renewal_discussion', 'escalation', 'feedback'].map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-400">Channel</Label>
            <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
              <SelectTrigger className="bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['email', 'phone', 'video', 'in_app', 'in_person', 'chat'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs text-slate-400">Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What was discussed?"
            className="bg-slate-900 border-slate-700 text-sm"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-400">Outcome</Label>
            <Input
              value={form.outcome}
              onChange={(e) => setForm({ ...form, outcome: e.target.value })}
              placeholder="Result of interaction"
              className="bg-slate-900 border-slate-700 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-400">Sentiment</Label>
            <Select value={form.sentiment} onValueChange={(v) => setForm({ ...form, sentiment: v })}>
              <SelectTrigger className="bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['positive', 'neutral', 'negative', 'very_negative'].map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={form.follow_up_required}
            onCheckedChange={(v) => setForm({ ...form, follow_up_required: !!v })}
          />
          <Label className="text-xs text-slate-300">Follow-up required</Label>
        </div>

        <Button onClick={handleSubmit} disabled={logging || !form.customer_profile_id || !form.description} className="w-full" size="sm">
          {logging ? 'Logging...' : 'Log Interaction'}
        </Button>
      </div>
    </Card>
  );
}