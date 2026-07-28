import { useState } from 'react'

interface RatingDialogProps {
  onSubmit: (rating: number, feedback?: string) => void
  onSkip: () => void
  onClose: () => void
}

export default function RatingDialog({ onSubmit, onSkip, onClose }: RatingDialogProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const labels = ['Poor', 'Fair', 'Good', 'Great', 'Excellent']

  const handleSubmit = () => {
    if (rating === 0) return
    setSubmitted(true)
    onSubmit(rating, feedback.trim() || undefined)
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 mx-4 max-w-sm w-full text-center animate-fade-in">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Thanks for your feedback!</h3>
          <p className="text-sm text-gray-500 mb-6">Your rating helps improve call quality.</p>
          <button onClick={onClose} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 mx-0 sm:mx-4 max-w-sm w-full animate-slide-up">
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">How was your call?</h3>
          <p className="text-sm text-gray-500">Rate your experience</p>
        </div>
        <div className="flex justify-center gap-3 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(star)} className="transition-all duration-150 hover:scale-110">
              <svg className={`w-10 h-10 transition-colors ${star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
        </div>
        {rating > 0 && <p className="text-center text-sm font-medium text-gray-700 mb-4">{labels[rating - 1]}</p>}
        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional feedback..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 resize-none outline-none focus:ring-2 focus:ring-indigo-500 mb-4" rows={3} maxLength={500} />
        <button onClick={handleSubmit} disabled={rating === 0}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] mb-2">Submit</button>
        <button onClick={onSkip} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">Skip</button>
      </div>
    </div>
  )
}

