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
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''} items-end animate-fade-in`}>
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
      <div className={`max-w-[78%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Call message */}
        {message.message_type === 'call' && (
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-3xl border shadow-sm ${
            isOwn
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500/30'
              : 'bg-white text-slate-800 border-slate-200/80'
          }`}>
            {message.call_type === 'video' ? (
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            )}
            <div>
              <p className="text-xs font-bold font-heading">{message.content}</p>
              {message.call_duration && message.call_duration > 0 && (
                <p className="text-[10px] opacity-75 font-semibold font-body">
                  {Math.floor(message.call_duration / 60)}:{(message.call_duration % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Image message */}
        {message.message_type === 'image' && message.image_url && (
          <div className={`rounded-3xl overflow-hidden shadow-md ${
            isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'
          }`}>
            <img
              src={message.image_url}
              alt="Shared content"
              className="max-w-[280px] max-h-[300px] object-cover rounded-3xl"
            />
            {message.content && message.content !== '📷 Photo' && (
              <p className={`text-xs mt-1.5 px-3 py-1 font-medium ${isOwn ? 'text-indigo-100' : 'text-slate-600'}`}>
                {message.content}
              </p>
            )}
          </div>
        )}

        {/* Text message */}
        {message.message_type === 'text' && (
          <div className={`px-4 py-2.5 rounded-3xl text-xs sm:text-sm font-medium leading-relaxed font-body ${
            isOwn
              ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white rounded-br-sm shadow-md shadow-indigo-500/15'
              : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-sm shadow-sm'
          }`}>
            {message.image_url && (
              <img
                src={message.image_url}
                alt="Story thumbnail"
                className="w-full max-h-36 object-cover rounded-2xl mb-2 border border-white/20"
              />
            )}
            {message.content.includes('Replied to') || message.content.includes('Reacted') ? (
              <div className="space-y-1">
                <div className={`text-[11px] font-bold font-heading px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                  isOwn ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                }`}>
                  <span>{message.content.split('\n\n')[0]}</span>
                </div>
                {message.content.includes('\n\n') && (
                  <p className="whitespace-pre-wrap pt-0.5">{message.content.split('\n\n').slice(1).join('\n\n')}</p>
                )}
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        )}

        {/* Time timestamp */}
        <p className={`text-[10px] font-semibold text-slate-400 mt-1 ${isOwn ? 'text-right' : 'text-left'} px-1.5 font-body`}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}

export default MessageBubble

