import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Send, Sparkles, MapPin } from "lucide-react";

function ArrayInput({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Textarea
        value={(value || []).join('\n')}
        onChange={e => onChange(e.target.value.split('\n').filter(Boolean))}
        rows={2}
        placeholder={placeholder || 'One per line'}
      />
    </div>
  );
}

export default function IntakeWorkflow() {
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [form, setForm] = useState({
    reason_for_visit: '', current_challenges: [], urgent_issues: [],
    short_term_goals: [], long_term_goals: [], occupation: '', education: '',
    business_interests: [], legal_interests: [], community_interests: [], financial_goals: [],
    preferred_communication_style: 'concise', preferred_learning_style: 'reading',
    current_nc_knowledge: 'none',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!memberId || !memberName) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncDirectorAssistant', {
        operation: 'submitIntake',
        params: { member_id: memberId, member_name: memberName, member_email: memberEmail, intake_data: form }
      });
      setResult(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4 text-amber-500" /> Member Intake</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label className="text-sm">Member ID</Label><Input value={memberId} onChange={e => setMemberId(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-sm">Member Name</Label><Input value={memberName} onChange={e => setMemberName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-sm">Member Email</Label><Input value={memberEmail} onChange={e => setMemberEmail(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Why did they come to NC?</Label>
            <Textarea value={form.reason_for_visit} onChange={e => update('reason_for_visit', e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ArrayInput label="Current Challenges" value={form.current_challenges} onChange={v => update('current_challenges', v)} />
            <ArrayInput label="Urgent Issues" value={form.urgent_issues} onChange={v => update('urgent_issues', v)} />
            <ArrayInput label="Short-term Goals" value={form.short_term_goals} onChange={v => update('short_term_goals', v)} />
            <ArrayInput label="Long-term Goals" value={form.long_term_goals} onChange={v => update('long_term_goals', v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-sm">Occupation</Label><Input value={form.occupation} onChange={e => update('occupation', e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-sm">Education</Label><Input value={form.education} onChange={e => update('education', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ArrayInput label="Business Interests" value={form.business_interests} onChange={v => update('business_interests', v)} />
            <ArrayInput label="Legal Interests" value={form.legal_interests} onChange={v => update('legal_interests', v)} />
            <ArrayInput label="Community Interests" value={form.community_interests} onChange={v => update('community_interests', v)} />
          </div>
          <ArrayInput label="Financial Goals" value={form.financial_goals} onChange={v => update('financial_goals', v)} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Communication Style</Label>
              <Select value={form.preferred_communication_style} onValueChange={v => update('preferred_communication_style', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="concise">Concise</SelectItem><SelectItem value="detailed">Detailed</SelectItem><SelectItem value="visual">Visual</SelectItem><SelectItem value="data_driven">Data-driven</SelectItem><SelectItem value="narrative">Narrative</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Learning Style</Label>
              <Select value={form.preferred_learning_style} onValueChange={v => update('preferred_learning_style', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="reading">Reading</SelectItem><SelectItem value="video">Video</SelectItem><SelectItem value="hands_on">Hands-on</SelectItem><SelectItem value="mentor">Mentor</SelectItem><SelectItem value="self_directed">Self-directed</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Current NC Knowledge</Label>
              <Select value={form.current_nc_knowledge} onValueChange={v => update('current_nc_knowledge', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="basic">Basic</SelectItem><SelectItem value="intermediate">Intermediate</SelectItem><SelectItem value="advanced">Advanced</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={loading || !memberId || !memberName}>
            <Send className="w-4 h-4" /> {loading ? 'Analyzing with AI...' : 'Submit & Analyze Intake'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-500" /> AI Intake Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-md p-3">
              <MapPin className="w-5 h-5 text-violet-500" />
              <div><p className="text-xs text-muted-foreground">Recommended Starting Point</p><p className="font-semibold">{result.analysis.recommended_starting_point}</p></div>
            </div>
            {(result.analysis.identified_needs || []).length > 0 && (
              <div><p className="text-xs font-semibold mb-1.5">Identified Needs:</p><div className="flex flex-wrap gap-1">{result.analysis.identified_needs.map((n, i) => <Badge key={i} variant="secondary" className="text-xs">{n}</Badge>)}</div></div>
            )}
            {(result.analysis.recommended_modules || []).length > 0 && (
              <div><p className="text-xs font-semibold mb-1.5">Recommended Modules:</p><div className="flex flex-wrap gap-1">{result.analysis.recommended_modules.map((m, i) => <Badge key={i} variant="outline" className="text-xs">{m}</Badge>)}</div></div>
            )}
            {(result.analysis.recommended_rails || []).length > 0 && (
              <div><p className="text-xs font-semibold mb-1.5">Recommended Rails:</p><div className="flex flex-wrap gap-1">{result.analysis.recommended_rails.map((r, i) => <Badge key={i} variant="outline" className="text-xs">{r}</Badge>)}</div></div>
            )}
            {(result.analysis.recommended_compasses || []).length > 0 && (
              <div><p className="text-xs font-semibold mb-1.5">Recommended Compasses:</p><div className="flex flex-wrap gap-1">{result.analysis.recommended_compasses.map((c, i) => <Badge key={i} variant="outline" className="text-xs">{c}</Badge>)}</div></div>
            )}
            {(result.analysis.recommended_ai_assistants || []).length > 0 && (
              <div><p className="text-xs font-semibold mb-1.5">Recommended AI Assistants:</p><div className="flex flex-wrap gap-1">{result.analysis.recommended_ai_assistants.map((a, i) => <Badge key={i} variant="outline" className="text-xs">{a}</Badge>)}</div></div>
            )}
            {(result.analysis.recommended_learning_modules || []).length > 0 && (
              <div><p className="text-xs font-semibold mb-1.5">Learning Modules:</p><ul className="space-y-1">{result.analysis.recommended_learning_modules.map((l, i) => <li key={i} className="text-sm">• {l}</li>)}</ul></div>
            )}
            {result.journey && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md">Member journey automatically created with {result.journey.milestones_total} milestones.</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}