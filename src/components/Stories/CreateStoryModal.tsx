import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createStory, uploadImage } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../contexts/ToastProvider'
import Avatar from '../Avatar'
import type { Story } from '../../types'

interface CreateStoryModalProps {
  onClose: () => void
  onStoryCreated: (story: Story) => void
}

const GRADIENT_OPTIONS = [
  { id: 'from-indigo-600 to-purple-600', name: 'Indigo Purple' },
  { id: 'from-purple-600 via-pink-600 to-rose-500', name: 'Sunset Pink' },
  { id: 'from-emerald-500 to-teal-700', name: 'Emerald Teal' },
  { id: 'from-rose-500 to-amber-500', name: 'Warm Amber' },
  { id: 'from-slate-900 via-purple-950 to-indigo-900', name: 'Midnight' },
]

const CreateStoryModal = ({ onClose, onStoryCreated }: CreateStoryModalProps) => {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<'text' | 'photo'>('photo')
  const [caption, setCaption] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('from-indigo-600 to-purple-600')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error')
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (activeTab === 'photo' && !imageFile) {
      showToast('Please select a photo for your story', 'error')
      return
    }
    if (activeTab === 'text' && !caption.trim()) {
      showToast('Please enter text for your status', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      let mediaUrl: string | undefined
      if (activeTab === 'photo' && imageFile) {
        mediaUrl = await uploadImage(imageFile, 'stories')
      }

      const newStory = await createStory(caption.trim(), mediaUrl, backgroundColor)
      showToast('Story published! 🌟', 'success')
      onStoryCreated(newStory)
      onClose()
    } catch (err: any) {
      console.error('Error creating story:', err)
      showToast(err.message || 'Failed to post story', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] transform transition-all">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
            <span>✨</span> Add Status / Story
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('photo')}
            className={`flex-1 py-3 text-xs font-bold font-heading transition-all ${
              activeTab === 'photo'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📷 Photo Story
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-3 text-xs font-bold font-heading transition-all ${
              activeTab === 'text'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🎨 Text Status
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Live Card Preview */}
          <div className="relative aspect-[9/16] max-h-[300px] w-full mx-auto rounded-3xl overflow-hidden shadow-xl border border-slate-200 flex flex-col justify-between p-4 bg-slate-900">
            {activeTab === 'photo' ? (
              imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Story preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/70 pointer-events-none" />
                </>
              ) : (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-300 gap-2 p-4 text-center">
                  <span className="text-4xl">📸</span>
                  <p className="text-xs font-medium font-body text-slate-300">Select a photo to preview your story</p>
                </div>
              )
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${backgroundColor} flex items-center justify-center p-6 text-center`} />
            )}

            {/* Preview Header */}
            <div className="relative z-10 flex items-center gap-2">
              <Avatar
                src={profile?.avatar_url}
                name={profile?.full_name || profile?.username || user?.email}
                size="w-8 h-8"
              />
              <span className="text-xs font-bold text-white drop-shadow-md font-heading">
                {profile?.full_name || profile?.username || 'Your Story'}
              </span>
            </div>

            {/* Preview Text / Caption */}
            <div className="relative z-10 text-center">
              {caption && (
                <p className="text-xs sm:text-sm font-bold text-white leading-relaxed drop-shadow-lg px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-xl font-heading inline-block max-w-full break-words">
                  {caption}
                </p>
              )}
            </div>
          </div>

          {/* Controls based on active tab */}
          {activeTab === 'photo' ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 font-heading"
              >
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {imageFile ? 'Change Photo' : 'Select Photo'}
              </button>

              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption to your photo…"
                maxLength={200}
                className="w-full px-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-body"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Type your status message…"
                rows={3}
                maxLength={250}
                className="w-full px-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none font-body"
              />

              {/* Background Color Picker */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-heading">
                  Background Color
                </p>
                <div className="flex gap-2">
                  {GRADIENT_OPTIONS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setBackgroundColor(g.id)}
                      title={g.name}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${g.id} transition-transform ${
                        backgroundColor === g.id ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-500/25 hover:scale-[1.01] active:scale-95 disabled:opacity-50 transition-all font-heading"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Posting Story...</span>
              </div>
            ) : (
              'Share Story'
            )}
          </button>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default CreateStoryModal
