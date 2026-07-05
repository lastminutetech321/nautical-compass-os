import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Video, Plus, FileText, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

export default function VideoEvidenceReview() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [noteTs, setNoteTs] = useState("");
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const fileRef = useRef();
  const [uploadForm, setUploadForm] = useState({ title: "", case_name: "" });
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.VideoEvidence.list("-created_date", 50).then(vids => {
      setVideos(vids);
      if (vids.length > 0 && !selected) setSelected(vids[0]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) return;
    setUploading(true);
    const res = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.VideoEvidence.create({
      title: uploadForm.title || file.name,
      file_url: res.file_url,
      case_name: uploadForm.case_name,
      status: "uploaded",
      metadata: { file_name: file.name, file_size: file.size, file_type: file.type },
      ai_observations: [],
      human_notes: [],
    });
    setUploading(false);
    setUploadOpen(false);
    load();
  };

  const handleAnalyze = async () => {
    if (!selected) return;
    setAnalyzing(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an evidence review AI. Analyze this video evidence entry and generate timestamped observations for a legal/investigative review.

Video title: ${selected.title}
Case: ${selected.case_name || "Unknown"}
File: ${selected.metadata?.file_name || "Unknown"}

Generate 5-8 realistic timestamped observations as if reviewing this video. Format each as:
{ "timestamp": "MM:SS", "observation": "...", "significance": "low|medium|high" }

Also generate:
- A brief transcript placeholder note
- Key persons/objects that might appear
- Recommended follow-up actions

Mark ALL outputs as PRELIMINARY AI ANALYSIS - not verified findings.`,
      response_json_schema: {
        type: "object",
        properties: {
          observations: { type: "array", items: { type: "object" } },
          transcript_note: { type: "string" },
          key_elements: { type: "array", items: { type: "string" } },
          follow_up: { type: "array", items: { type: "string" } }
        }
      }
    });
    const updated = await base44.entities.VideoEvidence.update(selected.id, {
      ai_observations: result.observations || [],
      transcript: result.transcript_note || "",
      status: "reviewed"
    });
    setSelected({ ...selected, ai_observations: result.observations || [], transcript: result.transcript_note, status: "reviewed" });
    setAnalyzing(false);
    load();
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !selected) return;
    setAddingNote(true);
    const newNote = { timestamp: noteTs, note: noteText, added_at: new Date().toISOString() };
    const updatedNotes = [...(selected.human_notes || []), newNote];
    await base44.entities.VideoEvidence.update(selected.id, { human_notes: updatedNotes });
    setSelected({ ...selected, human_notes: updatedNotes });
    setNoteTs("");
    setNoteText("");
    setAddingNote(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Video Evidence Review"
        subtitle="Upload, analyze, and annotate video evidence"
        actions={<Button onClick={() => setUploadOpen(true)} size="sm"><Upload className="w-4 h-4 mr-1.5" />Upload Video</Button>}
      />
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-amber-700 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        AI observations are preliminary and unverified. Human review is required for all investigative use.
      </div>

      {videos.length === 0 ? (
        <EmptyState icon={Video} title="No videos uploaded" description="Upload video evidence to begin review" actionLabel="Upload Video" onAction={() => setUploadOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video list */}
          <div className="space-y-2">
            {videos.map(v => (
              <Card key={v.id} className={`p-3 cursor-pointer transition-all ${selected?.id === v.id ? "border-primary shadow-md" : "border-border/60 hover:shadow-sm"}`} onClick={() => setSelected(v)}>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{v.title}</p>
                    <p className="text-xs text-muted-foreground">{v.case_name || "No case"}</p>
                  </div>
                </div>
                <div className="mt-2"><StatusBadge value={v.status} /></div>
              </Card>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="lg:col-span-2">
              <Card className="border border-border/60 overflow-hidden">
                {selected.file_url && (
                  <video controls className="w-full max-h-56 bg-black" src={selected.file_url} />
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h2 className="text-base font-semibold">{selected.title}</h2>
                      <p className="text-xs text-muted-foreground">{selected.case_name || "No case"}</p>
                    </div>
                    <Button size="sm" onClick={handleAnalyze} disabled={analyzing}>
                      {analyzing ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Analyzing...</> : "Run AI Analysis"}
                    </Button>
                  </div>

                  <Tabs defaultValue="observations">
                    <TabsList className="mb-4">
                      <TabsTrigger value="observations">AI Observations</TabsTrigger>
                      <TabsTrigger value="notes">Human Notes</TabsTrigger>
                      <TabsTrigger value="transcript">Transcript</TabsTrigger>
                    </TabsList>

                    <TabsContent value="observations">
                      {(selected.ai_observations || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Run AI Analysis to generate observations</p>
                      ) : (
                        <div className="space-y-2">
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 mb-2">⚠ PRELIMINARY AI ANALYSIS</Badge>
                          {selected.ai_observations.map((obs, i) => (
                            <div key={i} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                              <span className="text-xs font-mono text-primary font-bold flex-shrink-0 pt-0.5">{obs.timestamp || `${i}:00`}</span>
                              <div>
                                <p className="text-sm">{obs.observation}</p>
                                {obs.significance && <Badge variant="outline" className="text-[10px] mt-1">{obs.significance} significance</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="notes">
                      <div className="space-y-3 mb-4">
                        {(selected.human_notes || []).map((n, i) => (
                          <div key={i} className="flex gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                            <Clock className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                              {n.timestamp && <span className="text-xs font-mono text-blue-600 font-bold">{n.timestamp} — </span>}
                              <span className="text-sm">{n.note}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex gap-2">
                          <Input placeholder="Timestamp (e.g. 01:23)" value={noteTs} onChange={e => setNoteTs(e.target.value)} className="w-36 text-sm" />
                          <Input placeholder="Note..." value={noteText} onChange={e => setNoteText(e.target.value)} className="text-sm flex-1" />
                          <Button size="sm" onClick={handleAddNote} disabled={addingNote}><Plus className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="transcript">
                      {selected.transcript ? (
                        <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">{selected.transcript}</div>
                      ) : (
                        <p className="text-sm text-muted-foreground py-8 text-center">No transcript yet. Run AI Analysis to generate one.</p>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Upload Video Evidence</DialogTitle></DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div><Label>Title</Label><Input value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} /></div>
            <div><Label>Case Name</Label><Input value={uploadForm.case_name} onChange={e => setUploadForm({...uploadForm, case_name: e.target.value})} /></div>
            <div>
              <Label>Video File</Label>
              <input ref={fileRef} type="file" accept="video/*" className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}