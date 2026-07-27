import { useAuth } from '../../hooks/useAuth'
import Avatar from '../Avatar'
import type { Message } from '../../types'

interface MessageBubbleProps {
  message: Message
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const { user } = useAuth()
  const isOwn = message.sender_id === user?.id

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''} items-end`}>
      {/* Avatar (only for other user) */}
      {!isOwn && (
        <div className="shrink-0 mb-1">
          <Avatar
            src={message.sender?.avatar_url}
            name={message.sender?.full_name || message.sender?.username}
            size="w-7 h-7"
          />
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Call message */}
        {message.message_type === 'call' && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl ${
            isOwn
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}>
            {/* Call icon - phone for audio, camera for video */}
            {message.call_type === 'video' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            )}
            <div>
              <p className="text-sm font-medium">
                {message.content}
              </p>
              {message.call_duration && message.call_duration > 0 && (
                <p className="text-xs opacity-75">
                  {Math.floor(message.call_duration / 60)}:{(message.call_duration % 60).toString().padStart(2, '0')}
                </p>
              )}
              {/* For missed calls, add a subtle indicator */}
              {(!message.call_duration || message.call_duration === 0) && message.content?.includes('Missed') && (
                <p className="text-xs opacity-60">No answer</p>
              )}
            </div>
          </div>
        )}

        {/* Image message */}
        {message.message_type === 'image' && message.image_url && (
          <div className={`rounded-2xl overflow-hidden ${
            isOwn ? 'rounded-br-md' : 'rounded-bl-md'
          }`}>
            <img
              src={message.image_url}
              alt="Shared image"
              className="max-w-[280px] max-h-[300px] object-cover rounded-2xl"
            />
            {message.content && message.content !== '📷 Photo' && (
              <p className={`text-sm mt-1 px-2 ${isOwn ? 'text-indigo-100' : 'text-gray-600'}`}>
                {message.content}
              </p>
            )}
          </div>
        )}

        {/* Text message */}
        {message.message_type === 'text' && (
          <div className={`px-4 py-2.5 rounded-2xl ${
            isOwn
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-800 rounded-bl-md'
          }`}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {/* Time */}
        <p className={`text-[10px] text-gray-400 mt-1 ${isOwn ? 'text-right' : 'text-left'} px-1`}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}

export default MessageBubble

