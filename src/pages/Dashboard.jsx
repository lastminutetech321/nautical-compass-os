import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { FolderKanban, Building2, Users, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import MetricCard from "@/components/shared/MetricCard";
import StatusBadge from "@/components/shared/StatusBadge";
import PageHeader from "@/components/shared/PageHeader";
import moment from "moment";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list("-created_date", 50),
      base44.entities.Organization.list("-created_date", 50),
      base44.entities.Task.list("-created_date", 50),
      base44.entities.Activity.list("-created_date", 10),
    ]).then(([p, o, t, a]) => {
      setProjects(p);
      setOrganizations(o);
      setTasks(t);
      setActivities(a);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status === "active").length;
  const completedTasks = tasks.filter(t => t.status === "done").length;
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Welcome to Nautical Compass OS" />
      
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Active Projects" value={activeProjects} icon={FolderKanban} color="primary" />
        <MetricCard label="Clients" value={organizations.length} icon={Building2} color="purple" />
        <MetricCard label="Tasks Completed" value={completedTasks} icon={CheckCircle} color="success" />
        <MetricCard label="Overdue Tasks" value={overdueTasks} icon={AlertTriangle} color={overdueTasks > 0 ? "danger" : "success"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <Card className="col-span-2 p-0 border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Projects</h2>
            <Link to="/projects" className="text-xs text-primary hover:underline font-medium">View all</Link>
          </div>
          <div className="divide-y divide-border/40">
            {projects.slice(0, 5).map(project => (
              <Link key={project.id} to={`/projects/${project.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{project.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {project.start_date ? moment(project.start_date).format("MMM D") : "No start date"}
                    {project.end_date ? ` — ${moment(project.end_date).format("MMM D")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <StatusBadge value={project.priority} type="priority" />
                  <StatusBadge value={project.status} />
                </div>
              </Link>
            ))}
            {projects.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No projects yet</div>
            )}
          </div>
        </Card>

        {/* Activity Feed */}
        <Card className="p-0 border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            <Link to="/activity" className="text-xs text-primary hover:underline font-medium">View all</Link>
          </div>
          <div className="divide-y divide-border/40">
            {activities.slice(0, 6).map(activity => (
              <div key={activity.id} className="px-5 py-3">
                <p className="text-sm">
                  <span className="font-medium">{activity.user_name || "Someone"}</span>{" "}
                  <span className="text-muted-foreground">{activity.action}</span>{" "}
                  <span className="font-medium">{activity.entity_name}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {moment(activity.created_date).fromNow()}
                </p>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No activity yet</div>
            )}
          </div>
        </Card>
      </div>

      {/* Task Overview */}
      <Card className="mt-6 p-0 border border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Tasks Needing Attention</h2>
          <Link to="/projects" className="text-xs text-primary hover:underline font-medium">View all tasks</Link>
        </div>
        <div className="divide-y divide-border/40">
          {tasks.filter(t => t.status !== "done").slice(0, 5).map(task => (
            <div key={task.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                {task.due_date && (
                  <p className={`text-xs mt-0.5 ${new Date(task.due_date) < new Date() ? "text-red-500" : "text-muted-foreground"}`}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    {moment(task.due_date).format("MMM D, YYYY")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <StatusBadge value={task.priority} type="priority" />
                <StatusBadge value={task.status} />
              </div>
            </div>
          ))}
          {tasks.filter(t => t.status !== "done").length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">All caught up! 🎉</div>
          )}
        </div>
      </Card>
    </div>
  );
}