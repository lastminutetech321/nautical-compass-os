import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useBase44 } from '@/lib/base44-context';
import { CheckCircle, XCircle, AlertCircle, Clock, GitPullRequest } from 'lucide-react';

const statusColors = {
  queued: 'bg-gray-500',
  assigned: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  blocked: 'bg-red-500',
  waiting_review: 'bg-purple-500',
  unverified: 'bg-orange-500',
  completed: 'bg-green-500',
  failed: 'bg-red-700',
  cancelled: 'bg-gray-600',
  rejected: 'bg-red-800'
};

const verificationIcons = {
  not_executed: <Clock className="w-4 h-4 text-gray-400" />,
  passed: <CheckCircle className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />
};

export function AgentTaskPanel({ task }) {
  const { updateRecord } = useBase44();
  const [reviewNote, setReviewNote] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const handleReview = async (action) => {
    setIsReviewing(true);
    try {
      const updates = {
        reviewed_by: 'Founder',
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote
      };

      if (action === 'approve') {
        updates.status = 'completed';
      } else if (action === 'reject') {
        updates.status = 'rejected';
      } else if (action === 'request_changes') {
        updates.status = 'assigned';
        updates.retry_count = (task.retry_count || 0) + 1;
      }

      await updateRecord('AgentTask', task.id, updates);
      setReviewNote('');
    } catch (error) {
      console.error('Review action failed:', error);
      alert('Failed to process review: ' + error.message);
    } finally {
      setIsReviewing(false);
    }
  };

  const showReviewControls = task.status === 'waiting_review';
  const statusColor = statusColors[task.status] || 'bg-gray-500';
  const verificationIcon = verificationIcons[task.verification_status || 'not_executed'];

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge className={statusColor}>{task.status}</Badge>
              {task.verification_status && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {verificationIcon}
                  {task.verification_status}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {task.agent_name || task.agent_id}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {task.description && (
          <p className="text-sm text-gray-600 mb-4">{task.description}</p>
        )}
        
        {task.files_changed && task.files_changed.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">Files Changed:</h4>
            <ul className="text-sm space-y-1">
              {task.files_changed.map((file, idx) => (
                <li key={idx} className="font-mono text-xs bg-gray-50 p-1 rounded">
                  {file}
                </li>
              ))}
            </ul>
          </div>
        )}

        {task.pr_url && (
          <div className="mb-4">
            <a 
              href={task.pr_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
            >
              <GitPullRequest className="w-4 h-4" />
              View Pull Request
            </a>
          </div>
        )}

        {task.result_summary && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-1">Summary:</h4>
            <p className="text-sm text-gray-700">{task.result_summary}</p>
          </div>
        )}

        {task.error_message && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-800">Error:</h4>
                <p className="text-sm text-red-700">{task.error_message}</p>
              </div>
            </div>
          </div>
        )}

        {showReviewControls && (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded">
            <h4 className="text-sm font-semibold mb-3">Founder Review Required</h4>
            <Textarea
              placeholder="Add review notes (optional)..."
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              className="mb-3"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleReview('approve')}
                disabled={isReviewing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve & Deploy
              </Button>
              <Button
                onClick={() => handleReview('request_changes')}
                disabled={isReviewing}
                variant="outline"
              >
                Request Changes
              </Button>
              <Button
                onClick={() => handleReview('reject')}
                disabled={isReviewing}
                variant="destructive"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {task.reviewed_by && (
          <div className="mt-4 text-sm text-gray-600">
            <p>Reviewed by {task.reviewed_by} on {new Date(task.reviewed_at).toLocaleString()}</p>
            {task.review_note && <p className="italic mt-1">"{task.review_note}"</p>}
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500">
          Created: {new Date(task.created_at).toLocaleString()}
          {task.completed_at && ` • Completed: ${new Date(task.completed_at).toLocaleString()}`}
        </div>
      </CardContent>
    </Card>
  );
}
