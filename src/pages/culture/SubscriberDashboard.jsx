import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListMusic, Heart, Clock, Music, Loader2, Star, Users } from "lucide-react";
import moment from "moment";

export default function SubscriberDashboard() {
  const [playlists, setPlaylists] = useState([]);
  const [fanClubs, setFanClubs] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [p, f, s] = await Promise.all([
        base44.entities.Playlist.list('-created_date', 100).catch(() => []),
        base44.entities.FanClub.list('-created_date', 50).catch(() => []),
        base44.entities.Song.list('-created_date', 50).catch(() => []),
      ]);
      setPlaylists(p); setFanClubs(f); setSongs(s);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1505 100%)", minHeight: "100vh", padding: "24px" }}>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-1" style={{ color: "rgba(201,151,58,0.6)" }}>Culture Rail</p>
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: "#f5e9c8" }}><Heart className="w-6 h-6" style={{ color: "#c9973a" }} />Subscriber Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(201,151,58,0.5)" }}>Your playlists, fan club memberships, and listening history</p>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c9973a" }} /></div> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><ListMusic className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{playlists.length}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Playlists</p></Card>
          <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Star className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{fanClubs.length}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Fan Clubs</p></Card>
          <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Music className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{songs.length}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Songs Available</p></Card>
          <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Users className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{fanClubs.reduce((s, f) => s + (f.member_count || 0), 0)}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Fan Club Members</p></Card>
        </div>
      )}

      <Tabs defaultValue="playlists">
        <TabsList className="flex-wrap h-auto" style={{ background: "rgba(201,151,58,0.05)" }}>
          <TabsTrigger value="playlists" style={{ color: "#c9973a" }}>Playlists</TabsTrigger>
          <TabsTrigger value="fanclubs" style={{ color: "#c9973a" }}>Fan Clubs</TabsTrigger>
          <TabsTrigger value="recent" style={{ color: "#c9973a" }}>Recently Added</TabsTrigger>
        </TabsList>

        <TabsContent value="playlists" className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {playlists.map(p => (
            <Card key={p.id} className="p-3 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
              {p.cover_url && <img src={p.cover_url} className="w-full h-32 rounded mb-2 object-cover" alt="" />}
              <p className="text-sm font-bold" style={{ color: "#f5e9c8" }}>{p.name}</p>
              <p className="text-[10px] mb-1" style={{ color: "rgba(201,151,58,0.4)" }}>{p.description}</p>
              <div className="flex items-center gap-2 text-[9px]" style={{ color: "rgba(201,151,58,0.4)" }}>
                <span>{p.song_count || 0} songs</span><span>·</span><span>{p.follower_count || 0} followers</span>
                {p.is_featured && <Badge style={{ background: "rgba(201,151,58,0.15)", color: "#c9973a" }}>Featured</Badge>}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="fanclubs" className="space-y-2 mt-4">
          {fanClubs.map(f => (
            <Card key={f.id} className="p-3 border flex items-center justify-between" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
              <div><p className="text-sm font-bold" style={{ color: "#f5e9c8" }}>{f.name}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.4)" }}>{f.artist_name} · {f.tier} tier</p></div>
              <div className="text-right"><p className="text-sm font-black" style={{ color: "#c9973a" }}>${f.monthly_price}/mo</p><p className="text-[9px]" style={{ color: "rgba(201,151,58,0.4)" }}>{f.member_count} members</p></div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="recent" className="space-y-1 mt-4">
          {songs.map(s => (
            <Card key={s.id} className="p-2.5 border flex items-center gap-3" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
              {s.cover_url && <img src={s.cover_url} className="w-8 h-8 rounded" alt="" />}
              <div className="flex-1"><p className="text-xs font-semibold" style={{ color: "#f5e9c8" }}>{s.title}</p><p className="text-[9px]" style={{ color: "rgba(201,151,58,0.4)" }}>{s.artist_name}</p></div>
              <span className="text-[9px]" style={{ color: "rgba(201,151,58,0.3)" }}>{moment(s.release_date || s.created_date).format("MMM D")}</span>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}