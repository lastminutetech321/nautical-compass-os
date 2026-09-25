import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

const PRIORITY_COLORS = {
  critical: 'destructive',
  high: 'orange',
  medium: 'yellow',
  low: 'secondary'
}

const PRIORITY_ICONS = {
  critical: AlertTriangle,
  high: AlertTriangle,
  medium: Clock,
  low: Clock
}

export default function NotificationCenter() {
  const queryClient = useQueryClient()
  const [selectedTab, setSelectedTab] = useState('critical')
  const [processingIds, setProcessingIds] = useState(new Set())

  // Fetch all unread critical notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', 'critical', 'unread'],
    queryFn: async () => {
      const result = await api.entities.notification.list({
        filter: {
          read: false,
          priority: { $in: ['critical', 'high'] }
        },
        sort: [{ field: 'created_at', direction: 'desc' }],
        limit: 100
      })
      return result.data || []
    },
    refetchInterval: 30000 // Poll every 30s
  })

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await api.entities.notification.update(notificationId, {
        read: true,
        read_at: new Date().toISOString()
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
    }
  })

  // Acknowledge and resolve notification
  const acknowledgeNotification = async (notification) => {
    if (processingIds.has(notification.id)) return
    
    setProcessingIds(prev => new Set(prev).add(notification.id))
    
    try {
      // Mark as read
      await markAsReadMutation.mutateAsync(notification.id)
      
      // Handle specific notification types
      switch (notification.type) {
        case 'system_alert':
        case 'workflow_failed':
        case 'integration_error':
          // Log acknowledgment
          await api.functions.invoke('log_notification_acknowledgment', {
            notification_id: notification.id,
            acknowledged_by: 'system_admin',
            notes: 'Acknowledged during critical notification triage'
          })
          break
          
        case 'payment_failed':
          // Attempt to retry payment or log for manual review
          await api.functions.invoke('retry_failed_payment', {
            notification_id: notification.id
          })
          break
          
        case 'data_sync_error':
          // Trigger sync repair
          await api.functions.invoke('repair_data_sync', {
            notification_id: notification.id
          })
          break
          
        default:
          // Generic acknowledgment
          break
      }
      
      toast.success(`Acknowledged: ${notification.title}`)
    } catch (error) {
      console.error('Failed to acknowledge notification:', error)
      toast.error(`Failed to acknowledge: ${notification.title}`)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(notification.id)
        return next
      })
    }
  }

  // Bulk acknowledge all visible notifications
  const acknowledgeAllMutation = useMutation({
    mutationFn: async (notificationIds) => {
      const results = await Promise.allSettled(
        notificationIds.map(id => 
          api.entities.notification.update(id, {
            read: true,
            read_at: new Date().toISOString()
          })
        )
      )
      
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      return { succeeded, failed }
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries(['notifications'])
      if (failed === 0) {
        toast.success(`Acknowledged ${succeeded} notifications`)
      } else {
        toast.warning(`Acknowledged ${succeeded} notifications, ${failed} failed`)
      }
    }
  })

  const criticalNotifications = notifications?.filter(n => n.priority === 'critical') || []
  const highNotifications = notifications?.filter(n => n.priority === 'high') || []
  const totalUnread = criticalNotifications.length + highNotifications.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Critical Notification Triage</h1>
          <p className="text-muted-foreground mt-2">
            {totalUnread} unread critical/high priority notifications
          </p>
        </div>
        
        {totalUnread > 0 && (
          <Button
            onClick={() => acknowledgeAllMutation.mutate(
              notifications.map(n => n.id)
            )}
            disabled={acknowledgeAllMutation.isPending}
          >
            {acknowledgeAllMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              `Acknowledge All (${totalUnread})`
            )}
          </Button>
        )}
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="critical">
            Critical
            {criticalNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {criticalNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="high">
            High
            {highNotifications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {highNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="critical" className="space-y-4">
          {criticalNotifications.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold">All Clear</h3>
              <p className="text-muted-foreground">No critical notifications</p>
            </Card>
          ) : (
            criticalNotifications.map(notification => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onAcknowledge={acknowledgeNotification}
                isProcessing={processingIds.has(notification.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="high" className="space-y-4">
          {highNotifications.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold">All Clear</h3>
              <p className="text-muted-foreground">No high priority notifications</p>
            </Card>
          ) : (
            highNotifications.map(notification => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onAcknowledge={acknowledgeNotification}
                isProcessing={processingIds.has(notification.id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NotificationCard({ notification, onAcknowledge, isProcessing }) {
  const Icon = PRIORITY_ICONS[notification.priority] || Clock
  
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div className={`p-2 rounded-lg ${
            notification.priority === 'critical' 
              ? 'bg-red-100 dark:bg-red-900/20' 
              : 'bg-orange-100 dark:bg-orange-900/20'
          }`}>
            <Icon className={`h-5 w-5 ${
              notification.priority === 'critical'
                ? 'text-red-600 dark:text-red-400'
                : 'text-orange-600 dark:text-orange-400'
            }`} />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{notification.title}</h3>
              <Badge variant={PRIORITY_COLORS[notification.priority]}>
                {notification.priority}
              </Badge>
              {notification.type && (
                <Badge variant="outline">{notification.type}</Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {notification.message || notification.description}
            </p>
            
            {notification.metadata && Object.keys(notification.metadata).length > 0 && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <div className="text-xs font-mono space-y-1">
                  {Object.entries(notification.metadata).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-muted-foreground">{key}:</span>{' '}
                      <span>{JSON.stringify(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                Created: {new Date(notification.created_at).toLocaleString()}
              </span>
              {notification.source && (
                <span>Source: {notification.source}</span>
              )}
            </div>
          </div>
        </div>
        
        <Button
          size="sm"
          onClick={() => onAcknowledge(notification)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing</>
          ) : (
            <><CheckCircle2 className="mr-2 h-4 w-4" /> Acknowledge</>
          )}
        </Button>
      </div>
    </Card>
  )
}
