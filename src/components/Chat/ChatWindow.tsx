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
    <div className="h-full flex flex-col bg-white">
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
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/50 relative">
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

        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            className="fixed right-[50px] bottom-[150px] p-2 rounded-full bg-[#ffffff7d] backdrop-blur-sm shadow-lg hover:bg-white transition-all z-10 hover:scale-105"
            aria-label="Scroll to bottom"
          >
            <svg className="w-6 h-6 text-gray-600 hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {/* Scroll to top button */}
        {!showScrollToBottom && lastScrollHeight > 200 && (
          <button
            onClick={scrollToTop}
            className="fixed right-[50px] bottom-[180px] p-2 rounded-full bg-[#ffffff7d] backdrop-blur-sm shadow-lg hover:bg-white transition-all z-10 hover:scale-105"
            aria-label="Scroll to top"
          >
            <svg className="w-6 h-6 text-gray-600 hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
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

