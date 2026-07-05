import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Edit2, Trash2, CheckCircle } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import ProjectForm from "@/components/projects/ProjectForm";
import TaskForm from "@/components/tasks/TaskForm";
import moment from "moment";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.Project.get(id).then(async (p) => {
      setProject(p);
      if (p.organization_id) {
        base44.entities.Organization.get(p.organization_id).then(setOrg).catch(() => {});
      }
      const allTasks = await base44.entities.Task.filter({ project_id: id });
      setTasks(allTasks);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleDeleteTask = async (taskId) => {
    await base44.entities.Task.delete(taskId);
    load();
  };

  const handleDelete = async () => {
    await base44.entities.Project.delete(id);
    navigate("/projects");
  };

  const statusColumns = ["backlog", "todo", "in_progress", "review", "done"];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!project) {
    return <div className="text-center py-16 text-muted-foreground">Project not found</div>;
  }

  return (
    <div>
      <button onClick={() => navigate("/projects")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </button>

      <PageHeader
        title={project.name}
        subtitle={org ? `Client: ${org.name}` : undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Edit2 className="w-3.5 h-3.5 mr-1.5" />Edit</Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}><Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete</Button>
          </div>
        }
      />

      {/* Project Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border border-border/60">
          <p className="text-xs text-muted-foreground mb-1">Status</p>
          <StatusBadge value={project.status} />
        </Card>
        <Card className="p-4 border border-border/60">
          <p className="text-xs text-muted-foreground mb-1">Priority</p>
          <StatusBadge value={project.priority} type="priority" />
        </Card>
        <Card className="p-4 border border-border/60">
          <p className="text-xs text-muted-foreground mb-1">Timeline</p>
          <p className="text-sm font-medium">
            {project.start_date ? moment(project.start_date).format("MMM D") : "—"} → {project.end_date ? moment(project.end_date).format("MMM D") : "—"}
          </p>
        </Card>
        <Card className="p-4 border border-border/60">
          <p className="text-xs text-muted-foreground mb-1">Budget</p>
          <p className="text-sm font-medium">{project.budget ? `$${project.budget.toLocaleString()}` : "—"}</p>
        </Card>
      </div>

      {project.description && (
        <Card className="p-5 mb-6 border border-border/60">
          <p className="text-xs text-muted-foreground mb-1">Description</p>
          <p className="text-sm">{project.description}</p>
        </Card>
      )}

      {/* Tasks */}
      <Tabs defaultValue="board" className="mt-2">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" />Add Task
          </Button>
        </div>

        <TabsContent value="board">
          <div className="grid grid-cols-5 gap-3">
            {statusColumns.map(status => {
              const columnTasks = tasks.filter(t => t.status === status);
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {status.replace(/_/g, " ")}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{columnTasks.length}</span>
                  </div>
                  {columnTasks.map(task => (
                    <Card key={task.id} className="p-3 border border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setEditingTask(task); setTaskFormOpen(true); }}>
                      <p className="text-xs font-medium mb-2">{task.title}</p>
                      <div className="flex items-center justify-between">
                        <StatusBadge value={task.priority} type="priority" />
                        {task.due_date && (
                          <span className={`text-[10px] ${new Date(task.due_date) < new Date() && task.status !== "done" ? "text-red-500" : "text-muted-foreground"}`}>
                            {moment(task.due_date).format("MMM D")}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list">
          {tasks.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No tasks yet" description="Add your first task to this project" actionLabel="Add Task" onAction={() => { setEditingTask(null); setTaskFormOpen(true); }} />
          ) : (
            <Card className="border border-border/60 overflow-hidden">
              <div className="divide-y divide-border/40">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {task.due_date && <p className="text-xs text-muted-foreground">{moment(task.due_date).format("MMM D, YYYY")}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <StatusBadge value={task.priority} type="priority" />
                      <StatusBadge value={task.status} />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingTask(task); setTaskFormOpen(true); }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ProjectForm open={editOpen} onOpenChange={setEditOpen} project={project} onSaved={load} />
      <TaskForm open={taskFormOpen} onOpenChange={setTaskFormOpen} task={editingTask} projectId={id} onSaved={load} />
    </div>
  );
}