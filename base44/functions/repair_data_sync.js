/**
 * Repair Data Sync
 * Attempts to repair data synchronization issues
 */

export default async function handler(event, context) {
  const { notification_id } = event.body || {}
  
  if (!notification_id) {
    return {
      statusCode: 400,
      body: { error: 'notification_id is required' }
    }
  }
  
  try {
    // Get the notification
    const notification = await context.entities.notification.get(notification_id)
    
    if (!notification || notification.type !== 'data_sync_error') {
      return {
        statusCode: 400,
        body: { error: 'Invalid notification type for sync repair' }
      }
    }
    
    // Extract sync info from notification metadata
    const syncType = notification.metadata?.sync_type
    const entityType = notification.metadata?.entity_type
    const recordId = notification.metadata?.record_id
    
    // Log the repair attempt
    await context.entities.notification_log.create({
      notification_id,
      action: 'sync_repair_attempted',
      sync_type: syncType,
      entity_type: entityType,
      record_id: recordId,
      notes: 'Data sync repair initiated'
    })
    
    // Trigger sync repair based on type
    switch (syncType) {
      case 'github':
        // Re-trigger GitHub sync
        await context.workflows.trigger('github_sync_repair', {
          entity_type: entityType,
          record_id: recordId
        })
        break
        
      case 'payment':
        // Re-sync payment data
        await context.workflows.trigger('payment_sync_repair', {
          record_id: recordId
        })
        break
        
      case 'entity':
        // Generic entity sync repair
        await context.workflows.trigger('entity_sync_repair', {
          entity_type: entityType,
          record_id: recordId
        })
        break
        
      default:
        // Unknown sync type - log for manual review
        await context.entities.notification_log.create({
          notification_id,
          action: 'manual_review_required',
          notes: `Unknown sync type: ${syncType}`,
          status: 'pending_manual_review'
        })
        return {
          statusCode: 202,
          body: {
            success: false,
            message: 'Sync repair requires manual review',
            manual_review_required: true
          }
        }
    }
    
    return {
      statusCode: 200,
      body: {
        success: true,
        message: 'Sync repair initiated',
        notification_id,
        sync_type: syncType,
        entity_type: entityType
      }
    }
  } catch (error) {
    console.error('Failed to repair data sync:', error)
    return {
      statusCode: 500,
      body: { error: error.message }
    }
  }
}
