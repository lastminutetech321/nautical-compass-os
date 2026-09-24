/**
 * Update Build Checklist
 * 
 * Updates task completion status in build task_checklist.
 * Used by build pipelines to track progress.
 * 
 * @param {string} buildId - The build record ID
 * @param {number} taskIndex - Index of the task to update
 * @param {boolean} completed - Completion status
 * @returns {object} Updated build record
 */

export default async function updateBuildChecklist({ buildId, taskIndex, completed }) {
  const { data: build } = await this.entity('build').findById(buildId);
  
  if (!build) {
    throw new Error(`Build ${buildId} not found`);
  }
  
  const checklist = build.task_checklist || [];
  
  if (taskIndex < 0 || taskIndex >= checklist.length) {
    throw new Error(`Invalid task index ${taskIndex}`);
  }
  
  checklist[taskIndex].completed = completed;
  checklist[taskIndex].completed_at = completed ? new Date().toISOString() : null;
  
  const { data: updated } = await this.entity('build').update(buildId, {
    task_checklist: checklist,
    updated_at: new Date().toISOString()
  });
  
  return {
    success: true,
    build: updated,
    task: checklist[taskIndex]
  };
}
