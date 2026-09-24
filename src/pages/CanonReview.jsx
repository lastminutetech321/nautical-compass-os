import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '../api/base44';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

export default function CanonReview() {
  const queryClient = useQueryClient();
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Fetch submitted entries
  const { data: entries, isLoading } = useQuery({
    queryKey: ['canon_entries', 'submitted'],
    queryFn: async () => {
      const response = await base44.entity('canon_entry').list({
        filters: [
          { field: 'status', operator: 'equals', value: 'submitted' }
        ],
        sort: [{ field: 'submitted_at', order: 'desc' }]
      });
      return response;
    }
  });

  // Approve entry mutation
  const approveMutation = useMutation({
    mutationFn: async ({ entryId, notes }) => {
      return await base44.entity('canon_entry').update(entryId, {
        status: 'approved',
        approved_at: new Date().toISOString(),
        reviewer_notes: notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['canon_entries']);
      setSelectedEntry(null);
      setReviewNotes('');
    }
  });

  // Reject entry mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ entryId, notes }) => {
      return await base44.entity('canon_entry').update(entryId, {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['canon_entries']);
      setSelectedEntry(null);
      setReviewNotes('');
    }
  });

  const handleApprove = (entry) => {
    if (confirm(`Approve entry: ${entry.title}?`)) {
      approveMutation.mutate({ entryId: entry.id, notes: reviewNotes });
    }
  };

  const handleReject = (entry) => {
    if (confirm(`Reject entry: ${entry.title}?`)) {
      rejectMutation.mutate({ entryId: entry.id, notes: reviewNotes });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Clock className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Canon Review Queue</h1>
        <p className="text-muted-foreground">
          {entries?.length || 0} entries pending review
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entry List */}
        <div className="space-y-4">
          {entries?.map((entry) => (
            <Card
              key={entry.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedEntry?.id === entry.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => {
                setSelectedEntry(entry);
                setReviewNotes(entry.reviewer_notes || '');
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold">{entry.title}</h3>
                </div>
                <Badge variant="secondary">{entry.category}</Badge>
              </div>
              {entry.source_file && (
                <p className="text-sm text-muted-foreground mb-2">
                  Source: {entry.source_file}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Submitted: {new Date(entry.submitted_at).toLocaleString()}
              </p>
            </Card>
          ))}

          {(!entries || entries.length === 0) && (
            <Card className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No entries pending review</p>
            </Card>
          )}
        </div>

        {/* Review Panel */}
        <div className="lg:sticky lg:top-6">
          {selectedEntry ? (
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-2">{selectedEntry.title}</h2>
                <div className="flex gap-2 mb-4">
                  <Badge>{selectedEntry.category}</Badge>
                  <Badge variant="outline">v{selectedEntry.version}</Badge>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-2">Content</h3>
                <div className="bg-muted p-4 rounded-md max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">
                    {selectedEntry.content}
                  </pre>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Review Notes
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this entry..."
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleApprove(selectedEntry)}
                  disabled={approveMutation.isPending}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleReject(selectedEntry)}
                  disabled={rejectMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Select an entry to review
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}