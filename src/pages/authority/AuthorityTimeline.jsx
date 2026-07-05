import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search, Plus, Clock } from "lucide-react";

const AUTHORITY_TYPES = ["all","police","court","employer","landlord","government","school","hoa","security","hospital","licensing_board","corporation","other"];
const STATUSES = ["all","intake","under_review","validated","invalid","escalated","resolved","archived"];
const SEVERITY_COLORS = { low: "bg-emerald-100 text-emerald-700", moderate: "bg-amber-100 text-amber-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };
const STATUS_COLORS = { intake: "bg-blue-100 text-blue-700", under_review: "bg-violet-100 text-violet-700", validated: "bg-emerald-100 text-emerald-700", invalid: "bg-red-100 text-red-700", escalated: "bg-orange-100 text-orange-700", resolved: "bg-slate-100 text-slate-700", archived: "bg-gray-100 text-gray-500" };
const TYPE_ICONS = { police:"🚔",court:"⚖️",employer:"🏢",landlord:"🏠",government:"🏛",school:"🎓",hoa:"🏘",security:"🛡",hospital:"🏥",licensing_board:"📋",corporation:"🏗",other:"❓" };

export default function AuthorityTimeline() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(urlParams.get("type") || "all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    base44.entities.AuthorityInteraction.list("-date_of_interaction", 200)
      .then(setInteractions).finally(() => setLoading(false));
  }, []);

  const filtered = interactions.filter(i => {
    if (typeFilter !== "all" && i.authority_type !== typeFilter) return false;
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (search && !`${i.title} ${i.authority_name} ${i.actor_name} ${i.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by month
  const grouped = {};
  filtered.forEach(i => {
    const key = i.date_of_interaction ? i.date_of_interaction.slice(0,7) : "No Date";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(i);
  });
  const sortedKeys = Object.keys(grouped).sort((a,b) => b.localeCompare(a));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          <h1 className="text-xl font-bold">Authority Timeline</h1>
          <Badge variant="outline">{filtered.length} interactions</Badge>
        </div>
        <Link to="/authority/intake"><Button className="bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-4 h-4 mr-1" />Log New</Button></Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><Input placeholder="Search interactions…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{AUTHORITY_TYPES.map(t => <SelectItem key={t} value={t}>{t === "all" ? "All Types" : t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s === "all" ? "All Statuses" : s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select>
      </div>

      {loading && <div className="text-center py-12 text-muted-foreground">Loading…</div>}

      {!loading && filtered.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">No interactions found.</p>
          <Link to="/authority/intake"><Button className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white">Log First Interaction</Button></Link>
        </Card>
      )}

      {sortedKeys.map(month => (
        <div key={month}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground font-semibold px-2">{month === "No Date" ? "No Date" : new Date(month+"-01").toLocaleDateString("en-US", {month:"long",year:"numeric"})}</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            {grouped[month].map(i => (
              <Link key={i.id} to={`/authority/validation?id=${i.id}`}>
                <Card className="p-4 hover:border-indigo-400 transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{TYPE_ICONS[i.authority_type] || "❓"}</span>
                      <div>
                        <p className="font-semibold text-sm">{i.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{i.authority_name}{i.actor_name ? ` · ${i.actor_name}` : ""}{i.location ? ` · ${i.location}` : ""}</p>
                        {i.claimed_authority && <p className="text-xs text-muted-foreground mt-1 italic">Claimed: "{i.claimed_authority}"</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[i.severity] || ""}`}>{i.severity}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[i.status] || ""}`}>{i.status?.replace(/_/g," ")}</span>
                      {i.date_of_interaction && <span className="text-[10px] text-muted-foreground">{i.date_of_interaction}</span>}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}