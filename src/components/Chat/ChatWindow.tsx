import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConversationMessages } from '../../hooks/useChat'
import { useCall } from '../../hooks/useCall'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../Avatar'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import CallUI from '../Call/CallUI'
import LoadingSpinner from '../LoadingSpinner'
import type { Conversation } from '../../types'

interface ChatWindowProps {
  conversation: Conversation
  onBack?: () => void
}

const ChatWindow = ({ conversation, onBack }: ChatWindowProps) => {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const {
    messages,
    loading,
    sending,
    sendTextMessage,
    sendImageMessage,
  } = useConversationMessages(conversation.id)

  const {
    callState,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCamera,
    switchCamera,
  } = useCall()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const otherUser = conversation.other_participant
  const isInCall = callState.status !== 'idle' && callState.status !== 'ended'

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleStartAudioCall = () => {
    if (otherUser && conversation.id) {
      startCall(conversation.id, otherUser.id, otherUser, 'audio')
    }
  }

  const handleStartVideoCall = () => {
    if (otherUser && conversation.id) {
      startCall(conversation.id, otherUser.id, otherUser, 'video')
    }
  }

  const handleAvatarClick = () => {
    if (otherUser) {
      navigate(`/profile/${otherUser.id}`)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Call UI Overlay */}
      {isInCall && (
        <CallUI
          callState={callState}
          onEndCall={endCall}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onSwitchCamera={switchCamera}
        />
      )}

      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3 bg-white shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors md:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <button onClick={handleAvatarClick} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar
            src={otherUser?.avatar_url}
            name={otherUser?.full_name || otherUser?.username}
            size="w-10 h-10"
          />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">
              {otherUser?.full_name || otherUser?.username || 'Unknown User'}
            </p>
            <p className="text-xs text-gray-500">@{otherUser?.username || 'unknown'}</p>
          </div>
        </button>

        {/* Call buttons in header */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleStartAudioCall}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            title="Audio call"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button
            onClick={handleStartVideoCall}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            title="Video call"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="md" message="Loading messages..." />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">👋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No messages yet</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Say hello to {otherUser?.full_name || otherUser?.username || 'this user'}!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <ChatInput
        onSendText={sendTextMessage}
        onSendImage={sendImageMessage}
        onStartAudioCall={handleStartAudioCall}
        onStartVideoCall={handleStartVideoCall}
        sending={sending}
      />
    </div>
  )
}

export default ChatWindow

