 import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import ChatList from '../components/Chat/ChatList'
import ChatWindow from '../components/Chat/ChatWindow'
import { getUserConversations, getOtherParticipantInConversation } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Conversation } from '../types'

const Chat = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { conversationId } = useParams<{ conversationId?: string }>()
  const location = useLocation()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)

  // Check if there's a newConversation passed via navigation state
  const newConversationFromState = location.state?.newConversation as Conversation | undefined

  useEffect(() => {
    loadConversations()
  }, [])

  // Ensure the active conversation always has other_participant
  const ensureOtherParticipant = useCallback(async (conv: Conversation): Promise<Conversation> => {
    if (conv.other_participant) return conv
    if (!user || !conv.id) return conv

    try {
      const profile = await getOtherParticipantInConversation(conv.id, user.id)
      if (profile) {
        return { ...conv, other_participant: profile }
      }
    } catch (err) {
      console.warn('[Chat] Could not fetch other participant for conv', conv.id, err)
    }
    return conv
  }, [user])

  useEffect(() => {
    const resolveActiveConversation = async () => {
      if (conversationId && conversations.length > 0) {
        const found = conversations.find(c => c.id === conversationId)
        if (found) {
          const enriched = await ensureOtherParticipant(found)
          setActiveConversation(enriched)
          return
        }
      } else if (newConversationFromState) {
        const enriched = await ensureOtherParticipant(newConversationFromState)
        setActiveConversation(enriched)
        return
      }
      setActiveConversation(null)
    }
    resolveActiveConversation()
  }, [conversationId, conversations, newConversationFromState, ensureOtherParticipant])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const data = await getUserConversations()
      setConversations(data)
    } catch (err) {
      console.error('Error loading conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectConversation = (conv: Conversation) => {
    navigate(`/chat/${conv.id}`)
  }

  const handleBack = () => {
    navigate('/chat')
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" message="Loading chats..." />
      </div>
    )
  }

  return (
<div className="h-[calc(100vh-4rem)] flex bg-white overflow-hidden">
      {/* Chat List - Desktop sidebar */}
      <div className={`w-full md:w-80 md:border-r md:border-gray-200 overflow-hidden ${
        conversationId ? 'hidden md:block' : 'block'
      }`}>
        <ChatList />
      </div>

      {/* Chat Window */}
      <div className={`flex-1 md:block min-h-0 ${
        conversationId ? 'block' : 'hidden md:block'
      }`}>
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            onBack={handleBack}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 bg-gray-50/30">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Your messages</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Select a conversation from the sidebar or start a new one
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Chat

