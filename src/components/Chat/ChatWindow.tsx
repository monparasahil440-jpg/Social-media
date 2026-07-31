import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConversationMessages } from '../../hooks/useChat'
import { useCall } from '../../contexts/CallProvider'
import Avatar from '../Avatar'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import LoadingSpinner from '../LoadingSpinner'
import type { Conversation } from '../../types'

interface ChatWindowProps {
  conversation: Conversation
  onBack?: () => void
}

const ChatWindow = ({ conversation, onBack }: ChatWindowProps) => {
  const navigate = useNavigate()
  const {
    messages,
    loading,
    sending,
    sendTextMessage,
    sendImageMessage,
  } = useConversationMessages(conversation.id)

  const { startCall } = useCall()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [lastScrollHeight, setLastScrollHeight] = useState(0)

  const otherUser = conversation.other_participant

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [])

  // Scroll to bottom when loading completes or conversation changes
  useEffect(() => {
    const doScroll = () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
      }
    }

    if (!loading) {
      doScroll()
      // Try multiple times with delays
      setTimeout(doScroll, 50)
      setTimeout(doScroll, 150)
    }
  }, [loading, conversation.id])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      scrollToBottom()
    }
  }, [messages, loading, scrollToBottom])

  // Handle scroll events to show/hide scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const scrollTop = containerRef.current.scrollTop
    const scrollHeight = containerRef.current.scrollHeight
    const clientHeight = containerRef.current.clientHeight

    // Show scroll-to-bottom button if user is scrolled up more than 100px from bottom
    if (scrollHeight - scrollTop - clientHeight > 100) {
      setShowScrollToBottom(true)
    } else {
      setShowScrollToBottom(false)
    }

    setLastScrollHeight(scrollHeight)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }, [handleScroll])

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }

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
    <div className="h-full flex flex-col bg-slate-50/60 relative">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-slate-200/80 flex items-center gap-3 bg-white/90 backdrop-blur-md shrink-0 shadow-sm z-10">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 -ml-1 rounded-2xl hover:bg-slate-100 text-slate-500 transition-colors md:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <button onClick={handleAvatarClick} className="flex items-center gap-3 flex-1 min-w-0 group text-left">
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 group-hover:scale-105 transition-transform">
            <Avatar
              src={otherUser?.avatar_url}
              name={otherUser?.full_name || otherUser?.username}
              size="w-10 h-10"
            />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate font-heading">
              {otherUser?.full_name || otherUser?.username || 'Unknown User'}
            </p>
            <p className="text-xs font-medium text-slate-400 font-body">@{otherUser?.username || 'unknown'}</p>
          </div>
        </button>

        {/* Call action pill buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartAudioCall}
            className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105 active:scale-95 transition-all shadow-sm"
            title="Start Audio Call"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button
            onClick={handleStartVideoCall}
            className="p-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:scale-105 active:scale-95 transition-all shadow-md shadow-indigo-500/20"
            title="Start Video Call"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="md" message="Securing conversation..." />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-3xl mb-3 shadow-inner">
              👋
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1 font-heading">Start a conversation</h3>
            <p className="text-xs font-medium text-slate-400 max-w-xs leading-relaxed font-body">
              Send a message or start an audio/video call with {otherUser?.full_name || otherUser?.username || 'this user'}.
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

        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            className="fixed right-6 bottom-20 p-3 rounded-full bg-white/90 backdrop-blur-md shadow-xl border border-slate-200 text-indigo-600 hover:scale-110 active:scale-95 transition-all z-20"
            aria-label="Scroll to bottom"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
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

