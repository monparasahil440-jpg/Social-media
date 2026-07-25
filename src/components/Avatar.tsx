import { useState } from 'react'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: string
  className?: string
}

const Avatar = ({ src, name, size = 'w-10 h-10', className = '' }: AvatarProps) => {
  const [imgError, setImgError] = useState(false)

  // If we have a valid src and it hasn't errored, render the image
  if (src && !imgError) {
    return (
      <div className={`${size} rounded-full overflow-hidden shrink-0 ${className}`}>
        <img
          src={src}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  // Fallback: gradient circle with initial letter
  const initial = (name || 'U').charAt(0).toUpperCase()

  return (
    <div
      className={`${size} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm shrink-0 ${className}`}
    >
      {initial}
    </div>
  )
}

export default Avatar

