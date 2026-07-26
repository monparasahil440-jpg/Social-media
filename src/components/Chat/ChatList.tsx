import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useChat } from '../../hooks/useChat'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../Avatar'
import NewChatModal from './NewChatModal'
import type { Conversation } from '../../types'

const ChatList = () => {
  const { user, profile } = useAuth()
  const { conversations, loading, totalUnread, startConversation } = useChat()
  const navigate = useNavigate()
  const location = useLocation()
  const [showNewChat, setShowNewChat] = useState(false)

  const activeConversationId = location.pathname.split('/chat/')[1]

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getLastMessagePreview = (conv: Conversation): string => {
    if (!conv.last_message) return 'No messages yet'
    const msg = conv.last_message
    if (msg.message_type === 'image') return '📷 Photo'
    if (msg.message_type === 'call') {
      const duration = msg.call_duration ? `${Math.floor(msg.call_duration / 60)}:${String(msg.call_duration % 60).padStart(2, '0')}` : ''
      return msg.call_type === 'video' ? `📹 Video call${duration ? ` (${duration})` : ''}` : `📞 Audio call${duration ? ` (${duration})` : ''}`
    }
    return msg.content
  }

  const handleStartConversation = async (userId: string) => {
    const conv = await startConversation(userId)
    if (conv) {
      navigate(`/chat/${conv.id}`, { state: { newConversation: conv } })
      setShowNewChat(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || profile?.username}
            size="w-8 h-8"
          />
          <h1 className="text-lg font-bold text-gray-900">{user?.email?.split('@')[0]}</h1>
        </div>
        <button
          onClick={() => setShowNewChat(true)}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          title="New message"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No messages yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Start a conversation with someone
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              Send a message
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/chat/${conv.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                  activeConversationId === conv.id ? 'bg-indigo-50 hover:bg-indigo-50' : ''
                }`}
              >
                <div className="shrink-0">
                  <Avatar
                    src={conv.other_participant?.avatar_url}
                    name={conv.other_participant?.full_name || conv.other_participant?.username}
                    size="w-12 h-12"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {conv.other_participant?.full_name || conv.other_participant?.username || 'Unknown User'}
                    </p>
                    {conv.last_message && (
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatTime(conv.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-sm text-gray-500 truncate">
                      {getLastMessagePreview(conv)}
                    </p>
                    {(conv.unread_count || 0) > 0 && (
                      <span className="shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal
          onSelect={handleStartConversation}
          onClose={() => setShowNewChat(false)}
        />
      )}
    </div>
  )
}

export default ChatList

