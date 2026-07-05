import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Search, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import ProjectForm from "@/components/projects/ProjectForm";
import moment from "moment";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Project.list("-created_date", 100),
      base44.entities.Organization.list(),
    ]).then(([p, o]) => { setProjects(p); setOrgs(o); }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const orgMap = Object.fromEntries(orgs.map(o => [o.id, o]));
  const filtered = projects.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} total projects`}
        actions={<Button onClick={() => setFormOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" />New Project</Button>}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["planning","active","on_hold","completed","cancelled"].map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description={projects.length === 0 ? "Create your first project to get started" : "Try adjusting your filters"}
          actionLabel={projects.length === 0 ? "Create Project" : undefined}
          onAction={projects.length === 0 ? () => setFormOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="p-5 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold truncate pr-2">{project.name}</h3>
                  <StatusBadge value={project.status} />
                </div>
                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{orgMap[project.organization_id]?.name || "No client"}</span>
                  <StatusBadge value={project.priority} type="priority" />
                </div>
                {(project.start_date || project.end_date) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {project.start_date ? moment(project.start_date).format("MMM D") : "?"} — {project.end_date ? moment(project.end_date).format("MMM D, YYYY") : "?"}
                  </p>
                )}
                {typeof project.progress === "number" && project.progress > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{width: `${project.progress}%`}} />
                    </div>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ProjectForm open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
    </div>
  );
}