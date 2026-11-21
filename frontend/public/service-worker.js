self.addEventListener('push', (event) => {
  if (!event.data) return

  const payload = event.data.json()
  event.waitUntil(
    self.registration.showNotification(payload.title || 'DAYTRACK reminder', {
      body: payload.body || 'You have an upcoming event.',
      data: { url: payload.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === target)
      return existing ? existing.focus() : self.clients.openWindow(target)
    }),
  )
})
