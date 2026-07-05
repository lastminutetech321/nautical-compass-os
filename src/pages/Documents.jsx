import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, FileText, Edit2, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

const docTypes = ["document","wiki","template","sop","report"];

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", type: "document", category: "", status: "draft" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.Document.list("-updated_date", 100).then(setDocs).finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (editing) {
      setForm({ title: editing.title, content: editing.content || "", type: editing.type || "document", category: editing.category || "", status: editing.status || "draft" });
    } else {
      setForm({ title: "", content: "", type: "document", category: "", status: "draft" });
    }
  }, [editing, formOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await base44.entities.Document.update(editing.id, form);
    } else {
      await base44.entities.Document.create(form);
    }
    setSaving(false);
    setFormOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.Document.delete(id);
    load();
  };

  const filtered = docs.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && d.type !== typeFilter) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={`${docs.length} documents`}
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }} size="sm"><Plus className="w-4 h-4 mr-1.5" />New Document</Button>}
      />

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {docTypes.map(t => (
              <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No documents" description="Create your first document" actionLabel="New Document" onAction={() => setFormOpen(true)} />
      ) : (
        <Card className="border border-border/60 overflow-hidden">
          <div className="divide-y divide-border/40">
            {filtered.map(doc => (
              <div key={doc.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{moment(doc.updated_date).format("MMM D, YYYY")} · {doc.category || "Uncategorized"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <StatusBadge value={doc.type} />
                  <StatusBadge value={doc.status} />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setViewing(doc); setViewOpen(true); }}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(doc); setFormOpen(true); }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Document" : "New Document"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{docTypes.map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["draft","published","archived"].map(s => <SelectItem key={s} value={s}>{s.replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Category</Label><Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Engineering" /></div>
            </div>
            <div>
              <Label>Content</Label>
              <Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={12} className="font-mono text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge value={viewing.type} />
                  <StatusBadge value={viewing.status} />
                </div>
              </DialogHeader>
              <div className="prose prose-sm max-w-none mt-4">
                <pre className="whitespace-pre-wrap text-sm font-sans">{viewing.content || "No content"}</pre>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}