import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Search, Building2, Edit2, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import OrganizationForm from "@/components/clients/OrganizationForm";

export default function Clients() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.Organization.list("-created_date", 100).then(setOrgs).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = orgs.filter(o => {
    if (search && !o.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && o.type !== typeFilter) return false;
    return true;
  });

  const handleDelete = async (id) => {
    await base44.entities.Organization.delete(id);
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Clients & Organizations"
        subtitle={`${orgs.length} organizations`}
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }} size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Organization</Button>}
      />

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search organizations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {["client","partner","vendor","internal"].map(s => (
              <SelectItem key={s} value={s}>{s.replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations found"
          description={orgs.length === 0 ? "Add your first client or partner" : "Try adjusting your filters"}
          actionLabel={orgs.length === 0 ? "Add Organization" : undefined}
          onAction={orgs.length === 0 ? () => setFormOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(org => (
            <Card key={org.id} className="p-5 border border-border/60 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">{org.name}</h3>
                    {org.industry && <p className="text-xs text-muted-foreground">{org.industry}</p>}
                  </div>
                </div>
                <StatusBadge value={org.status} />
              </div>
              
              <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                {org.email && <p>{org.email}</p>}
                {org.phone && <p>{org.phone}</p>}
                {org.website && (
                  <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    {org.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex items-center justify-between">
                <StatusBadge value={org.type} />
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(org); setFormOpen(true); }}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(org.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <OrganizationForm open={formOpen} onOpenChange={setFormOpen} organization={editing} onSaved={load} />
    </div>
  );
}