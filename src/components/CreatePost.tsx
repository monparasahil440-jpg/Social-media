import { useState, useRef } from 'react'
import { createPost, uploadImage } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import Avatar from './Avatar'
import { escapeHTML } from '../lib/sanitize'

interface CreatePostProps {
  onPostCreated?: (post: any) => void
}

const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const { user, profile } = useAuth()
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setError('')
    }
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
        imageUrl = await uploadImage(imageFile)
      }

      const newPost = await createPost(content.trim(), imageUrl)
      setContent('')
      removeImage()
      onPostCreated?.(newPost)
    } catch (err: any) {
      setError(err.message || 'Failed to create post')
    } finally {
      setIsUploading(false)
    }
  }

  const charCount = content.length
  const maxChars = 1000

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || profile?.username || user?.email}
            size="w-10 h-10"
          />
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= maxChars) {
                  setContent(e.target.value)
                }
              }}
              placeholder="What's on your mind?"
              className="w-full resize-none border-0 focus:ring-0 text-gray-800 placeholder-gray-400 bg-transparent text-sm min-h-[80px] outline-none"
              rows={3}
              maxLength={maxChars}
            />

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative mt-2 rounded-xl overflow-hidden bg-gray-50">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  aria-label="Add image to post"
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-indigo-600 transition-colors disabled:opacity-50"
                  title="Add image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <span className={`text-xs ${charCount > maxChars * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
                  {charCount}/{maxChars}
                </span>
              </div>

              <button
                type="submit"
                disabled={isUploading || (!content.trim() && !imageFile)}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post'
                )}
              </button>
            </div>

            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

export default CreatePost

