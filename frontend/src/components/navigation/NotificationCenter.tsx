import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Check, LoaderCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../../services/apiClient'
import { notificationService } from '../../services/notificationService'
import type { AppNotification, BrowserPushSubscription } from '../../features/calendar/types'

function decodeApplicationKey(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

export function NotificationCenter() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null)

  const loadNotifications = useCallback(async () => {
    try {
      const result = await notificationService.list()
      setNotifications(result)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }, [])

  useEffect(() => {
    void loadNotifications()
    const intervalId = window.setInterval(() => void loadNotifications(), 45_000)
    return () => window.clearInterval(intervalId)
  }, [loadNotifications])

  useEffect(() => {
    async function detectPushSubscription() {
      try {
        const config = await notificationService.getPushPublicKey()
        if (!config.enabled || !('serviceWorker' in navigator) || !('PushManager' in window)) {
          setPushEnabled(false)
          return
        }
        const registration = await navigator.serviceWorker.getRegistration('/service-worker.js')
        setPushEnabled(Boolean(await registration?.pushManager.getSubscription()))
      } catch (requestError) {
        setError(getErrorMessage(requestError))
      }
    }
    void detectPushSubscription()
  }, [])

  const unreadCount = notifications.filter((notification) => !notification.read_at).length

  async function enablePush() {
    setError(null)
    setBusy(true)
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        throw new Error('This browser does not support web push notifications.')
      }
      if (!window.isSecureContext) {
        throw new Error('Browser notifications require HTTPS or localhost.')
      }
      const keyResponse = await notificationService.getPushPublicKey()
      if (!keyResponse.enabled || !keyResponse.public_key) {
        setPushEnabled(false)
        throw new Error('Web Push is not configured on the server. In-app reminders remain available.')
      }
      const permission = await window.Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error(permission === 'denied'
          ? 'Browser notifications are blocked. Allow them in your browser settings to enable reminders.'
          : 'Allow browser notifications to receive event reminders.')
      }
      const registration = await navigator.serviceWorker.register('/service-worker.js')
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationKey(keyResponse.public_key),
        })
      }

      const serialized = subscription.toJSON()
      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
        throw new Error('The browser returned an incomplete push subscription.')
      }
      const payload: BrowserPushSubscription = {
        endpoint: serialized.endpoint,
        keys: {
          p256dh: serialized.keys.p256dh,
          auth: serialized.keys.auth,
        },
      }
      await notificationService.savePushSubscription(payload)
      setPushEnabled(true)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function disablePush() {
    setError(null)
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration('/service-worker.js')
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        await notificationService.deletePushSubscription(subscription.endpoint)
        await subscription.unsubscribe()
      }
      setPushEnabled(false)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function openNotification(notification: AppNotification) {
    setOpen(false)
    if (!notification.read_at) {
      try {
        const updated = await notificationService.markRead(notification.id)
        setNotifications((current) =>
          current.map((item) => item.id === updated.id ? updated : item),
        )
      } catch (requestError) {
        setError(getErrorMessage(requestError))
      }
    }
    const path = notification.url.startsWith('/') && !notification.url.startsWith('//')
      ? notification.url
      : '/calendar'
    navigate(path)
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current)
          setError(null)
        }}
        className="relative grid size-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-2 top-[68px] z-[80] w-[min(360px,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-400">{unreadCount} unread</p>
            </div>
            {pushEnabled === true ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void disablePush()}
                title="Turn off browser notifications"
                className="grid size-8 place-items-center rounded-lg text-cyan-700 transition hover:bg-cyan-50 disabled:opacity-50"
              >
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <BellRing size={16} />}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void enablePush()}
                title="Enable browser notifications"
                className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <BellOff size={16} />}
              </button>
            )}
          </div>
          {error && <p role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</p>}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell size={20} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-600">You're all caught up</p>
              <p className="mt-1 text-xs text-slate-400">Event reminders will appear here.</p>
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => void openNotification(notification)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                      notification.read_at ? '' : 'bg-cyan-50/50'
                    }`}
                  >
                    <span className="flex items-start gap-2.5">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        notification.read_at ? 'bg-slate-200' : 'bg-cyan-600'
                      }`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">{notification.title}</span>
                          {notification.read_at && <Check size={13} className="shrink-0 text-slate-400" />}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">{notification.body}</span>
                        <span className="mt-1 block text-[10px] text-slate-400">
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 px-4 py-2">
            <p className="text-[10px] text-slate-400">
              {pushEnabled ? 'Browser alerts are enabled.' : 'Enable browser alerts to be notified outside this page.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
