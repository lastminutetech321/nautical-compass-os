import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '../api/base44';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, FileText, Calendar, Tag } from 'lucide-react';

export default function CanonDraftsSubmit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDrafts, setSelectedDrafts] = useState([]);

  // Fetch user's draft entries
  const { data: drafts, isLoading, error } = useQuery({
    queryKey: ['canon_drafts', 'draft'],
    queryFn: async () => {
      const response = await base44.entity('canon_drafts').find({
        status: 'draft',
        author_id: base44.auth.currentUser?.id
      });
      return response;
    }
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (draft_ids) => {
      return await base44.function('submit_canon_drafts').call({ draft_ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['canon_drafts']);
      navigate('/canon/drafts?status=pending_review');
    }
  });

  const handleToggleDraft = (draftId) => {
    setSelectedDrafts(prev => 
      prev.includes(draftId) 
        ? prev.filter(id => id !== draftId)
        : [...prev, draftId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDrafts.length === drafts?.length) {
      setSelectedDrafts([]);
    } else {
      setSelectedDrafts(drafts?.map(d => d._id) || []);
    }
  };

  const handleSubmit = () => {
    if (selectedDrafts.length === 0) return;
    submitMutation.mutate(selectedDrafts);
  };

  const getCategoryColor = (category) => {
    const colors = {
      doctrine: 'bg-purple-100 text-purple-800',
      governance: 'bg-blue-100 text-blue-800',
      legal: 'bg-red-100 text-red-800',
      technical: 'bg-green-100 text-green-800',
      operational: 'bg-yellow-100 text-yellow-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load drafts: {error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Submit Canon Drafts for Review</h1>
        <p className="text-muted-foreground">
          Select draft entries to submit for Canon review. Selected drafts will be queued for review by Canon administrators.
        </p>
      </div>

      {drafts?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No draft entries found</p>
            <Button onClick={() => navigate('/canon/drafts/new')}>Create New Draft</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedDrafts.length === drafts?.length}
                onCheckedChange={handleSelectAll}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All ({drafts?.length || 0} drafts)
              </label>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedDrafts.length} selected
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {drafts?.map(draft => (
              <Card key={draft._id} className={selectedDrafts.includes(draft._id) ? 'ring-2 ring-primary' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedDrafts.includes(draft._id)}
                      onCheckedChange={() => handleToggleDraft(draft._id)}
                      id={`draft-${draft._id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-2">
                        <label htmlFor={`draft-${draft._id}`} className="cursor-pointer">
                          {draft.title}
                        </label>
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {draft.content?.substring(0, 150)}{draft.content?.length > 150 ? '...' : ''}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getCategoryColor(draft.category)}>
                      {draft.category}
                    </Badge>
                    {draft.priority && draft.priority !== 'medium' && (
                      <Badge variant="outline">{draft.priority}</Badge>
                    )}
                    {draft.tags?.map(tag => (
                      <Badge key={tag} variant="secondary">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {draft.created_at && (
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Created {new Date(draft.created_at).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleSubmit}
              disabled={selectedDrafts.length === 0 || submitMutation.isPending}
              size="lg"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit {selectedDrafts.length} Draft{selectedDrafts.length !== 1 ? 's' : ''} for Review
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/canon/drafts')}
              disabled={submitMutation.isPending}
            >
              Cancel
            </Button>
          </div>

          {submitMutation.isError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to submit drafts: {submitMutation.error?.message || 'Unknown error'}
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
