import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Eye, Heart, Share2, Download, Loader2, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#c9973a", "#8b6f1e", "#f5e9c8", "#d4a942", "#a07820", "#e8d5a0"];

export default function EngagementAnalytics() {
  const [songs, setSongs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [s, v, a] = await Promise.all([
        base44.entities.Song.list('-created_date', 200).catch(() => []),
        base44.entities.Video.list('-created_date', 100).catch(() => []),
        base44.entities.Artist.list('-created_date', 100).catch(() => []),
      ]);
      setSongs(s); setVideos(v); setArtists(a);
      setLoading(false);
    };
    load();
  }, []);

  const totalStreams = songs.reduce((s, x) => s + (x.total_streams || 0), 0);
  const totalViews = videos.reduce((s, x) => s + (x.view_count || 0), 0);
  const totalLikes = songs.reduce((s, x) => s + (x.like_count || 0), 0) + videos.reduce((s, x) => s + (x.like_count || 0), 0);
  const totalShares = songs.reduce((s, x) => s + (x.share_count || 0), 0) + videos.reduce((s, x) => s + (x.share_count || 0), 0);

  const topSongs = [...songs].sort((a, b) => (b.monthly_streams || 0) - (a.monthly_streams || 0)).slice(0, 10);
  const chartData = topSongs.map(s => ({ name: s.title?.slice(0, 15), streams: s.monthly_streams || 0 }));
  const genreData = [];
  const genreMap = {};
  songs.forEach(s => { if (s.genre) genreMap[s.genre] = (genreMap[s.genre] || 0) + 1; });
  Object.entries(genreMap).forEach(([name, value]) => genreData.push({ name, value }));
  const topArtists = [...artists].sort((a, b) => (b.monthly_listeners || 0) - (a.monthly_listeners || 0)).slice(0, 10);

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1505 100%)", minHeight: "100vh", padding: "24px" }}>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-1" style={{ color: "rgba(201,151,58,0.6)" }}>Culture Rail</p>
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: "#f5e9c8" }}><BarChart3 className="w-6 h-6" style={{ color: "#c9973a" }} />Engagement Analytics</h1>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c9973a" }} /></div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><TrendingUp className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{totalStreams.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Total Streams</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Eye className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{totalViews.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Total Views</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Heart className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{totalLikes.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Total Likes</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Share2 className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{totalShares.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Total Shares</p></Card>
          </div>

          <Tabs defaultValue="songs">
            <TabsList className="flex-wrap h-auto" style={{ background: "rgba(201,151,58,0.05)" }}>
              <TabsTrigger value="songs" style={{ color: "#c9973a" }}>Top Songs</TabsTrigger>
              <TabsTrigger value="artists" style={{ color: "#c9973a" }}>Top Artists</TabsTrigger>
              <TabsTrigger value="genres" style={{ color: "#c9973a" }}>Genre Breakdown</TabsTrigger>
            </TabsList>

            <TabsContent value="songs" className="mt-4">
              <Card className="p-4 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                <p className="text-xs font-bold mb-3" style={{ color: "#f5e9c8" }}>Monthly Streams by Song</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fill: "rgba(201,151,58,0.5)", fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: "rgba(201,151,58,0.5)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1a1505", border: "1px solid rgba(201,151,58,0.3)", color: "#f5e9c8" }} />
                    <Bar dataKey="streams" fill="#c9973a" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            <TabsContent value="artists" className="mt-4">
              <div className="space-y-1">
                {topArtists.map((a, i) => (
                  <Card key={a.id} className="p-2.5 border flex items-center gap-3" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                    <span className="text-xs font-black w-5" style={{ color: "#c9973a" }}>{i + 1}</span>
                    {a.image_url && <img src={a.image_url} className="w-8 h-8 rounded-full" alt="" />}
                    <div className="flex-1"><p className="text-xs font-semibold" style={{ color: "#f5e9c8" }}>{a.name}</p><p className="text-[9px]" style={{ color: "rgba(201,151,58,0.4)" }}>{a.genres?.join(", ")}</p></div>
                    <div className="text-right"><p className="text-xs font-bold" style={{ color: "#c9973a" }}>{(a.monthly_listeners || 0).toLocaleString()}</p><p className="text-[8px]" style={{ color: "rgba(201,151,58,0.4)" }}>monthly listeners</p></div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="genres" className="mt-4">
              <Card className="p-4 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                <p className="text-xs font-bold mb-3" style={{ color: "#f5e9c8" }}>Song Distribution by Genre</p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={genreData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name }) => name} labelLine={{ stroke: "rgba(201,151,58,0.3)" }}>
                      {genreData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1505", border: "1px solid rgba(201,151,58,0.3)", color: "#f5e9c8" }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}