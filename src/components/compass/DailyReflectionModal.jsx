import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Send, CheckCircle2 } from "lucide-react";

const QUESTIONS = [
  { key: 'what_slowed_you_down', label: 'What slowed you down today?' },
  { key: 'what_was_confusing', label: 'What was confusing?' },
  { key: 'what_worked_well', label: 'What worked well?' },
  { key: 'better_workflow_discovered', label: 'Did you discover a better workflow?' },
  { key: 'what_nc_should_improve', label: 'What should NC improve?' },
  { key: 'would_change', label: 'Would you change anything?' },
];

export default function DailyReflectionModal({ open, onClose, onSubmitted }) {
  const [form, setForm] = useState({
    what_slowed_you_down: '', what_was_confusing: '', what_worked_well: '',
    better_workflow_discovered: '', what_nc_should_improve: '', would_change: '',
    ai_recommendation_helped: 'not_applicable'
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setDone(false);
      setForm({
        what_slowed_you_down: '', what_was_confusing: '', what_worked_well: '',
        better_workflow_discovered: '', what_nc_should_improve: '', would_change: '',
        ai_recommendation_helped: 'not_applicable'
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await base44.functions.invoke('ncDailyCompass', { operation: 'saveReflection', params: form });
      setDone(true);
      setTimeout(() => { onClose(); onSubmitted(); }, 2000);
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> End-of-Day Reflection
          </DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="text-center py-8 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="font-medium">Thank you! Your reflections have been recorded.</p>
            <p className="text-xs text-muted-foreground">NC has learned from your feedback to improve.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
              Your answers are converted into improvement items, knowledge articles, and organizational insights —
              helping NC become more intelligent with every session.
            </p>
            {QUESTIONS.map(q => (
              <div key={q.key} className="space-y-1.5">
                <Label className="text-sm">{q.label}</Label>
                <Textarea
                  value={form[q.key]}
                  onChange={e => setForm({ ...form, [q.key]: e.target.value })}
                  rows={2}
                  placeholder="Optional..."
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-sm">Did an AI recommendation help you today?</Label>
              <Select value={form.ai_recommendation_helped} onValueChange={v => setForm({ ...form, ai_recommendation_helped: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="partially">Partially</SelectItem>
                  <SelectItem value="not_applicable">Not applicable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {!done && (
            <Button onClick={handleSubmit} disabled={submitting}>
              <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit Reflection'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}