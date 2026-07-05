import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageSquare, Send, Lightbulb, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";

const CONV_TYPES = [
  { value: 'intake', label: 'Intake' },
  { value: 'check_in', label: 'Check-in' },
  { value: 'guidance', label: 'Guidance' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'support', label: 'Support' },
];

export default function ConversationPanel() {
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [convType, setConvType] = useState('guidance');
  const [phase, setPhase] = useState('idle');
  const [prep, setPrep] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [notes, setNotes] = useState('');
  const [guidance, setGuidance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [satisfaction, setSatisfaction] = useState('neutral');

  const handlePrepare = async () => {
    if (!memberName || !memberId) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncDirectorAssistant', {
        operation: 'prepareConversation',
        params: { member_id: memberId, member_name: memberName, conversation_type: convType }
      });
      setPrep(res.data);
      setConversationId(res.data.conversation.id);
      setPhase('preparing');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleGuidance = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncDirectorAssistant', {
        operation: 'getGuidance',
        params: { conversation_id: conversationId, conversation_notes: notes, member_context: prep?.member_context }
      });
      setGuidance(res.data.guidance);
      setPhase('active');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSummarize = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncDirectorAssistant', {
        operation: 'summarizeConversation',
        params: { conversation_id: conversationId, conversation_notes: notes, member_satisfaction: satisfaction }
      });
      setSummary(res.data.summary);
      setPhase('completed');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const reset = () => {
    setPhase('idle'); setPrep(null); setConversationId(null);
    setNotes(''); setGuidance(null); setSummary(null); setSatisfaction('neutral');
  };

  if (phase === 'idle') {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Start a New Conversation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Member ID</Label>
              <Input value={memberId} onChange={e => setMemberId(e.target.value)} placeholder="Enter member ID" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Member Name</Label>
              <Input value={memberName} onChange={e => setMemberName(e.target.value)} placeholder="Enter member name" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Conversation Type</Label>
            <select value={convType} onChange={e => setConvType(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              {CONV_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <Button onClick={handlePrepare} disabled={loading || !memberName || !memberId}>
            <Brain className="w-4 h-4" /> {loading ? 'Preparing with AI...' : 'Prepare Conversation'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {prep && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="w-4 h-4 text-violet-500" /> AI Preparation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md">{prep.ai_prep.prep_notes}</p>
            <div>
              <p className="text-xs font-semibold mb-1.5">Suggested Questions:</p>
              <ul className="space-y-1">
                {(prep.ai_prep.prepared_questions || []).map((q, i) => (
                  <li key={i} className="text-sm flex gap-2"><Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" /> {q}</li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold mb-1.5">Recommended Resources:</p>
                <div className="flex flex-wrap gap-1">
                  {(prep.ai_prep.recommended_resources || []).map((r, i) => <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>)}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1.5">Recommended Modules:</p>
                <div className="flex flex-wrap gap-1">
                  {(prep.ai_prep.recommended_modules || []).map((m, i) => <Badge key={i} variant="outline" className="text-xs">{m}</Badge>)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-500" /> Conversation Notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6} placeholder="Take notes during the conversation..." />
          {phase === 'active' && guidance && (
            <div className="space-y-3 border-t pt-3">
              <div>
                <p className="text-xs font-semibold mb-1.5">Questions to Ask:</p>
                <ul className="space-y-1">{(guidance.questions_to_ask || []).map((q, i) => <li key={i} className="text-sm flex gap-2"><Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" /> {q}</li>)}</ul>
              </div>
              {(guidance.concepts_to_explain || []).length > 0 && (
                <div><p className="text-xs font-semibold mb-1.5">Concepts to Explain:</p><ul className="space-y-1">{guidance.concepts_to_explain.map((c, i) => <li key={i} className="text-sm">{c}</li>)}</ul></div>
              )}
              {(guidance.resources_to_share || []).length > 0 && (
                <div><p className="text-xs font-semibold mb-1.5">Resources to Share:</p><div className="flex flex-wrap gap-1">{guidance.resources_to_share.map((r, i) => <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>)}</div></div>
              )}
              {(guidance.potential_misunderstandings || []).length > 0 && (
                <div><p className="text-xs font-semibold mb-1.5 text-amber-600">Potential Misunderstandings:</p><ul className="space-y-1">{guidance.potential_misunderstandings.map((m, i) => <li key={i} className="text-sm">{m}</li>)}</ul></div>
              )}
              {(guidance.compliance_warnings || []).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-2">
                  <p className="text-xs font-semibold mb-1 text-red-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Compliance Warnings:</p>
                  <ul className="space-y-1">{guidance.compliance_warnings.map((w, i) => <li key={i} className="text-sm text-red-700">{w}</li>)}</ul>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {phase === 'preparing' && (
              <Button onClick={handleGuidance} disabled={loading} variant="secondary">
                <Lightbulb className="w-4 h-4" /> {loading ? 'Getting guidance...' : 'Get AI Guidance'}
              </Button>
            )}
            {phase === 'active' && (
              <Button onClick={handleGuidance} disabled={loading} variant="outline" size="sm">
                <Lightbulb className="w-4 h-4" /> Refresh Guidance
              </Button>
            )}
            {(phase === 'preparing' || phase === 'active') && (
              <>
                <select value={satisfaction} onChange={e => setSatisfaction(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="very_satisfied">Very Satisfied</option>
                  <option value="satisfied">Satisfied</option>
                  <option value="neutral">Neutral</option>
                  <option value="dissatisfied">Dissatisfied</option>
                </select>
                <Button onClick={handleSummarize} disabled={loading}>
                  <Send className="w-4 h-4" /> {loading ? 'Summarizing...' : 'Complete & Summarize'}
                </Button>
              </>
            )}
            <Button onClick={reset} variant="ghost" size="sm"><RotateCcw className="w-4 h-4" /> New Conversation</Button>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Conversation Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{summary.conversation_summary}</p>
            {summary.follow_up_notes && <div><p className="text-xs font-semibold mb-1">Follow-up Notes:</p><p className="text-sm text-muted-foreground">{summary.follow_up_notes}</p></div>}
            {(summary.identified_needs || []).length > 0 && <div><p className="text-xs font-semibold mb-1">Identified Needs:</p><div className="flex flex-wrap gap-1">{summary.identified_needs.map((n, i) => <Badge key={i} variant="secondary" className="text-xs">{n}</Badge>)}</div></div>}
            {(summary.identified_goals || []).length > 0 && <div><p className="text-xs font-semibold mb-1">Identified Goals:</p><div className="flex flex-wrap gap-1">{summary.identified_goals.map((g, i) => <Badge key={i} variant="outline" className="text-xs">{g}</Badge>)}</div></div>}
            {summary.recommended_starting_point && <p className="text-sm"><span className="font-semibold">Recommended Starting Point:</span> {summary.recommended_starting_point}</p>}
            {(summary.compliance_issues || []).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-2">
                <p className="text-xs font-semibold text-red-700 mb-1">Compliance Issues:</p>
                <ul className="space-y-1">{summary.compliance_issues.map((c, i) => <li key={i} className="text-sm text-red-700">{c}</li>)}</ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}