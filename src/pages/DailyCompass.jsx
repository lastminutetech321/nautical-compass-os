import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Compass } from "lucide-react";
import CompassShell from "@/components/compass/CompassShell";
import FounderCompass from "@/components/compass/FounderCompass";
import DirectorCompass from "@/components/compass/DirectorCompass";
import StaffCompass from "@/components/compass/StaffCompass";
import MemberCompass from "@/components/compass/MemberCompass";
import DailyReflectionModal from "@/components/compass/DailyReflectionModal";
import PersonalIntelligencePanel from "@/components/compass/PersonalIntelligencePanel";

export default function DailyCompass() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReflection, setShowReflection] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  useEffect(() => {
    loadCompass();
  }, []);

  const loadCompass = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('ncDailyCompass', { operation: 'generate' });
      setData(res.data);
      loadSuggestions(res.data.role, res.data.sections);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load compass');
    }
    setLoading(false);
  };

  const loadSuggestions = async (role, sections) => {
    try {
      const res = await base44.functions.invoke('ncDailyCompass', { operation: 'suggestions', params: { role, sections } });
      setData(prev => prev ? { ...prev, ai_suggestions: res.data } : prev);
    } catch (e) {
      console.error('Suggestions failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Compass className="w-10 h-10 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground text-sm">Preparing your Daily Compass...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Compass className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-destructive text-sm">{error}</p>
          <button onClick={loadCompass} className="text-primary underline text-sm">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const CompassComponent = {
    founder: FounderCompass,
    director: DirectorCompass,
    staff: StaffCompass,
    member: MemberCompass,
  }[data.role] || MemberCompass;

  return (
    <>
      <CompassShell
        data={data}
        onReflection={() => setShowReflection(true)}
        onPrefs={() => setShowPrefs(true)}
      >
        <CompassComponent sections={data.sections} ai_suggestions={data.ai_suggestions} />
      </CompassShell>
      <DailyReflectionModal
        open={showReflection}
        onClose={() => setShowReflection(false)}
        onSubmitted={loadCompass}
      />
      <PersonalIntelligencePanel
        open={showPrefs}
        onClose={() => setShowPrefs(false)}
        onSaved={loadCompass}
      />
    </>
  );
}