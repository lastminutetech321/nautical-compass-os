import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Compass, Archive, Search, Bell, Play, Pause, SkipForward, SkipBack,
  Repeat, Shuffle, Heart, MoreHorizontal, ChevronRight, Users, Shield,
  Music, Zap, ArrowLeft, Star, Volume2, List
} from "lucide-react";
import CultureRailStats from "@/components/culture/CultureRailStats";

// ── Data ──────────────────────────────────────────────────────────────────
const TRENDING = [
  { id: 1, title: "Mind Over Matter", artist: "Khamal",                 genre: "Hip-Hop · Soul",           img: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop&q=80" },
  { id: 2, title: "Freedom's Price",  artist: "Rebel Society",          genre: "Spoken Word · Truth",      img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop&q=80" },
  { id: 3, title: "Legacy Buckles",   artist: "Legacy Buckles",         genre: "Handmade · Heritage",      img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop&q=80" },
  { id: 4, title: "Built Different",  artist: "Nova King",              genre: "R&B · Power",              img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop&q=80" },
  { id: 5, title: "Still We Rise",    artist: "Sistah Sol",             genre: "Gospel · Culture",         img: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop&q=80" },
];

const CONTINUE = [
  { id: 1, title: "The Blueprint",    artist: "Jay Construct",          img: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=80&h=80&fit=crop&q=80", progress: 42 },
  { id: 2, title: "We the People",    artist: "Common Purpose",         img: "https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=80&h=80&fit=crop&q=80", progress: 71 },
  { id: 3, title: "The Narrative",    artist: "Parkrose Percucculture", img: "https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=80&h=80&fit=crop&q=80", progress: 18 },
];

const UP_NEXT = [
  { title: "True Compass",   artist: "Righteous Pro" },
  { title: "Speak Life",     artist: "Lyric Truth" },
  { title: "Unshaken",       artist: "Faith Child" },
  { title: "Next Chapter",   artist: "Young Purpose" },
];

const RADIO_STATIONS = [
  { name: "The Cookout",         tag: "Hip-Hop · R&B · Soul", live: true,  img: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=120&h=120&fit=crop&q=80" },
  { name: "Two Sides of Hip-Hop",tag: "Discussion · History · Truth", live: true, img: "https://images.unsplash.com/photo-1542241010-91d2a16b0dcb?w=120&h=120&fit=crop&q=80" },
  { name: "The Compass Sound",   tag: "News · Talk · Education", live: true, img: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=120&h=120&fit=crop&q=80" },
];

const PLAYLISTS = [
  { name: "Vision & Vibes",    sub: "Motivation & Devotion",  img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80&h=80&fit=crop&q=80" },
  { name: "Roots & Revolution", sub: "Conscious Hip-Hop",     img: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop&q=80" },
  { name: "Legacy Builders",   sub: "Wealth · Power · Mindset",img: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=80&h=80&fit=crop&q=80" },
  { name: "Boundless",         sub: "Gospel · Soul",          img: "https://images.unsplash.com/photo-1468164016863-aa56d7822e9a?w=80&h=80&fit=crop&q=80" },
];

const FEATURES = [
  { icon: Volume2, label: "High Fidelity Audio",    desc: "Lossless streaming quality sound" },
  { icon: Star,    label: "Artist Empowerment",     desc: "Tools for rights, royalties, and revenue" },
  { icon: Shield,  label: "Copyright Protection",   desc: "Register, timestamp, and secure your work" },
  { icon: List,    label: "Smart Contracts",         desc: "Contracts, splits, and agreements simplified" },
  { icon: Zap,     label: "Royalty Tracking",        desc: "Track plays, earnings, and performance" },
  { icon: Users,   label: "Community First",         desc: "Built by the culture, for the culture" },
];

const LEFT_NAV = [
  { label: "Navigate", icon: Compass,  active: true },
  { label: "Archive",  icon: Archive,  active: false },
  { label: "Explore",  icon: Search,   active: false },
  { label: "Fleet",    icon: Users,    active: false },
  { label: "Profile",  icon: Star,     active: false },
];

const ECOSYSTEM = [
  { label: "JurisEngine",       path: "/ai-services" },
  { label: "Authority Compass", path: "/canon" },
  { label: "Career Gateway",    path: "/workforce" },
  { label: "Future Fund",       path: "/projects" },
  { label: "Marketplace",       path: "/applications" },
];

// ── Gold palette constants ─────────────────────────────────────────────────
// bg: #0d0a00  card: #1a1200  border: #3d2e00  gold: #c9973a  gold-light: #e8b84b

export default function CultureRail() {
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState({});
  const [section, setSection] = useState("navigate");

  const toggleLike = (id) => setLiked(p => ({ ...p, [id]: !p[id] }));

  return (
    <div
      className="min-h-screen -m-6 flex flex-col overflow-hidden"
      style={{ background: "#0d0a00", color: "#f5e9c8", fontFamily: "system-ui, sans-serif" }}
    >
      {/* ══ TOP BAR (mobile-style brand strip) ══ */}
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "#2a1f00", background: "#100c00" }}>
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1 text-xs opacity-40 hover:opacity-70 transition-opacity" style={{ color: "#c9973a" }}>
            <ArrowLeft className="w-3 h-3" /> Mission Control
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center" style={{ borderColor: "#c9973a" }}>
            <Compass className="w-4 h-4" style={{ color: "#c9973a" }} />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: "#c9973a" }}>NC · Nautical Compass</p>
            <p className="text-[8px] tracking-widest uppercase opacity-50">Culture Rail</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 opacity-40" />
          <Bell className="w-4 h-4 opacity-40" />
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-yellow-800 flex items-center justify-center text-[10px] font-bold">NC</div>
        </div>
      </div>

      {/* ══ BODY: LEFT NAV + MAIN + RIGHT PANEL ══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <div className="hidden lg:flex flex-col w-52 flex-shrink-0 border-r py-6 px-3" style={{ borderColor: "#2a1f00", background: "#100c00" }}>
          {/* Brand */}
          <div className="flex items-center gap-2 mb-8 px-2">
            <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center" style={{ borderColor: "#c9973a" }}>
              <Compass className="w-5 h-5" style={{ color: "#c9973a" }} />
            </div>
            <div>
              <p className="text-[9px] font-black tracking-widest uppercase" style={{ color: "#c9973a" }}>NC</p>
              <p className="text-[8px] opacity-40 tracking-wide">Nautical Compass</p>
            </div>
          </div>

          {/* Primary nav */}
          <div className="space-y-1 mb-8">
            {LEFT_NAV.map(n => {
              const Icon = n.icon;
              const active = section === n.label.toLowerCase();
              return (
                <button
                  key={n.label}
                  onClick={() => setSection(n.label.toLowerCase())}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: active ? "rgba(201,151,58,0.15)" : "transparent",
                    color: active ? "#e8b84b" : "rgba(245,233,200,0.45)",
                    border: active ? "1px solid rgba(201,151,58,0.3)" : "1px solid transparent",
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {n.label}
                </button>
              );
            })}
          </div>

          {/* Ecosystem */}
          <div>
            <p className="text-[9px] uppercase tracking-widest px-3 mb-3" style={{ color: "#c9973a", opacity: 0.6 }}>Ecosystem</p>
            <div className="space-y-0.5">
              {ECOSYSTEM.map(e => (
                <Link
                  key={e.label}
                  to={e.path}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all hover:bg-white/5"
                  style={{ color: "rgba(245,233,200,0.4)" }}
                >
                  <Compass className="w-3 h-3 opacity-50" style={{ color: "#c9973a" }} />
                  {e.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Coordinates */}
          <div className="mt-auto px-3">
            <p className="text-[9px] font-mono opacity-30">34.0522° N</p>
            <p className="text-[9px] font-mono opacity-30">118.2437° W</p>
            <p className="text-[9px] opacity-30 mt-0.5" style={{ color: "#c9973a" }}>Stay the Course</p>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Hero Banner */}
          <div
            className="relative overflow-hidden mx-4 mt-4 rounded-2xl"
            style={{ minHeight: 220, background: "linear-gradient(135deg, #1a1000 0%, #0d0800 60%, #050300 100%)" }}
          >
            {/* Lighthouse image overlay */}
            <div
              className="absolute inset-0 opacity-30 bg-cover bg-center rounded-2xl"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&h=300&fit=crop&q=60')" }}
            />
            {/* Gold shimmer vignette */}
            <div className="absolute inset-0 rounded-2xl" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(201,151,58,0.12) 0%, transparent 70%)" }} />

            <div className="relative p-8 flex flex-col justify-center" style={{ minHeight: 220 }}>
              <p className="text-[10px] uppercase tracking-widest mb-3 font-semibold" style={{ color: "#c9973a" }}>Nautical Compass · Culture Rail</p>
              <h1 className="text-3xl md:text-4xl font-black leading-tight mb-2" style={{ color: "#f5e9c8" }}>
                Chart Your Course.<br />Build Your Legacy.
              </h1>
              <p className="text-xs uppercase tracking-widest mb-5 opacity-50" style={{ color: "#e8b84b" }}>
                THIS IS MORE THAN MUSIC. THIS IS MOVEMENT.
              </p>
              <button
                className="self-start px-5 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                style={{ background: "#c9973a", color: "#0d0a00" }}
              >
                Explore the Culture Rail
              </button>

              {/* Dots */}
              <div className="absolute bottom-4 left-8 flex gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="rounded-full" style={{ width: i===0?16:6, height:6, background: i===0?"#c9973a":"rgba(201,151,58,0.3)" }} />
                ))}
              </div>
            </div>
          </div>

          {/* NC Radio */}
          <div className="px-4 mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#c9973a" }}>NC Radio · Live from the Culture</p>
              <button className="text-[10px] opacity-40 hover:opacity-70 flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {RADIO_STATIONS.map((s, i) => (
                <div key={i} className="flex-shrink-0 w-28 rounded-xl overflow-hidden cursor-pointer group" style={{ background: "#1a1200", border: "1px solid #2a1f00" }}>
                  <div className="relative">
                    <img src={s.img} alt={s.name} className="w-full h-24 object-cover" />
                    {s.live && (
                      <span className="absolute top-1.5 left-1.5 text-[8px] font-black px-1.5 py-0.5 rounded-sm" style={{ background: "#c9973a", color: "#0d0a00" }}>● LIVE</span>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-bold leading-tight truncate">{s.name}</p>
                    <p className="text-[8px] opacity-40 mt-0.5 truncate">{s.tag}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured Playlists */}
          <div className="px-4 mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#c9973a" }}>Featured Playlists</p>
              <button className="text-[10px] opacity-40 hover:opacity-70 flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {PLAYLISTS.map((p, i) => (
                <div key={i} className="flex-shrink-0 w-24 cursor-pointer group">
                  <div className="relative rounded-lg overflow-hidden mb-2">
                    <img src={p.img} alt={p.name} className="w-24 h-24 object-cover" />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                  </div>
                  <p className="text-[10px] font-bold leading-tight">{p.name}</p>
                  <p className="text-[8px] opacity-40 mt-0.5">{p.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* New Releases */}
          <div className="px-4 mt-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#c9973a" }}>New Releases</p>
              <button className="text-[10px] opacity-40 hover:opacity-70 flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></button>
            </div>
            <div className="space-y-2">
              {CONTINUE.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer group transition-all"
                  style={{ background: "#1a1200", border: "1px solid #2a1f00" }}
                >
                  <img src={t.img} alt={t.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{t.title}</p>
                    <p className="text-[9px] opacity-40 truncate">{t.artist}</p>
                  </div>
                  <button
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    style={{ background: "#c9973a" }}
                    onClick={() => setPlaying(!playing)}
                  >
                    <Play className="w-3 h-3" style={{ color: "#0d0a00" }} />
                  </button>
                  <MoreHorizontal className="w-4 h-4 opacity-20" />
                </div>
              ))}
            </div>
          </div>

          {/* Trending Now */}
          <div className="px-4 mt-2 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#c9973a" }}>Trending Now</p>
              <button className="text-[10px] opacity-40 hover:opacity-70 flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
              {TRENDING.map(t => (
                <div key={t.id} className="flex-shrink-0 w-36 cursor-pointer group">
                  <div className="relative rounded-xl overflow-hidden mb-2">
                    <img src={t.img} alt={t.title} className="w-full h-36 object-cover" />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                    <button
                      className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      style={{ background: "#c9973a" }}
                    >
                      <Play className="w-3.5 h-3.5" style={{ color: "#0d0a00" }} />
                    </button>
                    <button
                      className="absolute top-2 right-2"
                      onClick={() => toggleLike(t.id)}
                    >
                      <Heart
                        className="w-4 h-4 transition-all"
                        style={{ color: liked[t.id] ? "#e8b84b" : "rgba(255,255,255,0.4)", fill: liked[t.id] ? "#e8b84b" : "none" }}
                      />
                    </button>
                  </div>
                  <p className="text-xs font-bold truncate">{t.title}</p>
                  <p className="text-[9px] opacity-40 truncate">{t.artist}</p>
                  <p className="text-[8px] mt-0.5 opacity-30 truncate">{t.genre}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Continue Listening */}
          <div className="px-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#c9973a" }}>Continue Listening</p>
              <button className="text-[10px] opacity-40 hover:opacity-70 flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {CONTINUE.map((t, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-56 flex items-center gap-3 p-3 rounded-xl cursor-pointer group transition-all"
                  style={{ background: "#1a1200", border: "1px solid #2a1f00" }}
                >
                  <img src={t.img} alt={t.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{t.title}</p>
                    <p className="text-[9px] opacity-40 truncate">{t.artist}</p>
                    {/* mini progress */}
                    <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full rounded-full" style={{ width: `${t.progress}%`, background: "#c9973a" }} />
                    </div>
                  </div>
                  <button className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,151,58,0.2)", border: "1px solid rgba(201,151,58,0.4)" }}>
                    <Play className="w-3 h-3" style={{ color: "#c9973a" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Live Rail Stats */}
          <div className="px-4 mt-2 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#c9973a" }}>Culture Rail · Live Metrics</p>
            <CultureRailStats />
          </div>

          {/* Feature strips */}
          <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: "#0f0900", border: "1px solid #2a1f00" }}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y" style={{ borderColor: "#2a1f00" }}>
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="p-4 flex flex-col items-start gap-2" style={{ borderColor: "#2a1f00" }}>
                    <Icon className="w-5 h-5" style={{ color: "#c9973a" }} />
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#e8b84b" }}>{f.label}</p>
                    <p className="text-[9px] opacity-40 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer tagline */}
          <div className="text-center py-6 mb-24">
            <p className="text-xs uppercase tracking-[0.4em] opacity-25" style={{ color: "#c9973a" }}>Truth Is Our North Star</p>
          </div>
        </div>

        {/* ── RIGHT PANEL: Now Playing ── */}
        <div className="hidden xl:flex flex-col w-64 flex-shrink-0 border-l py-5 px-4" style={{ borderColor: "#2a1f00", background: "#100c00" }}>
          <p className="text-[9px] uppercase tracking-widest mb-4 opacity-40" style={{ color: "#c9973a" }}>Now Playing</p>

          {/* Album art */}
          <div className="relative rounded-xl overflow-hidden mb-4" style={{ border: "1px solid #2a1f00" }}>
            <img
              src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=240&h=240&fit=crop&q=80"
              alt="Now Playing"
              className="w-full aspect-square object-cover"
            />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(201,151,58,0.08) 0%, transparent 70%)" }} />
          </div>

          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-bold" style={{ color: "#f5e9c8" }}>Guiding Light</p>
              <p className="text-[10px] opacity-40">Legacy Buckles</p>
            </div>
            <Heart className="w-4 h-4 opacity-30 cursor-pointer hover:opacity-70 transition-opacity" style={{ color: "#c9973a" }} />
          </div>

          {/* Scrubber */}
          <div className="mb-3">
            <div className="h-1 rounded-full mb-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full" style={{ width: "37%", background: "linear-gradient(90deg,#c9973a,#e8b84b)" }} />
            </div>
            <div className="flex justify-between text-[9px] opacity-30">
              <span>1:32</span><span>3:48</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <Shuffle className="w-4 h-4 opacity-30 cursor-pointer hover:opacity-60 transition-opacity" />
            <SkipBack className="w-5 h-5 opacity-50 cursor-pointer hover:opacity-80 transition-opacity" />
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ background: "#c9973a" }}
              onClick={() => setPlaying(!playing)}
            >
              {playing
                ? <Pause className="w-5 h-5" style={{ color: "#0d0a00" }} />
                : <Play  className="w-5 h-5" style={{ color: "#0d0a00" }} />
              }
            </button>
            <SkipForward className="w-5 h-5 opacity-50 cursor-pointer hover:opacity-80 transition-opacity" />
            <Repeat className="w-4 h-4 opacity-30 cursor-pointer hover:opacity-60 transition-opacity" />
          </div>

          {/* Up Next */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] uppercase tracking-widest opacity-40" style={{ color: "#c9973a" }}>Up Next</p>
            <button className="text-[8px] opacity-30 hover:opacity-60">Clear</button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {UP_NEXT.map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  className="w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "rgba(201,151,58,0.12)", border: "1px solid rgba(201,151,58,0.2)", color: "#c9973a" }}
                >
                  {i+1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold truncate group-hover:opacity-100 opacity-70">{t.title}</p>
                  <p className="text-[8px] opacity-30 truncate">{t.artist}</p>
                </div>
                <MoreHorizontal className="w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ BOTTOM NAV (Nav bar row matching screenshot) ══ */}
      <div
        className="fixed bottom-0 left-0 right-0 flex items-center justify-around py-3 px-4 border-t z-30 lg:hidden"
        style={{ background: "#100c00", borderColor: "#2a1f00" }}
      >
        {LEFT_NAV.map(n => {
          const Icon = n.icon;
          const active = section === n.label.toLowerCase();
          return (
            <button
              key={n.label}
              onClick={() => setSection(n.label.toLowerCase())}
              className="flex flex-col items-center gap-1"
              style={{ color: active ? "#c9973a" : "rgba(245,233,200,0.3)" }}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px]">{n.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══ MINI NOW-PLAYING BAR (mobile) ══ */}
      <div
        className="fixed bottom-14 left-0 right-0 flex items-center gap-3 px-4 py-2.5 border-t z-20 lg:hidden"
        style={{ background: "#1a1200", borderColor: "#2a1f00" }}
      >
        <img
          src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=40&h=40&fit=crop"
          alt=""
          className="w-9 h-9 rounded-md object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">Guiding Light</p>
          <p className="text-[9px] opacity-40 truncate">Legacy Buckles</p>
        </div>
        <button onClick={() => setPlaying(!playing)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#c9973a" }}>
          {playing ? <Pause className="w-3.5 h-3.5" style={{ color: "#0d0a00" }} /> : <Play className="w-3.5 h-3.5" style={{ color: "#0d0a00" }} />}
        </button>
        <SkipForward className="w-5 h-5 opacity-40" />
      </div>
    </div>
  );
}