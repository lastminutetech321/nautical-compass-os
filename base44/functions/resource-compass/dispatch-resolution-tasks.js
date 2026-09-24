/**
 * Resource Compass - Dispatch Resolution Tasks
 * Auto-dispatched by Self-Healing Engine v3
 * Creates and assigns resolution tasks for identified resource issues
 */

import { base44 } from '@base44/node-sdk';

export default async function handler(req) {
  const { issueId, issueType, severity, resourceId, context } = req.body;

  if (!issueId || !issueType || !resourceId) {
    return {
      status: 400,
      body: { error: 'Missing required fields: issueId, issueType, resourceId' }
    };
  }

  try {
    // 1. Fetch the resource issue details
    const issue = await base44.entity('resource_issues').get(issueId);
    if (!issue) {
      return {
        status: 404,
        body: { error: 'Resource issue not found' }
      };
    }

    // 2. Determine resolution strategy based on issue type
    const resolutionStrategy = determineResolutionStrategy(issueType, severity, context);

    // 3. Create resolution tasks
    const tasks = [];
    for (const step of resolutionStrategy.steps) {
      const task = await base44.entity('resolution_tasks').create({
        issue_id: issueId,
        resource_id: resourceId,
        task_type: step.type,
        title: step.title,
        description: step.description,
        priority: step.priority || severity,
        status: 'pending',
        assigned_to: step.assignee || 'auto',
        estimated_duration: step.duration,
        dependencies: step.dependencies || [],
        automation_script: step.automationScript,
        created_at: new Date().toISOString()
      });
      tasks.push(task);
    }

    // 4. Update issue status to 'resolving'
    await base44.entity('resource_issues').update(issueId, {
      status: 'resolving',
      resolution_started_at: new Date().toISOString(),
      resolution_task_count: tasks.length
    });

    // 5. Trigger automated tasks if applicable
    const automatedTasks = tasks.filter(t => t.automation_script);
    for (const task of automatedTasks) {
      await base44.workflow('execute-automated-resolution').trigger({
        taskId: task.id,
        script: task.automation_script
      });
    }

    // 6. Log dispatch event
    await base44.entity('resource_compass_logs').create({
      event_type: 'resolution_dispatched',
      issue_id: issueId,
      resource_id: resourceId,
      task_count: tasks.length,
      automated_count: automatedTasks.length,
      timestamp: new Date().toISOString()
    });

    return {
      status: 200,
      body: {
        success: true,
        issue_id: issueId,
        tasks_created: tasks.length,
        automated_tasks: automatedTasks.length,
        tasks: tasks.map(t => ({
          id: t.id,
          type: t.task_type,
          title: t.title,
          priority: t.priority,
          status: t.status
        }))
      }
    };
  } catch (error) {
    console.error('Error dispatching resolution tasks:', error);
    return {
      status: 500,
      body: { error: 'Failed to dispatch resolution tasks', details: error.message }
    };
  }
}

/**
 * Determine resolution strategy based on issue type and severity
 */
function determineResolutionStrategy(issueType, severity, context) {
  const strategies = {
    'allocation_imbalance': {
      steps: [
        {
          type: 'analysis',
          title: 'Analyze current allocation pattern',
          description: 'Review current resource allocation and identify imbalance root causes',
          priority: 'high',
          duration: '30m',
          automationScript: 'analyze-allocation-pattern'
        },
        {
          type: 'rebalance',
          title: 'Rebalance resource allocation',
          description: 'Adjust allocation weights based on priority and capacity',
          priority: 'high',
          duration: '1h',
          dependencies: ['analysis'],
          automationScript: 'rebalance-allocations'
        },
        {
          type: 'validation',
          title: 'Validate rebalanced state',
          description: 'Confirm allocation balance meets thresholds',
          priority: 'medium',
          duration: '15m',
          dependencies: ['rebalance']
        }
      ]
    },
    'capacity_exceeded': {
      steps: [
        {
          type: 'capacity_audit',
          title: 'Audit current capacity usage',
          description: 'Identify resources exceeding capacity limits',
          priority: severity === 'critical' ? 'critical' : 'high',
          duration: '20m',
          automationScript: 'audit-capacity'
        },
        {
          type: 'scaling',
          title: 'Scale or reallocate resources',
          description: 'Increase capacity or redistribute load',
          priority: 'high',
          duration: '1h',
          dependencies: ['capacity_audit'],
          assignee: severity === 'critical' ? 'sre-team' : 'auto'
        },
        {
          type: 'alert_update',
          title: 'Update capacity thresholds',
          description: 'Adjust alert thresholds to prevent future overruns',
          priority: 'medium',
          duration: '30m',
          dependencies: ['scaling']
        }
      ]
    },
    'underutilization': {
      steps: [
        {
          type: 'utilization_review',
          title: 'Review resource utilization metrics',
          description: 'Identify underutilized resources and causes',
          priority: 'medium',
          duration: '30m',
          automationScript: 'review-utilization'
        },
        {
          type: 'optimization',
          title: 'Optimize or deallocate resources',
          description: 'Reduce allocation or repurpose underutilized resources',
          priority: 'medium',
          duration: '45m',
          dependencies: ['utilization_review']
        }
      ]
    },
    'compliance_violation': {
      steps: [
        {
          type: 'compliance_check',
          title: 'Identify compliance violations',
          description: 'Review resource configuration against compliance rules',
          priority: 'critical',
          duration: '30m',
          assignee: 'compliance-team'
        },
        {
          type: 'remediation',
          title: 'Remediate compliance issues',
          description: 'Apply required configuration changes for compliance',
          priority: 'critical',
          duration: '2h',
          dependencies: ['compliance_check'],
          assignee: 'compliance-team'
        },
        {
          type: 'audit_log',
          title: 'Document compliance remediation',
          description: 'Log all remediation actions for audit trail',
          priority: 'high',
          duration: '20m',
          dependencies: ['remediation']
        }
      ]
    },
    'performance_degradation': {
      steps: [
        {
          type: 'performance_analysis',
          title: 'Analyze performance metrics',
          description: 'Identify bottlenecks and degradation causes',
          priority: 'high',
          duration: '45m',
          automationScript: 'analyze-performance'
        },
        {
          type: 'optimization',
          title: 'Apply performance optimizations',
          description: 'Tune resource configuration for better performance',
          priority: 'high',
          duration: '1h',
          dependencies: ['performance_analysis']
        },
        {
          type: 'monitoring',
          title: 'Enable enhanced monitoring',
          description: 'Set up detailed performance tracking',
          priority: 'medium',
          duration: '30m',
          dependencies: ['optimization']
        }
      ]
    }
  };

  // Return strategy for issue type, or default generic strategy
  return strategies[issueType] || {
    steps: [
      {
        type: 'investigation',
        title: 'Investigate resource issue',
        description: `Manual investigation required for ${issueType}`,
        priority: severity,
        duration: '1h',
        assignee: 'resource-team'
      },
      {
        type: 'resolution',
        title: 'Resolve identified issue',
        description: 'Apply appropriate fix based on investigation',
        priority: severity,
        duration: '2h',
        dependencies: ['investigation'],
        assignee: 'resource-team'
      }
    ]
  };
}
