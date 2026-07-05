import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Compass, MessageSquare, ClipboardList, Map, Heart, BookOpen } from "lucide-react";
import ConversationPanel from "@/components/director/ConversationPanel";
import IntakeWorkflow from "@/components/director/IntakeWorkflow";
import MemberJourneyView from "@/components/director/MemberJourneyView";
import TrustScoreGauge from "@/components/director/TrustScoreGauge";
import OrgLearningPanel from "@/components/director/OrgLearningPanel";

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon className={`w-3.5 h-3.5 ${color}`} />}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function DirectorAssistant() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await base44.functions.invoke('ncDirectorAssistant', { operation: 'getDashboard' });
      setDashboard(res.data);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Compass className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Director Navigation System</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Educate, guide, support, and help people determine whether NC is the right fit. Build trust before revenue.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Conversations" value={dashboard?.stats?.conversations_total || 0} icon={MessageSquare} color="text-blue-500" />
        <StatCard label="Active" value={dashboard?.stats?.conversations_active || 0} icon={MessageSquare} color="text-emerald-500" />
        <StatCard label="Intakes Done" value={dashboard?.stats?.intakes_completed || 0} icon={ClipboardList} color="text-amber-500" />
        <StatCard label="Active Journeys" value={dashboard?.stats?.journeys_active || 0} icon={Map} color="text-violet-500" />
        <StatCard label="Avg Trust" value={dashboard?.stats?.avg_trust || 50} icon={Heart} color="text-rose-500" />
      </div>

      <Tabs defaultValue="conversations">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="conversations"><MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Conversations</TabsTrigger>
          <TabsTrigger value="intake"><ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Intake</TabsTrigger>
          <TabsTrigger value="journeys"><Map className="w-3.5 h-3.5 mr-1.5" /> Journeys</TabsTrigger>
          <TabsTrigger value="trust"><Heart className="w-3.5 h-3.5 mr-1.5" /> Trust</TabsTrigger>
          <TabsTrigger value="learning"><BookOpen className="w-3.5 h-3.5 mr-1.5" /> Org Learning</TabsTrigger>
        </TabsList>
        <TabsContent value="conversations" className="mt-4"><ConversationPanel /></TabsContent>
        <TabsContent value="intake" className="mt-4"><IntakeWorkflow /></TabsContent>
        <TabsContent value="journeys" className="mt-4"><MemberJourneyView /></TabsContent>
        <TabsContent value="trust" className="mt-4"><TrustScoreGauge /></TabsContent>
        <TabsContent value="learning" className="mt-4"><OrgLearningPanel /></TabsContent>
      </Tabs>
    </div>
  );
}