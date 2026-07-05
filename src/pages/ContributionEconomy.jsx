import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Award, TrendingUp, RefreshCw, Brain, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";

const dims = ["contribution","trust","reputation","experience","leadership","customer_success","retention","innovation","learning","quality","professionalism","ethics","reliability"];

export default function ContributionEconomy() {
  const [profiles, setProfiles] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProfile, setNewProfile] = useState({ participant_id: "", participant_name: "", participant_type: "director" });
  const [factors, setFactors] = useState("");
  const [recTarget, setRecTarget] = useState("");
  const [recLoading, setRecLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        base44.functions.invoke("ncPaymentFabric", { operation: "get_profiles" }),
        base44.functions.invoke("ncPaymentFabric", { operation: "get_recommendations" })
      ]);
      setProfiles(p.data.profiles || []);
      setRecommendations(r.data.recommendations || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createProfile = async () => {
    const parsedFactors = factors.split("\n").filter(Boolean).map((line, i) => {
      const [dimension, score_impact, description] = line.split("|").map(s => s.trim());
      return { dimension: dimension || "contribution", score_impact: Number(score_impact) || 1, description: description || line };
    });
    try {
      await base44.functions.invoke("ncPaymentFabric", {
        operation: "update_contribution_scores",
        params: { participant_id: newProfile.participant_id, participant_name: newProfile.participant_name, participant_type: newProfile.participant_type, verified_factors: parsedFactors }
      });
      setNewProfile({ participant_id: "", participant_name: "", participant_type: "director" });
      setFactors("");
      await load();
    } catch (e) { console.error(e); }
  };

  const recommend = async (type) => {
    if (!recTarget) return;
    setRecLoading(true);
    try {
      await base44.functions.invoke("ncPaymentFabric", { operation: type, params: { participant_id: recTarget } });
      await load();
    } catch (e) { console.error(e); }
    setRecLoading(false);
  };

  if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-primary" /> Contribution Economy</h1>
          <p className="text-sm text-muted-foreground mt-1">13-dimension scoring that rewards sustainable value creation — not just sales</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /> Refresh</Button>
      </div>

      <Tabs defaultValue="profiles">
        <TabsList>
          <TabsTrigger value="profiles">Profiles & Scores</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-4">
          <Card className="mb-4">
            <CardHeader><CardTitle>Add / Update Contribution Profile</CardTitle><CardDescription>Record verified contributions. One factor per line: dimension | score_impact | description</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Participant ID</Label><Input value={newProfile.participant_id} onChange={(e) => setNewProfile({ ...newProfile, participant_id: e.target.value })} /></div>
                <div><Label>Participant Name</Label><Input value={newProfile.participant_name} onChange={(e) => setNewProfile({ ...newProfile, participant_name: e.target.value })} /></div>
                <div>
                  <Label>Participant Type</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={newProfile.participant_type} onChange={(e) => setNewProfile({ ...newProfile, participant_type: e.target.value })}>
                    {["founder","director","employee","contractor","artist","creator","musician","workforce","promoter","referral_partner","marketplace_provider","member"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Verified Factors</Label>
                <textarea className="w-full min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono" value={factors} onChange={(e) => setFactors(e.target.value)} placeholder={"customer_success|5|Onboarded 3 enterprise customers\nretention|3|Maintained 95% retention\nquality|4|Zero defects in Q2 deliverables"} />
              </div>
              <Button onClick={createProfile}>Create / Update Profile</Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {profiles.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.participant_name}</span>
                      <Badge variant="secondary">{p.participant_type}</Badge>
                      <Badge variant="outline">{p.recognition_level}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">{p.composite_score?.toFixed(1)}</span>
                      <select className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" value="" onChange={(e) => setRecTarget(p.participant_id)}>
                        <option value="">Select for AI...</option>
                      </select>
                      {recTarget === p.participant_id && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => recommend("recommend_compensation")} disabled={recLoading}><TrendingUp className="w-3 h-3" /> Comp</Button>
                          <Button size="sm" variant="outline" onClick={() => recommend("recommend_promotion")} disabled={recLoading}><Award className="w-3 h-3" /> Promo</Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-7 md:grid-cols-13 gap-1 mt-3">
                    {dims.map(d => (
                      <div key={d} className="text-center p-1 rounded bg-muted/40">
                        <div className="text-[9px] text-muted-foreground truncate">{d.slice(0, 4)}</div>
                        <div className="text-xs font-semibold">{Math.round(p.scores?.[d] || 0)}</div>
                      </div>
                    ))}
                  </div>
                  {p.ai_summary && <p className="text-xs text-muted-foreground mt-2">{p.ai_summary}</p>}
                </CardContent>
              </Card>
            ))}
            {profiles.length === 0 && <p className="text-sm text-muted-foreground">No contribution profiles yet. Add one above.</p>}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-4">
          <div className="space-y-2">
            {recommendations.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{r.participant_name}</span>
                      <Badge variant="secondary">{r.recommendation_type}</Badge>
                      <Badge variant={r.approval_status === "approved" ? "default" : r.approval_status === "implemented" ? "default" : "outline"}>{r.approval_status}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3 h-3" /> {r.ai_confidence?.toFixed(0)}%
                    </div>
                  </div>
                  <p className="text-sm mt-2">{r.recommendation_text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.rationale}</p>
                  {r.policy_impact && <Badge variant="destructive" className="mt-2">Policy Impact — Founder approval required</Badge>}
                </CardContent>
              </Card>
            ))}
            {recommendations.length === 0 && <p className="text-sm text-muted-foreground">No AI recommendations yet. Select a profile and run Comp/Promo above.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}