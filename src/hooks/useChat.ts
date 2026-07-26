import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import {
  getUserConversations,
  getMessages,
  sendMessage as sendMessageApi,
  createOrGetConversation,
  markConversationRead,
  subscribeToConversationMessages,
  subscribeToConversationList,
  uploadImage,
} from '../lib/supabaseClient'
import type { Conversation, Message } from '../types'

export function useChat() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const subscriptionsRef = useRef<{ unsubscribe: () => void }[]>([])

  const loadConversations = useCallback(async () => {
    if (!user) {
      setConversations([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getUserConversations()
      setConversations(data)
    } catch (err: any) {
      console.error('Error loading conversations:', err)
      setError(err.message || 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Subscribe to realtime updates for conversation list
  useEffect(() => {
    if (!user) return

    const handleNewMessage = () => {
      // Reload conversations when a new message arrives
      loadConversations()
    }

    const sub = subscribeToConversationList(user.id, handleNewMessage)
    subscriptionsRef.current.push(sub)

    return () => {
      subscriptionsRef.current.forEach(s => s.unsubscribe())
      subscriptionsRef.current = []
    }
  }, [user, loadConversations])

  const startConversation = async (otherUserId: string): Promise<Conversation | null> => {
    try {
      const conv = await createOrGetConversation(otherUserId)
      await loadConversations()
      return conv
    } catch (err: any) {
      console.error('Error starting conversation:', err)
      setError(err.message || 'Failed to start conversation')
      return null
    }
  }

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)

  return {
    conversations,
    loading,
    error,
    totalUnread,
    startConversation,
    refreshConversations: loadConversations,
  }
}

export function useConversationMessages(conversationId: string | null) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  const loadMessages = useCallback(async () => {
    if (!conversationId || !user) {
      setMessages([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getMessages(conversationId)
      setMessages(data)

      // Mark as read
      await markConversationRead(conversationId)
    } catch (err: any) {
      console.error('Error loading messages:', err)
      setError(err.message || 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [conversationId, user])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Subscribe to new messages in realtime
  useEffect(() => {
    if (!conversationId || !user) return

    // Cleanup previous subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }

    const sub = subscribeToConversationMessages(conversationId, (message: Message) => {
      setMessages(prev => [...prev, message])
      // Mark as read when new message arrives
      markConversationRead(conversationId).catch(console.error)
    })

    subscriptionRef.current = sub

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [conversationId, user])

  const sendTextMessage = async (content: string): Promise<boolean> => {
    if (!conversationId || !content.trim()) return false

    try {
      setSending(true)
      await sendMessageApi(conversationId, content.trim(), 'text')
      return true
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError(err.message || 'Failed to send message')
      return false
    } finally {
      setSending(false)
    }
  }

  const sendImageMessage = async (file: File): Promise<boolean> => {
    if (!conversationId) return false

    try {
      setSending(true)
      const imageUrl = await uploadImage(file)
      await sendMessageApi(conversationId, '📷 Photo', 'image', imageUrl)
      return true
    } catch (err: any) {
      console.error('Error sending image:', err)
      setError(err.message || 'Failed to send image')
      return false
    } finally {
      setSending(false)
    }
  }

  return {
    messages,
    loading,
    error,
    sending,
    sendTextMessage,
    sendImageMessage,
    refreshMessages: loadMessages,
  }
}

