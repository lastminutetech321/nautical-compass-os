import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '../api/base44';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

export default function CanonReviewQueue() {
  const queryClient = useQueryClient();
  const [selectedEntry, setSelectedEntry] = React.useState(null);
  const [reviewNotes, setReviewNotes] = React.useState('');

  const { data: entries, isLoading } = useQuery({
    queryKey: ['canon_entries', 'pending_review'],
    queryFn: async () => {
      const response = await base44.entities.canon_entry.find({
        status: 'pending_review'
      });
      return response.data || [];
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ entryId, notes }) => {
      await base44.entities.canon_entry.update(entryId, {
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        reviewed_by: 'Founder',
        review_notes: notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['canon_entries']);
      setSelectedEntry(null);
      setReviewNotes('');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ entryId, notes }) => {
      await base44.entities.canon_entry.update(entryId, {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'Founder',
        review_notes: notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['canon_entries']);
      setSelectedEntry(null);
      setReviewNotes('');
    }
  });

  const sendBackMutation = useMutation({
    mutationFn: async ({ entryId, notes }) => {
      await base44.entities.canon_entry.update(entryId, {
        status: 'draft',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'Founder',
        review_notes: notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['canon_entries']);
      setSelectedEntry(null);
      setReviewNotes('');
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Clock className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Canon Review Queue</h1>
          <p className="text-muted-foreground">
            {entries?.length || 0} entries pending review
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* List of entries */}
        <div className="space-y-4">
          {entries?.map((entry) => (
            <Card
              key={entry.id}
              className={`cursor-pointer transition-colors ${
                selectedEntry?.id === entry.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedEntry(entry)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{entry.title}</CardTitle>
                    <CardDescription>
                      Category: {entry.category}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {entry.content}
                </p>
                {entry.source_file && (
                  <div className="flex items-center mt-2 text-xs text-muted-foreground">
                    <FileText className="w-3 h-3 mr-1" />
                    {entry.source_file}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {(!entries || entries.length === 0) && (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No entries pending review</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Review panel */}
        <div className="sticky top-6">
          {selectedEntry ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedEntry.title}</CardTitle>
                <CardDescription>
                  Category: {selectedEntry.category} • Version {selectedEntry.version}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Content</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">
                      {selectedEntry.content}
                    </pre>
                  </div>
                </div>

                {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEntry.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Review Notes</h3>
                  <Textarea
                    placeholder="Add your review notes here..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      approveMutation.mutate({
                        entryId: selectedEntry.id,
                        notes: reviewNotes
                      })
                    }
                    disabled={approveMutation.isPending}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      sendBackMutation.mutate({
                        entryId: selectedEntry.id,
                        notes: reviewNotes
                      })
                    }
                    disabled={sendBackMutation.isPending}
                    className="flex-1"
                  >
                    Send Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      rejectMutation.mutate({
                        entryId: selectedEntry.id,
                        notes: reviewNotes
                      })
                    }
                    disabled={rejectMutation.isPending}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">
                  Select an entry to review
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
