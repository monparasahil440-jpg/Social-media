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
      {/* Desktop Floating Glass Navbar */}
      <nav className="hidden md:block sticky top-0 z-50 px-4 py-3 glass-nav transition-all">
        <div className="max-w-6xl mx-auto flex justify-between items-center h-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300">
              <span className="text-xl">✨</span>
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-heading">
              SocialMedia
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="flex items-center gap-3">
            {navLinks.map((link) => {
              if (link.isCreatePost) {
                return (
                  <button
                    key="create-post-desktop"
                    onClick={() => setShowCreatePostModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/35 hover:scale-105 active:scale-95 transition-all duration-200"
                    title={link.label}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create</span>
                  </button>
                )
              }
              if (!link.path) return null
              const active = isActive(link.path)
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative p-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center ${
                    active
                      ? 'bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-500/10 font-bold'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-indigo-600'
                  }`}
                  title={link.label}
                >
                  {link.iconOutline}
                  {link.badge && link.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-md shadow-rose-500/30 ring-2 ring-white animate-pulse">
                      {link.badge > 99 ? '99+' : link.badge}
                    </span>
                  ) : null}
                </Link>
              )
            })}

            <div className="w-px h-6 bg-slate-200 mx-1" />

            {/* Notification Bell */}
            <NotificationBell />

            {/* Profile Avatar */}
            <Link to={`/profile/${user?.id}`} className="scale-105 hover:scale-110 transition-transform duration-200 ml-1 shrink-0 flex items-center justify-center">
              <div className="w-[36px] h-[36px] p-[2px] rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden">
                  <Avatar
                    src={profile?.avatar_url}
                    name={profile?.full_name || profile?.username || user?.email}
                    size="w-full h-full"
                  />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Create Post Modal */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[90vh] overflow-y-auto transform transition-all">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="text-xl">📝</span> Create New Post
              </h2>
              <button
                onClick={() => setShowCreatePostModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <CreatePost onPostCreated={handlePostCreated} />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Dock Navigation */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 glass-dock rounded-3xl z-50 shadow-2xl">
        <div className="flex justify-around items-center h-16 px-2">
          {navLinks.map((link) => {
            if (link.isCreatePost) {
              return (
                <button
                  key="create-post"
                  onClick={() => setShowCreatePostModal(true)}
                  className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                  title={link.label}
                >
                  {link.iconOutline}
                </button>
              )
            }
            if (!link.path) return null
            const active = isActive(link.path)
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative flex items-center justify-center flex-1 py-2 rounded-2xl transition-all ${
                  active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`}
                title={link.label}
              >
                {link.iconOutline}
                {link.badge && link.badge > 0 ? (
                  <span className="absolute top-1 right-3 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {link.badge > 99 ? '99+' : link.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export default Navbar

