import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
} from '../lib/supabaseClient'
import { useToast } from '../contexts/ToastProvider'
import Avatar from './Avatar'
import type { Notification } from '../types'

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

useEffect(() => {
    loadNotifications()
    loadUnreadCount()

    // Subscribe to real-time notifications
    let subscription: any = null
    try {
      subscription = subscribeToNotifications((payload) => {
        // Reload notifications when a new one comes in
        loadNotifications()
        loadUnreadCount()
        // Show a toast for the new notification
        showToastForNotification(payload.new as Notification)
      })
    } catch (err) {
      // Silently handle if realtime is not available
    }

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        try { subscription.unsubscribe() } catch {}
      }
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data)
    } catch (err) {
      console.error('Error loading notifications:', err)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount()
      setUnreadCount(count)
    } catch (err) {
      console.error('Error loading unread count:', err)
    }
  }

  const handleMarkRead = async (notificationId: string) => {
    await markNotificationRead(notificationId)
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const getToastMessage = (notification: Notification): string => {
    const actorName = notification.actor?.full_name || notification.actor?.username || 'Someone'
    switch (notification.type) {
      case 'follow':
        return `${actorName} started following you`
      case 'follow_request':
        return `${actorName} wants to follow you`
      case 'follow_accept':
        return `${actorName} accepted your follow request`
      case 'like':
        return `${actorName} liked your post`
      case 'comment':
        return `${actorName} commented on your post`
      case 'mention':
        return `${actorName} mentioned you`
      default:
        return 'New notification'
    }
  }

  const showToastForNotification = (notification: Notification) => {
    const message = getToastMessage(notification)
    showToast(message, 'info', 5000)
  }

  const getNotificationText = (notification: Notification): { text: string; link: string } => {
    const actorName = notification.actor?.full_name || notification.actor?.username || 'Someone'
    switch (notification.type) {
      case 'follow':
        return { text: `${actorName} started following you`, link: `/profile/${notification.actor_id}` }
      case 'follow_request':
        return { text: `${actorName} wants to follow you`, link: `/profile/${notification.actor_id}` }
      case 'follow_accept':
        return { text: `${actorName} accepted your follow request`, link: `/profile/${notification.actor_id}` }
      case 'like':
        return { text: `${actorName} liked your post`, link: notification.post_id ? `/post/${notification.post_id}` : '#' }
      case 'comment':
        return { text: `${actorName} commented on your post`, link: notification.post_id ? `/post/${notification.post_id}` : '#' }
      case 'mention':
        return { text: `${actorName} mentioned you`, link: notification.post_id ? `/post/${notification.post_id}` : '#' }
      default:
        return { text: 'New notification', link: '#' }
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)
    if (diffSec < 60) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHour < 24) return `${diffHour}h ago`
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            loadNotifications()
            // Mark all as read when opening notifications
            if (unreadCount > 0) {
              handleMarkAllRead()
            }
          }
        }}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative p-2 rounded-full border-2 border-transparent hover:bg-[#e0f2fe] hover:border-[#6bc8e6] hover:shadow-lg hover:shadow-[#6bc8e6]/50 transition-all duration-300 ease-in-out"
        title="Notifications"
      >
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-gray-500 text-sm">No notifications yet</p>
                <p className="text-gray-400 text-xs mt-1">When someone likes or follows you, it will show up here</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const { text, link } = getNotificationText(notif)
                return (
                  <Link
                    key={notif.id}
                    to={link}
                    onClick={() => {
                      if (!notif.is_read) handleMarkRead(notif.id)
                      setIsOpen(false)
                    }}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      !notif.is_read ? 'bg-indigo-50/50' : ''
                    }`}
                  >
                    {/* Actor Avatar */}
                    <Avatar
                      src={notif.actor?.avatar_url}
                      name={notif.actor?.full_name || notif.actor?.username}
                      size="w-9 h-9"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">{text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatTime(notif.created_at)}</p>
                    </div>

                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                    )}
                  </Link>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell

