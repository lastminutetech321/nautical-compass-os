import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Upload, Shield, FileText, Image, Video, Music, File, Eye, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

const categoryIcons = { document: FileText, photo: Image, video: Video, audio: Music, screenshot: Image, email: FileText, other: File };

async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function EvidenceVault() {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    title: "", source: "", collected_date: "", collected_by: "", case_name: "",
    notes: "", category: "document", tags: "", issue_tags: "", person_tags: "", event_tags: "", location_tags: ""
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    load();
  }, []);

  const load = () => {
    setLoading(true);
    base44.entities.Evidence.list("-created_date", 100).then(setEvidence).finally(() => setLoading(false));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!form.title) setForm(f => ({ ...f, title: file.name }));
      // auto-detect category
      const mime = file.type;
      let cat = "other";
      if (mime.startsWith("image/")) cat = "photo";
      else if (mime.startsWith("video/")) cat = "video";
      else if (mime.startsWith("audio/")) cat = "audio";
      else if (mime === "application/pdf" || mime.includes("document")) cat = "document";
      setForm(f => ({ ...f, category: cat }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    let file_url = null, file_name = null, file_hash = null, file_size = null, file_type = null;
    if (selectedFile) {
      const uploadRes = await base44.integrations.Core.UploadFile({ file: selectedFile });
      file_url = uploadRes.file_url;
      file_name = selectedFile.name;
      file_size = selectedFile.size;
      file_type = selectedFile.type;
      file_hash = await hashFile(selectedFile);
    }
    const custodyEntry = {
      action: "Collected",
      by: form.collected_by || user?.full_name || "Unknown",
      at: new Date().toISOString(),
      note: "Initial upload"
    };
    const data = {
      ...form,
      file_url, file_name, file_hash, file_size, file_type,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      issue_tags: form.issue_tags ? form.issue_tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      person_tags: form.person_tags ? form.person_tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      event_tags: form.event_tags ? form.event_tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      location_tags: form.location_tags ? form.location_tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      chain_of_custody: [custodyEntry],
    };
    await base44.entities.Evidence.create(data);
    setUploading(false);
    setFormOpen(false);
    setSelectedFile(null);
    setForm({ title: "", source: "", collected_date: "", collected_by: "", case_name: "", notes: "", category: "document", tags: "", issue_tags: "", person_tags: "", event_tags: "", location_tags: "" });
    load();
  };

  const filtered = evidence.filter(e => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !(e.case_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter !== "all" && e.category !== catFilter) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Evidence Vault"
        subtitle={`${evidence.length} items · secured with SHA-256 integrity hashing`}
        actions={<Button onClick={() => setFormOpen(true)} size="sm"><Upload className="w-4 h-4 mr-1.5" />Upload Evidence</Button>}
      />
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-amber-700 flex items-start gap-2">
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>Original files are preserved. All uploads are hashed for integrity. Chain of custody is maintained automatically.</span>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-xs text-red-800 flex items-start gap-2">
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
        <span><strong>Access Control Warning:</strong> Files uploaded to the Evidence Vault are stored securely but may contain sensitive personal, legal, or confidential information. Only upload evidence you are authorized to possess. Do not upload medical records, SSNs, financial account numbers, or third-party attorney-client privileged materials without proper authorization. All uploads are audit-logged.</span>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search evidence..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {["document","photo","video","audio","screenshot","email","other"].map(c => (
              <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Shield} title="No evidence uploaded" description="Upload files to begin building your evidence vault" actionLabel="Upload Evidence" onAction={() => setFormOpen(true)} />
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const Icon = categoryIcons[item.category] || File;
            return (
              <Card key={item.id} className="p-4 border border-border/60 hover:shadow-md transition-all cursor-pointer" onClick={() => setViewing(item)}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.case_name || "No case"} · {item.source || "Unknown source"} · {item.collected_date ? moment(item.collected_date).format("MMM D, YYYY") : "No date"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge value={item.status} />
                        <Badge variant="outline" className="text-[11px]">{item.category}</Badge>
                      </div>
                    </div>
                    {item.file_hash && (
                      <p className="text-[10px] text-muted-foreground font-mono mt-1 flex items-center gap-1">
                        <Hash className="w-3 h-3" />SHA-256: {item.file_hash.slice(0, 32)}...
                      </p>
                    )}
                    {(item.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>)}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="w-4 h-4" />Upload Evidence</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} accept="*/*" />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select file</p>
                  <p className="text-xs text-muted-foreground">Any file type supported</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["document","photo","video","audio","screenshot","email","other"].map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Source</Label><Input value={form.source} onChange={e => setForm({...form, source: e.target.value})} placeholder="Where it came from" /></div>
              <div><Label>Case / Project Name</Label><Input value={form.case_name} onChange={e => setForm({...form, case_name: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Collected Date</Label><Input type="date" value={form.collected_date} onChange={e => setForm({...form, collected_date: e.target.value})} /></div>
              <div><Label>Collected By</Label><Input value={form.collected_by} onChange={e => setForm({...form, collected_by: e.target.value})} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Issue Tags (comma separated)</Label><Input value={form.issue_tags} onChange={e => setForm({...form, issue_tags: e.target.value})} placeholder="housing, employment" /></div>
              <div><Label>Person Tags</Label><Input value={form.person_tags} onChange={e => setForm({...form, person_tags: e.target.value})} placeholder="John Doe, Jane Smith" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Event Tags</Label><Input value={form.event_tags} onChange={e => setForm({...form, event_tags: e.target.value})} /></div>
              <div><Label>Location Tags</Label><Input value={form.location_tags} onChange={e => setForm({...form, location_tags: e.target.value})} /></div>
            </div>
            <div><Label>General Tags</Label><Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="important, reviewed" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={uploading}>{uploading ? "Uploading & Hashing..." : "Upload Evidence"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader><DialogTitle>{viewing.title}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {viewing.file_url && viewing.category === "photo" && (
                  <img src={viewing.file_url} alt={viewing.title} className="w-full rounded-lg max-h-64 object-contain bg-muted" />
                )}
                {viewing.file_url && (
                  <a href={viewing.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-2" />View / Download File</Button>
                  </a>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Source</p><p className="font-medium">{viewing.source || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Case</p><p className="font-medium">{viewing.case_name || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Collected By</p><p className="font-medium">{viewing.collected_by || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{viewing.collected_date ? moment(viewing.collected_date).format("MMM D, YYYY") : "—"}</p></div>
                </div>
                {viewing.file_hash && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Hash className="w-3 h-3" />Integrity Hash (SHA-256)</p>
                    <p className="text-xs font-mono break-all">{viewing.file_hash}</p>
                  </div>
                )}
                {viewing.notes && <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{viewing.notes}</p></div>}
                {(viewing.chain_of_custody || []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2">Chain of Custody</p>
                    <div className="space-y-2">
                      {viewing.chain_of_custody.map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs bg-muted p-2 rounded">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          <div><span className="font-medium">{entry.action}</span> by {entry.by} · {moment(entry.at).format("MMM D, YYYY h:mm A")}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}