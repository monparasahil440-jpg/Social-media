import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getUnreadConversationCount } from '../lib/supabaseClient'
import NotificationBell from './NotificationBell'
import Avatar from './Avatar'

const Navbar = () => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    if (user) {
      loadUnreadCount()
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

  const navLinks = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/explore', label: 'Explore', icon: '🔍' },
    { path: '/chat', label: 'Messages', icon: '💬', badge: unreadMessages },
    { path: `/profile/${user?.id}`, label: 'Profile', icon: '👤' },
  ]

  const isActive = (path: string) => {
    if (path === '/chat') return location.pathname.startsWith('/chat')
    return location.pathname === path
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
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
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </Link>
            ))}

            {/* Notification Bell */}
            <div className="ml-2">
              <NotificationBell />
            </div>

            <div className="ml-2 pl-4 border-l border-gray-200 flex items-center gap-3">
            <div className="flex items-center gap-2">
                <Link to={`/profile/${user?.id}`}>
                  <Avatar
                    src={profile?.avatar_url}
                    name={profile?.full_name || profile?.username || user?.email}
                    size="w-8 h-8"
                  />
                </Link>
                <span className="text-sm text-gray-700 max-w-[120px] truncate">
                  {user?.email}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {/* Notification Bell (mobile) */}
            <NotificationBell />

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 pt-3 mt-3">
              <div className="flex items-center gap-3 px-4 py-2">
                <Link to={`/profile/${user?.id}`} onClick={() => setMobileMenuOpen(false)}>
                  <Avatar
                    src={profile?.avatar_url}
                    name={profile?.full_name || profile?.username || user?.email}
                    size="w-8 h-8"
                  />
                </Link>
                <span className="text-sm text-gray-700 truncate">{user?.email}</span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleSignOut()
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar

