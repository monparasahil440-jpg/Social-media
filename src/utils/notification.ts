/**
 * Browser Notification Utility
 * Handles requesting permission and showing browser notifications
 */

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  onClick?: () => void
}

let permission: NotificationPermission = 'default'

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    permission = 'granted'
    return 'granted'
  }

  if (Notification.permission !== 'denied') {
    const result = await Notification.requestPermission()
    permission = result
    return result
  }

  permission = 'denied'
  return 'denied'
}

/**
 * Check if notifications are supported and permission is granted
 */
export function canShowNotifications(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

/**
 * Show a browser notification
 */
export function showNotification(options: NotificationOptions): void {
  if (!canShowNotifications()) {
    console.warn('Cannot show notification: permission not granted or not supported')
    return
  }

  const notification = new Notification(options.title, {
    body: options.body,
    icon: options.icon || '/favicon.svg',
    badge: options.badge || '/favicon.svg',
    requireInteraction: true,
  })

  if (options.onClick) {
    notification.onclick = () => {
      options.onClick?.()
      notification.close()
      window.focus()
    }
  }

  // Auto-close after 5 seconds
  setTimeout(() => {
    notification.close()
  }, 5000)
}

/**
 * Get current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}
