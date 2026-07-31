import { useState, useRef } from 'react'
import { createPost, uploadImage } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../contexts/ToastProvider'
import Avatar from './Avatar'
import type { Post } from '../types'

interface CreatePostProps {
  onPostCreated?: (post: Post) => void
}

const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    setError('')
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && !imageFile) return

    setIsUploading(true)
    setError('')

    try {
      let imageUrl: string | undefined

      if (imageFile) {
        imageUrl = await uploadImage(imageFile, 'posts')
      }

      const newPost = await createPost(content.trim(), imageUrl)
      setContent('')
      removeImage()
      showToast('Post published successfully! ✨', 'success')
      onPostCreated?.(newPost)
    } catch (err: any) {
      console.error('Error creating post:', err)
      setError(err.message || 'Failed to create post')
    } finally {
      setIsUploading(false)
    }
  }

  const charCount = content.length
  const maxChars = 1000

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-card p-4 sm:p-5 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3 sm:gap-4">
          <div className="w-[44px] h-[44px] p-[2px] rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 overflow-hidden">
            <Avatar
              src={profile?.avatar_url}
              name={profile?.full_name || profile?.username || user?.email}
              size="w-full h-full"
            />
          </div>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= maxChars) {
                  setContent(e.target.value)
                }
              }}
              placeholder="What's happening? Share thoughts, photos or updates..."
              className="w-full resize-none border-0 text-slate-800 placeholder-slate-400 bg-transparent text-sm sm:text-base min-h-[90px] outline-none focus:outline-none"
              rows={3}
              maxLength={maxChars}
            />

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative mt-3 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60 shadow-inner group">
                <img
                  src={imagePreview}
                  alt="Upload Preview"
                  className="w-full max-h-56 object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2.5 right-2.5 p-2 bg-slate-900/70 backdrop-blur-md rounded-full text-white hover:bg-slate-900 transition-colors shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && <p className="mt-2 text-xs font-semibold text-rose-500">{error}</p>}

            {/* Action Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Add Photo</span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium ${
                    charCount > maxChars * 0.9 ? 'text-amber-500 font-bold' : 'text-slate-400'
                  }`}
                >
                  {charCount}/{maxChars}
                </span>

                <button
                  type="submit"
                  disabled={isUploading || (!content.trim() && !imageFile)}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-full shadow-md shadow-indigo-500/20 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isUploading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Posting...</span>
                    </div>
                  ) : (
                    'Post'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default CreatePost
