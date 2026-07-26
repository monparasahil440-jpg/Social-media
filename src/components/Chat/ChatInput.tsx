import { useState, useRef } from 'react'

interface ChatInputProps {
  onSendText: (content: string) => Promise<boolean>
  onSendImage: (file: File) => Promise<boolean>
  onStartAudioCall: () => void
  onStartVideoCall: () => void
  sending: boolean
}

const ChatInput = ({ onSendText, onSendImage, onStartAudioCall, onStartVideoCall, sending }: ChatInputProps) => {
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCallMenu, setShowCallMenu] = useState(false)

  const handleSend = async () => {
    if (!message.trim() || sending) return
    const success = await onSendText(message)
    if (success) {
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await onSendImage(file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="px-4 py-3 border-t border-gray-200 bg-white">
      <div className="flex items-end gap-2">
        {/* Attachment Button */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            title="Attach image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Call buttons */}
          <div className="relative">
            <button
              onClick={() => setShowCallMenu(!showCallMenu)}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              title="Start a call"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>

            {showCallMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowCallMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 z-20 py-1.5 min-w-[140px]">
                  <button
                    onClick={() => {
                      setShowCallMenu(false)
                      onStartAudioCall()
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Audio Call
                  </button>
                  <button
                    onClick={() => {
                      setShowCallMenu(false)
                      onStartVideoCall()
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Video Call
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            style={{ minHeight: '40px', maxHeight: '120px' }}
            disabled={sending}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="p-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-700 hover:to-purple-700 transition-all shrink-0"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default ChatInput

