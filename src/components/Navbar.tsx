import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getUnreadConversationCount, subscribeToConversationList } from '../lib/supabaseClient'
import NotificationBell from './NotificationBell'
import Avatar from './Avatar'
import CreatePost from './CreatePost'
import type { Post } from '../types'
import type { ReactNode } from 'react'

interface NavLink {
  path?: string
  label: string
  icon: ReactNode
  iconOutline: ReactNode
  badge?: number
  isCreatePost?: boolean
}

const Navbar = () => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [showCreatePostModal, setShowCreatePostModal] = useState(false)

  useEffect(() => {
    if (user) {
      loadUnreadCount()

      // Subscribe to conversation updates for realtime unread count
      const sub = subscribeToConversationList(user.id, () => {
        loadUnreadCount()
      })

      return () => {
        sub.unsubscribe()
      }
    }
  }, [user])

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadConversationCount()
      setUnreadMessages(count)
    } catch {
      // Gracefully handle
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handlePostCreated = (newPost: Post) => {
    setShowCreatePostModal(false)
    // Navigate to home to see the new post
    navigate('/')
  }

  const navLinks: NavLink[] = [
    {
      path: '/',
      label: 'Home',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
      iconOutline: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      path: '/explore',
      label: 'Explore',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
      ),
      iconOutline: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      isCreatePost: true,
      label: 'Create Post',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 4v16m8-8H4" />
        </svg>
      ),
      iconOutline: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      path: '/chat',
      label: 'Messages',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      ),
      iconOutline: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
    {
      path: `/profile/${user?.id}`,
      label: 'Profile',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      ),
      iconOutline: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  const isActive = (path: string) => {
    if (path === '/chat') return location.pathname.startsWith('/chat')
    return location.pathname === path
  }

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <span className="text-2xl">📱</span>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  SocialMedia
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="flex items-center gap-8">
              {navLinks.map((link) => {
                  if (link.isCreatePost) {
                    return (
                      <button
                        key="create-post-desktop"
                        onClick={() => setShowCreatePostModal(true)}
                        className="relative flex items-center justify-center p-2.5 rounded-xl border-3 transition-all duration-300 ease-in-out hover:bg-[#e0f2fe] hover:border-[#6bc8e6] hover:shadow-lg hover:shadow-[#6bc8e6]/50"
                        style={{ borderWidth: '3px' }}
                        title={link.label}
                      >
                        {link.iconOutline}
                      </button>
                    )
                  }
                      if (!link.path) return null
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`relative flex items-center justify-center p-2.5 rounded-xl border-3 transition-all duration-300 ease-in-out hover:bg-[#e0f2fe] hover:border-[#6bc8e6] hover:shadow-lg hover:shadow-[#6bc8e6]/50 ${
                        isActive(link.path)
                          ? 'bg-[#e0f2fe] border-[#6bc8e6] shadow-lg shadow-[#6bc8e6]/50'
                          : 'bg-transparent border-transparent'
                      }`}
                      style={{ borderWidth: '3px' }}
                      title={link.label}
                    >
                      {link.iconOutline}

                      {link.badge && link.badge > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                          {link.badge > 99 ? '99+' : link.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}

              {/* Notification Bell */}
              <NotificationBell />

              {/* Profile Avatar */}
              <Link to={`/profile/${user?.id}`}>
                <Avatar
                  src={profile?.avatar_url}
                  name={profile?.full_name || profile?.username || user?.email}
                  size="w-7 h-7"
                />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Create Post Modal */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Create Post</h2>
              <button
                onClick={() => setShowCreatePostModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <CreatePost onPostCreated={handlePostCreated} />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {navLinks.map((link) => {
            if (link.isCreatePost) {
              return (
                <button
                  key="create-post"
                  onClick={() => setShowCreatePostModal(true)}
                  className="relative flex items-center justify-center flex-1 p-2.5 rounded-xl border-2 border-transparent hover:bg-[#e0f2fe] hover:border-[#6bc8e6] hover:shadow-lg hover:shadow-[#6bc8e6]/50 transition-all duration-300 ease-in-out"
                  title={link.label}
                >
                  {link.iconOutline}
                </button>
              )
            }
            if (!link.path) return null
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative flex items-center justify-center flex-1 p-2.5 rounded-xl border-3 transition-all duration-300 ease-in-out hover:bg-[#e0f2fe] hover:border-[#6bc8e6] hover:shadow-lg hover:shadow-[#6bc8e6]/50 ${
                  isActive(link.path)
                    ? 'bg-[#e0f2fe] border-[#6bc8e6] shadow-lg shadow-[#6bc8e6]/50'
                    : 'bg-transparent border-transparent'
                }`}
                style={{ borderWidth: '3px' }}
                title={link.label}
              >
                {link.iconOutline}
                {link.badge && link.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {link.badge > 99 ? '99+' : link.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export default Navbar

