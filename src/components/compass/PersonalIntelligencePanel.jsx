import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Save, Lock } from "lucide-react";

export default function PersonalIntelligencePanel({ open, onClose, onSaved }) {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadProfile();
  }, [open]);

  const loadProfile = async () => {
    try {
      const res = await base44.functions.invoke('ncDailyCompass', { operation: 'getPreferences' });
      setProfile(res.data);
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('ncDailyCompass', { operation: 'updatePreferences', params: profile });
      onSaved();
      onClose();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const update = (field, value) => setProfile(p => ({ ...p, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-500" /> My Personal Intelligence
          </DialogTitle>
        </DialogHeader>
        {!profile ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading your profile...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted p-3 rounded-md">
              <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>This profile is private — only you can see and manage it. NC uses it to personalize your Daily Compass. It is never mixed with organizational intelligence.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Communication style</Label>
                <Select value={profile.preferred_communication_style} onValueChange={v => update('preferred_communication_style', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">Concise</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="visual">Visual</SelectItem>
                    <SelectItem value="data_driven">Data-driven</SelectItem>
                    <SelectItem value="narrative">Narrative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Learning style</Label>
                <Select value={profile.preferred_learning_style} onValueChange={v => update('preferred_learning_style', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reading">Reading</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="hands_on">Hands-on</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                    <SelectItem value="self_directed">Self-directed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Dashboard layout</Label>
                <Select value={profile.preferred_dashboard_layout} onValueChange={v => update('preferred_dashboard_layout', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Goals (one per line)</Label>
              <Textarea value={(profile.goals || []).join('\n')} onChange={e => update('goals', e.target.value.split('\n').filter(Boolean))} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Strengths (one per line)</Label>
              <Textarea value={(profile.strengths || []).join('\n')} onChange={e => update('strengths', e.target.value.split('\n').filter(Boolean))} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Areas needing support (one per line)</Label>
              <Textarea value={(profile.areas_needing_support || []).join('\n')} onChange={e => update('areas_needing_support', e.target.value.split('\n').filter(Boolean))} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Frequently used tools (one per line)</Label>
              <Textarea value={(profile.frequently_used_tools || []).join('\n')} onChange={e => update('frequently_used_tools', e.target.value.split('\n').filter(Boolean))} rows={2} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !profile}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}