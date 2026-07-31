import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useChat } from '../../hooks/useChat'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../Avatar'
import NewChatModal from './NewChatModal'
import type { Conversation } from '../../types'

interface ConfirmDialogState {
  show: boolean
  conv: Conversation | null
  action: 'hide' | 'unhide'
}

const ChatList = () => {
  const { user, profile } = useAuth()
  const { conversations, loading, totalUnread, startConversation, hideConversation, unhideConversation } = useChat()
  const navigate = useNavigate()
  const location = useLocation()
  const [showNewChat, setShowNewChat] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({ show: false, conv: null, action: 'hide' })

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
    <div className="h-full flex flex-col bg-white/90 backdrop-blur-xl border-r border-slate-200/80">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500">
            <Avatar
              src={profile?.avatar_url}
              name={profile?.full_name || profile?.username}
              size="w-9 h-9"
            />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight font-heading">{user?.email?.split('@')[0]}</h1>
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 font-heading">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Online
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowNewChat(true)}
          className="p-2 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm"
          title="New message"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-2xl mx-auto mb-3">
              💬
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1 font-heading">No messages yet</h3>
            <p className="text-xs text-slate-500 mb-4 font-medium font-body">
              Start a real-time conversation with anyone on the network
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-full shadow-md hover:scale-105 transition-all font-heading"
            >
              Send a message
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => {
              const isActive = activeConversationId === conv.id
              return (
                <div
                  key={conv.id}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-indigo-50/90 text-indigo-900 border border-indigo-100 shadow-sm'
                      : 'hover:bg-slate-100/70 text-slate-700'
                  }`}
                >
                  <div className="shrink-0 p-0.5 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400">
                    <Avatar
                      src={conv.other_participant?.avatar_url}
                      name={conv.other_participant?.full_name || conv.other_participant?.username}
                      size="w-11 h-11"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 truncate font-heading">
                        {conv.other_participant?.full_name || conv.other_participant?.username || 'Unknown User'}
                      </p>
                      {conv.last_message && (
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0 font-body">
                          {formatTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-slate-500 truncate font-normal font-body">
                        {getLastMessagePreview(conv)}
                      </p>
                      {(conv.unread_count || 0) > 0 && (
                        <span className="shrink-0 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-md shadow-rose-500/20 font-heading">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Hide/Unhide button */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDialog({
                          show: true,
                          conv,
                          action: conv.hidden_at ? 'unhide' : 'hide',
                        })
                      }}
                      className="p-1.5 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={conv.hidden_at ? 'Unhide conversation' : 'Hide conversation'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {conv.hidden_at ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
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

      {/* Confirmation Dialog */}
      {confirmDialog.show && confirmDialog.conv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full mx-4 overflow-hidden transform transition-all">
            <div className="p-6 text-center">
              <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                confirmDialog.action === 'hide'
                  ? 'bg-rose-100 text-rose-500'
                  : 'bg-emerald-100 text-emerald-500'
              }`}>
                {confirmDialog.action === 'hide' ? (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1.5 font-heading">
                {confirmDialog.action === 'hide' ? 'Hide conversation?' : 'Unhide conversation?'}
              </h3>

              <p className="text-xs text-slate-500 mb-6 leading-relaxed font-body">
                {confirmDialog.action === 'hide'
                  ? `This will hide the conversation with ${confirmDialog.conv.other_participant?.full_name || confirmDialog.conv.other_participant?.username || 'this user'} from your main inbox.`
                  : `This will restore the conversation with ${confirmDialog.conv.other_participant?.full_name || confirmDialog.conv.other_participant?.username || 'this user'} back to your main inbox.`
                }
              </p>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setConfirmDialog({ show: false, conv: null, action: 'hide' })}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const c = confirmDialog.conv
                    setConfirmDialog({ show: false, conv: null, action: 'hide' })
                    if (c) {
                      try {
                        if (confirmDialog.action === 'hide') {
                          await hideConversation(c.id)
                        } else {
                          await unhideConversation(c.id)
                        }
                      } catch {
                        // Error handled in useChat
                      }
                    }
                  }}
                  className={`flex-1 py-2.5 text-white text-xs font-bold rounded-2xl transition-all ${
                    confirmDialog.action === 'hide'
                      ? 'bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20'
                  }`}
                >
                  {confirmDialog.action === 'hide' ? 'Hide' : 'Unhide'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatList

