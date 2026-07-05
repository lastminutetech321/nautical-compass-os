import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Plus } from "lucide-react";

const RATER_TYPES = ["client","employer","peer","supervisor","platform"];
const BLANK = { worker_id:"", rater_name:"", rater_type:"client", rating:5, quality_score:5, reliability_score:5, communication_score:5, skills_score:5, review_text:"", would_rehire:true, date: new Date().toISOString().slice(0,10), public:true };

const StarRating = ({ value, onChange }) => (
  <div className="flex gap-1">{[1,2,3,4,5].map(s => <Star key={s} className={`w-5 h-5 cursor-pointer ${s <= value ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} onClick={() => onChange(s)} />)}</div>
);

export default function WorkerRatingsPage() {
  const [ratings, setRatings] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK);

  useEffect(() => {
    Promise.all([
      base44.entities.WorkerRating.list("-date", 200),
      base44.entities.WorkerProfile.list("-created_date", 100),
    ]).then(([r, w]) => { setRatings(r); setWorkers(w); }).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const r = await base44.entities.WorkerRating.create(form);
    setRatings(prev => [r, ...prev]);
    setOpen(false);
    setSaving(false);
    setForm(BLANK);
  };

  const workerName = (id) => workers.find(w => w.id === id)?.full_name || "Unknown Worker";

  const workerStats = workers.map(w => {
    const wRatings = ratings.filter(r => r.worker_id === w.id);
    const avg = wRatings.length > 0 ? (wRatings.reduce((s,r) => s+(r.rating||0),0)/wRatings.length).toFixed(1) : null;
    return { ...w, avgRating: avg, ratingCount: wRatings.length };
  }).filter(w => w.ratingCount > 0).sort((a,b) => parseFloat(b.avgRating||0) - parseFloat(a.avgRating||0));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Star className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Ratings</h1><Badge variant="outline">{ratings.length} reviews</Badge></div>
        <Button onClick={() => { setForm(BLANK); setOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-1" />Add Rating</Button>
      </div>

      {workerStats.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-widest">Top Rated Workers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {workerStats.slice(0,6).map((w, i) => (
              <Card key={w.id} className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">{Array.from({length:5}).map((_,j) => <Star key={j} className={`w-3 h-3 ${j < Math.round(parseFloat(w.avgRating)) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />)}</div>
                <p className="text-lg font-black text-amber-600">{w.avgRating}</p>
                <p className="text-xs font-semibold">{w.full_name}</p>
                <p className="text-[10px] text-muted-foreground">{w.ratingCount} review{w.ratingCount !== 1 ? "s" : ""}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : ratings.length === 0 ? <Card className="p-8 text-center border-dashed"><p className="text-muted-foreground">No ratings yet.</p></Card> : (
        <div className="space-y-3">
          {ratings.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">{Array.from({length:5}).map((_,i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />)}</div>
                    <span className="text-sm font-bold">{r.rating}/5</span>
                    <Badge variant="outline" className="text-[9px]">{r.rater_type}</Badge>
                  </div>
                  <p className="text-sm font-semibold">{workerName(r.worker_id)}</p>
                  <p className="text-xs text-muted-foreground">Reviewed by: {r.rater_name || "Anonymous"} · {r.date}</p>
                  {r.review_text && <p className="text-xs text-muted-foreground mt-1 italic">"{r.review_text}"</p>}
                  <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    {r.quality_score && <span>Quality: {r.quality_score}/5</span>}
                    {r.reliability_score && <span>Reliability: {r.reliability_score}/5</span>}
                    {r.communication_score && <span>Comm: {r.communication_score}/5</span>}
                    {r.skills_score && <span>Skills: {r.skills_score}/5</span>}
                  </div>
                </div>
                {r.would_rehire !== undefined && <Badge className={r.would_rehire ? "bg-emerald-100 text-emerald-700 text-[10px]" : "bg-red-100 text-red-700 text-[10px]"}>{r.would_rehire ? "Would Rehire" : "Would Not Rehire"}</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Worker Rating</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label>Worker</Label><Select value={form.worker_id} onValueChange={v => set("worker_id", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select worker" /></SelectTrigger><SelectContent>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Rater Name</Label><Input value={form.rater_name} onChange={e => set("rater_name", e.target.value)} className="mt-1" /></div>
            <div><Label>Rater Type</Label><Select value={form.rater_type} onValueChange={v => set("rater_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{RATER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2">
              {[["Overall Rating","rating"],["Quality","quality_score"],["Reliability","reliability_score"],["Communication","communication_score"],["Skills","skills_score"]].map(([label, key]) => (
                <div key={key} className="flex items-center justify-between"><Label className="text-sm">{label}</Label><StarRating value={form[key]||5} onChange={v => set(key, v)} /></div>
              ))}
            </div>
            <div><Label>Review</Label><Textarea rows={3} placeholder="Share your experience…" value={form.review_text} onChange={e => set("review_text", e.target.value)} className="mt-1" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.would_rehire} onChange={e => set("would_rehire", e.target.checked)} id="rehire" /><Label htmlFor="rehire">Would Rehire</Label></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.worker_id} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "Save Rating"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}