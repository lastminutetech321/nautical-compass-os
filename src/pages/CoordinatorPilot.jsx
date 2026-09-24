import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle2, Circle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../lib/auth';
import base44 from '../api/base44';

const CoordinatorPilot = () => {
  const { user } = useAuth();
  const [interactions, setInteractions] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [checklist, setChecklist] = useState([
    { id: 1, task: 'First login completed', done: false },
    { id: 2, task: '30-min onboarding call scheduled', done: false },
    { id: 3, task: 'First job assigned via Dispatch', done: false },
    { id: 4, task: 'First crew member added to Workforce Hub', done: false },
    { id: 5, task: 'First booking confirmed via Booking Engine', done: false },
    { id: 6, task: 'First contract sent via Contracts rail', done: false },
    { id: 7, task: 'Week 1 check-in completed', done: false },
    { id: 8, task: 'Week 2 check-in completed', done: false },
    { id: 9, task: 'Month 1 review completed', done: false },
  ]);

  useEffect(() => {
    loadInteractions();
    loadChecklistProgress();
  }, []);

  const loadInteractions = async () => {
    try {
      const response = await base44.entities.list('coordinator_pilot_interactions', {
        filters: { pilot_name: 'Brian Casto' },
        sort: '-created_at',
        limit: 50
      });
      setInteractions(response.data || []);
    } catch (error) {
      console.error('Failed to load interactions:', error);
    }
  };

  const loadChecklistProgress = async () => {
    try {
      const response = await base44.entities.list('coordinator_pilot_checklist', {
        filters: { pilot_name: 'Brian Casto' }
      });
      if (response.data && response.data.length > 0) {
        const saved = response.data[0];
        setChecklist(prev => prev.map(item => ({
          ...item,
          done: saved.completed_tasks?.includes(item.id) || false
        })));
      }
    } catch (error) {
      console.error('Failed to load checklist:', error);
    }
  };

  const logInteraction = async () => {
    if (!newNote.trim()) return;

    try {
      await base44.entities.create('coordinator_pilot_interactions', {
        pilot_name: 'Brian Casto',
        timestamp: new Date().toISOString(),
        note: newNote,
        logged_by: user?.email || 'system',
      });
      setNewNote('');
      loadInteractions();
    } catch (error) {
      console.error('Failed to log interaction:', error);
    }
  };

  const toggleChecklistItem = async (id) => {
    const updated = checklist.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    setChecklist(updated);

    try {
      await base44.entities.upsert('coordinator_pilot_checklist', {
        pilot_name: 'Brian Casto',
        completed_tasks: updated.filter(i => i.done).map(i => i.id),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save checklist:', error);
    }
  };

  const completedCount = checklist.filter(i => i.done).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Brian Casto — Coordinator Pilot</h1>
          <p className="text-muted-foreground mt-1">Pilot duration: Through 2026-12-31</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/BRIAN_CASTO_PILOT.md" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Full Pilot Doc
          </a>
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Objective:</strong> Make Brian self-sufficient on the platform while capturing every interaction for workflow learning.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Progress</CardTitle>
            <CardDescription>
              {completedCount} of {checklist.length} tasks completed ({progressPercent}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                  onClick={() => toggleChecklistItem(item.id)}
                >
                  {item.done ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className={item.done ? 'line-through text-muted-foreground' : ''}>
                    {item.task}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links — Coordinator Rails</CardTitle>
            <CardDescription>Brian's primary workflow areas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/dispatch/jobs">
                <Clock className="w-4 h-4 mr-2" />
                Dispatch System
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/workforce/crew">
                <Clock className="w-4 h-4 mr-2" />
                Workforce Hub
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/booking/calendar">
                <Clock className="w-4 h-4 mr-2" />
                Booking Engine
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/schedule/overview">
                <Clock className="w-4 h-4 mr-2" />
                Scheduling Tools
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/contracts/templates">
                <Clock className="w-4 h-4 mr-2" />
                Contracts
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interaction Log</CardTitle>
          <CardDescription>
            Every question, friction point, and resolution — captured for workflow learning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Log a new interaction: What happened? What did Brian ask? How was it resolved?"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <Button onClick={logInteraction} disabled={!newNote.trim()}>
              Log Interaction
            </Button>
          </div>

          <div className="border-t pt-4 space-y-3 max-h-96 overflow-y-auto">
            {interactions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No interactions logged yet.</p>
            ) : (
              interactions.map((interaction, idx) => (
                <div key={idx} className="p-3 bg-accent rounded space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(interaction.timestamp).toLocaleString()}</span>
                    <span>Logged by: {interaction.logged_by}</span>
                  </div>
                  <p className="text-sm">{interaction.note}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Success Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Time to first job dispatch</p>
              <p className="text-muted-foreground">Target: &lt; 24 hours after login</p>
              <p className="text-xs mt-1">⏳ Tracking in progress</p>
            </div>
            <div>
              <p className="font-semibold">Questions asked (week 1)</p>
              <p className="text-muted-foreground">Baseline (no target)</p>
              <p className="text-xs mt-1">⏳ Tracking in progress</p>
            </div>
            <div>
              <p className="font-semibold">Questions asked (week 4)</p>
              <p className="text-muted-foreground">Target: 50% reduction from week 1</p>
              <p className="text-xs mt-1">⏳ Tracking in progress</p>
            </div>
            <div>
              <p className="font-semibold">Self-reported confidence</p>
              <p className="text-muted-foreground">"I can do this alone" by month 2</p>
              <p className="text-xs mt-1">⏳ Survey pending</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoordinatorPilot;
