import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Loader2, CheckCircle, XCircle, Star, Sparkles } from "lucide-react";
import moment from "moment";

export default function CreatorProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [p, v, c] = await Promise.all([
        base44.entities.CreatorProfile.list('-created_date', 100).catch(() => []),
        base44.entities.CreatorVerification.list('-created_date', 100).catch(() => []),
        base44.entities.Creator.list('-created_date', 100).catch(() => []),
      ]);
      setProfiles(p); setVerifications(v); setCreators(c);
      setLoading(false);
    };
    load();
  }, []);

  const approveVerification = async (id) => {
    await base44.entities.CreatorVerification.update(id, { status: "approved", verification_level: "verified", reviewed_date: new Date().toISOString().slice(0, 10), verified_badge_type: "blue" });
    const load = async () => { setVerifications(await base44.entities.CreatorVerification.list('-created_date', 100)); };
    load();
  };
  const rejectVerification = async (id) => {
    await base44.entities.CreatorVerification.update(id, { status: "rejected", reviewed_date: new Date().toISOString().slice(0, 10) });
    const load = async () => { setVerifications(await base44.entities.CreatorVerification.list('-created_date', 100)); };
    load();
  };

  const pending = verifications.filter(v => v.status === 'pending');
  const verified = verifications.filter(v => v.status === 'approved');
  const featured = profiles.filter(p => p.is_featured);

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1505 100%)", minHeight: "100vh", padding: "24px" }}>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-1" style={{ color: "rgba(201,151,58,0.6)" }}>Culture Rail</p>
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: "#f5e9c8" }}><Shield className="w-6 h-6" style={{ color: "#c9973a" }} />Creator Profiles & Verification</h1>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c9973a" }} /></div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Sparkles className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{creators.length}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Total Creators</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><CheckCircle className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{verified.length}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Verified</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Shield className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{pending.length}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Pending Verification</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Star className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{featured.length}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Featured Profiles</p></Card>
          </div>

          <Tabs defaultValue="verification">
            <TabsList className="flex-wrap h-auto" style={{ background: "rgba(201,151,58,0.05)" }}>
              <TabsTrigger value="verification" style={{ color: "#c9973a" }}>Verification Queue ({pending.length})</TabsTrigger>
              <TabsTrigger value="profiles" style={{ color: "#c9973a" }}>Creator Profiles ({profiles.length})</TabsTrigger>
              <TabsTrigger value="verified" style={{ color: "#c9973a" }}>Verified ({verified.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="verification" className="space-y-2 mt-4">
              {pending.length === 0 ? <Card className="p-6 text-center text-sm" style={{ color: "rgba(201,151,58,0.4)", background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>No pending verification requests</Card> :
                pending.map(v => (
                  <Card key={v.id} className="p-4 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div><p className="text-sm font-bold" style={{ color: "#f5e9c8" }}>{v.creator_name}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.4)" }}>{v.creator_type} · Submitted {moment(v.submitted_date).format("MMM D")}</p></div>
                      <Badge style={{ background: "rgba(201,151,58,0.15)", color: "#c9973a" }} className="text-[9px]">{v.verification_level}</Badge>
                    </div>
                    {v.social_proof?.length > 0 && <div className="mb-2"><p className="text-[10px] font-semibold" style={{ color: "rgba(201,151,58,0.4)" }}>Social Proof:</p>{v.social_proof.map((s, i) => <p key={i} className="text-[10px]" style={{ color: "rgba(201,151,58,0.3)" }}>• {s}</p>)}</div>}
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="sm" className="h-7 text-[10px]" style={{ background: "#c9973a", color: "#0a0a0a" }} onClick={() => approveVerification(v.id)}><CheckCircle className="w-3 h-3 mr-1" />Approve</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }} onClick={() => rejectVerification(v.id)}><XCircle className="w-3 h-3 mr-1" />Reject</Button>
                    </div>
                  </Card>
                ))
              }
            </TabsContent>

            <TabsContent value="profiles" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {profiles.map(p => (
                <Card key={p.id} className="p-3 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                  <div className="flex items-center gap-3 mb-2">
                    {p.avatar_url && <img src={p.avatar_url} className="w-12 h-12 rounded-full" alt="" />}
                    <div className="flex-1"><p className="text-sm font-bold" style={{ color: "#f5e9c8" }}>{p.display_name || p.creator_name}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.4)" }}>{p.creator_type}</p></div>
                    {p.verification_badge !== 'none' && <Badge style={{ background: p.verification_badge === 'gold' ? "#c9973a" : "#3b82f6", color: "#0a0a0a" }} className="text-[8px]"><CheckCircle className="w-2.5 h-2.5 mr-0.5" />{p.verification_badge}</Badge>}
                  </div>
                  {p.headline && <p className="text-[10px] mb-1" style={{ color: "rgba(201,151,58,0.4)" }}>{p.headline}</p>}
                  <div className="grid grid-cols-3 gap-1 text-[10px] mt-2">
                    <div><p className="font-bold" style={{ color: "#f5e9c8" }}>{p.follower_count || 0}</p><p style={{ color: "rgba(201,151,58,0.4)" }}>Followers</p></div>
                    <div><p className="font-bold" style={{ color: "#f5e9c8" }}>{p.content_count || 0}</p><p style={{ color: "rgba(201,151,58,0.4)" }}>Content</p></div>
                    <div><p className="font-bold" style={{ color: "#c9973a" }}>{p.engagement_rate || 0}%</p><p style={{ color: "rgba(201,151,58,0.4)" }}>Engagement</p></div>
                  </div>
                  {p.is_featured && <Badge style={{ background: "rgba(201,151,58,0.15)", color: "#c9973a" }} className="text-[8px] mt-1"><Star className="w-2.5 h-2.5 mr-0.5" />Featured</Badge>}
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="verified" className="space-y-1 mt-4">
              {verified.map(v => (
                <Card key={v.id} className="p-2.5 border flex items-center gap-3" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                  <CheckCircle className="w-4 h-4" style={{ color: "#c9973a" }} />
                  <div className="flex-1"><p className="text-xs font-semibold" style={{ color: "#f5e9c8" }}>{v.creator_name}</p><p className="text-[9px]" style={{ color: "rgba(201,151,58,0.4)" }}>{v.creator_type} · Verified {moment(v.reviewed_date).format("MMM D")}</p></div>
                  <Badge style={{ background: v.verified_badge_type === 'gold' ? "#c9973a" : "#3b82f6", color: "#0a0a0a" }} className="text-[9px]">{v.verified_badge_type}</Badge>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}