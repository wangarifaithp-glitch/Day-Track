import { apiRequest } from './apiClient'
import type { AppNotification, BrowserPushSubscription } from '../features/calendar/types'

export const notificationService = {
  list: () => apiRequest<AppNotification[]>('/notifications?limit=30'),
  markRead: (id: string) =>
    apiRequest<AppNotification>(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
    }),
  getPushPublicKey: () =>
    apiRequest<{ enabled: boolean; public_key: string | null }>('/notifications/push/public-key'),
  savePushSubscription: (subscription: BrowserPushSubscription) =>
    apiRequest<{ id: string }>('/notifications/push-subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscription),
    }),
  deletePushSubscription: (endpoint: string) =>
    apiRequest<void>(`/notifications/push-subscriptions?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'DELETE',
    }),
}
