/**
 * Assigns the appropriate worker/agent to a resolution task based on issue type and priority
 */
export default async function assignResolutionWorker({ task_id, issue_type, priority }, context) {
  const { db } = context;

  // Worker assignment logic based on issue type
  const workerMap = {
    'entity_schema': 'entity_architect',
    'function_error': 'function_debugger',
    'workflow_failure': 'workflow_optimizer',
    'integration_issue': 'integration_specialist',
    'performance': 'performance_analyzer',
    'security': 'security_auditor',
    'data_integrity': 'data_validator',
    'ui_component': 'frontend_engineer',
    'api_endpoint': 'backend_engineer',
    'default': 'general_resolver'
  };

  const assignedWorker = workerMap[issue_type] || workerMap.default;

  // Update the task with assigned worker
  await db.update('resolution_tasks', task_id, {
    assigned_worker: assignedWorker,
    status: 'assigned',
    metadata: {
      assignment_timestamp: new Date().toISOString(),
      priority,
      auto_assigned: true
    }
  });

  // Log assignment
  console.log(`Task ${task_id} assigned to ${assignedWorker} (type: ${issue_type}, priority: ${priority})`);

  return {
    success: true,
    task_id,
    assigned_worker: assignedWorker,
    timestamp: new Date().toISOString()
  };
}
