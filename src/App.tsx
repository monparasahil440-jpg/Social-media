import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { CallProvider } from './contexts/CallProvider'
import { ToastProvider } from './contexts/ToastProvider'
import ToastContainer from './components/ToastContainer'
import GlobalCallOverlay from './components/GlobalCallOverlay'
import Navbar from './components/Navbar'
import LoadingSpinner from './components/LoadingSpinner'
import { ErrorBoundary } from './components/ErrorBoundary'
import Home from './pages/Home'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Profile from './pages/Profile'
import Explore from './pages/Explore'
import PostDetail from './pages/PostDetail'
import Chat from './pages/Chat'
import { requestNotificationPermission } from './utils/notification'

function AppContent() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const isChatRoute = location.pathname.startsWith('/chat')

  // Request notification permission when user is logged in
  useEffect(() => {
    if (user) {
      requestNotificationPermission()
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-x-hidden text-slate-900 font-sans">
      {/* Background ambient decorative glows */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-10 w-[450px] h-[450px] bg-purple-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-10 w-[400px] h-[400px] bg-pink-200/25 rounded-full blur-3xl pointer-events-none -z-10" />

      {user && <Navbar />}
      <main className={!isChatRoute ? 'pb-[100px] md:pb-6' : ''}>
        <Routes>
          <Route path="/" element={user ? <Home /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/signup" element={!user ? <SignUp /> : <Navigate to="/" replace />} />
          <Route path="/profile/:userId" element={user ? <Profile /> : <Navigate to="/login" replace />} />
          <Route path="/explore" element={user ? <Explore /> : <Navigate to="/login" replace />} />
          <Route path="/post/:postId" element={user ? <PostDetail /> : <Navigate to="/login" replace />} />
          <Route path="/chat" element={user ? <Chat /> : <Navigate to="/login" replace />} />
          <Route path="/chat/:conversationId" element={user ? <Chat /> : <Navigate to="/login" replace />} />
        </Routes>
      </main>
      {/* Global Toast Notifications */}
      <ToastContainer />
      {/* Global Call Overlay (renders above everything via portal) */}
      <GlobalCallOverlay />
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
        <ToastProvider>
          <CallProvider>
            <AppContent />
          </CallProvider>
        </ToastProvider>
      </ErrorBoundary>
    </HashRouter>
  )
}

export default App

