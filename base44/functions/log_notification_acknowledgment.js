/**
 * Log Notification Acknowledgment
 * Records when a notification is acknowledged and by whom
 */

export default async function handler(event, context) {
  const { notification_id, acknowledged_by, notes } = event.body || {}
  
  if (!notification_id) {
    return {
      statusCode: 400,
      body: { error: 'notification_id is required' }
    }
  }
  
  try {
    // Get the notification
    const notification = await context.entities.notification.get(notification_id)
    
    if (!notification) {
      return {
        statusCode: 404,
        body: { error: 'Notification not found' }
      }
    }
    
    // Create acknowledgment log entry
    const logEntry = await context.entities.notification_log.create({
      notification_id,
      action: 'acknowledged',
      acknowledged_by: acknowledged_by || context.user?.id || 'system',
      acknowledged_at: new Date().toISOString(),
      notes: notes || 'Acknowledged during critical notification triage',
      notification_type: notification.type,
      notification_priority: notification.priority,
      metadata: {
        original_notification: {
          title: notification.title,
          message: notification.message,
          created_at: notification.created_at
        }
      }
    })
    
    // Update notification with acknowledgment info
    await context.entities.notification.update(notification_id, {
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: acknowledged_by || context.user?.id || 'system'
    })
    
    return {
      statusCode: 200,
      body: {
        success: true,
        log_id: logEntry.id,
        notification_id
      }
    }
  } catch (error) {
    console.error('Failed to log notification acknowledgment:', error)
    return {
      statusCode: 500,
      body: { error: error.message }
    }
  }
}
