import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ArrowLeft, Save } from "lucide-react";
import { Link } from "react-router-dom";

const AUTHORITY_TYPES = ["police","court","employer","landlord","government","school","hoa","security","hospital","licensing_board","corporation","other"];
const SEVERITIES = ["low","moderate","high","critical"];
const JURISDICTION_TYPES = ["federal","state","county","municipal","private","international","unknown"];

export default function AuthorityIntake() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", authority_type: "government", authority_name: "", actor_name: "", actor_title: "",
    badge_or_id: "", date_of_interaction: "", time_of_interaction: "", location: "", description: "",
    claimed_authority: "", claimed_legal_basis: "", severity: "moderate", jurisdiction: "",
    jurisdiction_type: "state", notes: "", consent_given: true
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title || !form.authority_type) return;
    setSaving(true);
    const record = await base44.entities.AuthorityInteraction.create({ ...form, status: "intake" });
    navigate(`/authority/validation?id=${record.id}`);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/authority/compass"><ArrowLeft className="w-4 h-4 text-muted-foreground" /></Link>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h1 className="text-xl font-bold">Authority Intake</h1>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Log a new authority interaction for evaluation. Be factual and specific.</p>

      <Card className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Interaction Title *</Label>
            <Input placeholder="e.g. Traffic stop on Main St — Officer demanded phone" value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Authority Type *</Label>
            <Select value={form.authority_type} onValueChange={v => set("authority_type", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{AUTHORITY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Authority / Organization Name</Label>
            <Input placeholder="e.g. Raleigh Police Department" value={form.authority_name} onChange={e => set("authority_name", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Actor Name</Label>
            <Input placeholder="Name of person who exercised authority" value={form.actor_name} onChange={e => set("actor_name", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Actor Title / Role</Label>
            <Input placeholder="e.g. Detective, Principal, Property Manager" value={form.actor_title} onChange={e => set("actor_title", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Badge / ID Number</Label>
            <Input placeholder="Badge, employee, or license number" value={form.badge_or_id} onChange={e => set("badge_or_id", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Date of Interaction</Label>
            <Input type="date" value={form.date_of_interaction} onChange={e => set("date_of_interaction", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Time</Label>
            <Input type="time" value={form.time_of_interaction} onChange={e => set("time_of_interaction", e.target.value)} className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label>Location</Label>
            <Input placeholder="Address or description of location" value={form.location} onChange={e => set("location", e.target.value)} className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label>Description of Interaction *</Label>
            <Textarea rows={4} placeholder="Describe exactly what happened, in chronological order. Include what was said, what was demanded, and what you did." value={form.description} onChange={e => set("description", e.target.value)} className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label>Claimed Authority / Power</Label>
            <Input placeholder="What authority did they claim to have? (e.g. right to search, right to suspend, right to evict)" value={form.claimed_authority} onChange={e => set("claimed_authority", e.target.value)} className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label>Claimed Legal Basis</Label>
            <Input placeholder="Did they cite a law, policy, or warrant? What did they say?" value={form.claimed_legal_basis} onChange={e => set("claimed_legal_basis", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={v => set("severity", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Jurisdiction Type</Label>
            <Select value={form.jurisdiction_type} onValueChange={v => set("jurisdiction_type", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{JURISDICTION_TYPES.map(j => <SelectItem key={j} value={j}>{j.charAt(0).toUpperCase()+j.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Jurisdiction (State / County / City)</Label>
            <Input placeholder="e.g. North Carolina, Wake County" value={form.jurisdiction} onChange={e => set("jurisdiction", e.target.value)} className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label>Additional Notes</Label>
            <Textarea rows={2} placeholder="Any other context, witnesses present, emotional state, etc." value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1" />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link to="/authority/compass"><Button variant="outline">Cancel</Button></Link>
        <Button onClick={handleSave} disabled={saving || !form.title} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Save className="w-4 h-4 mr-1" />
          {saving ? "Saving…" : "Save & Begin Validation"}
        </Button>
      </div>
    </div>
  );
}