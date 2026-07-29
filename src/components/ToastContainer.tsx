/**
 * ToastContainer - Animated toast notification display.
 * Renders at the top-right of the screen with slide-in/fade animations.
 * Uses framer-motion for smooth enter/exit animations.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useToast } from '../contexts/ToastProvider'
import type { ToastType } from '../contexts/ToastProvider'

const iconMap: Record<ToastType, { icon: string; bg: string; border: string; text: string }> = {
  success: {
    icon: '✓',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
  },
  error: {
    icon: '✕',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
  },
  info: {
    icon: 'ℹ',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
  },
  warning: {
    icon: '⚠',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
  },
}

const ToastContainer = () => {
  const { toasts, dismissToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const style = iconMap[toast.type]
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${style.bg} ${style.border} min-w-[300px] max-w-[420px] cursor-pointer`}
              onClick={() => dismissToast(toast.id)}
              title="Dismiss"
            >
              {/* Icon */}
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${style.text} bg-white/80`}
              >
                {style.icon}
              </span>

              {/* Message */}
              <p className={`text-sm font-medium ${style.text} flex-1 leading-snug`}>
                {toast.message}
              </p>

              {/* Dismiss indicator */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  dismissToast(toast.id)
                }}
                className={`shrink-0 opacity-60 hover:opacity-100 transition-opacity ${style.text}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default ToastContainer

