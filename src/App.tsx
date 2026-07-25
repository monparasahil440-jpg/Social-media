import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Navbar from './components/Navbar'
import LoadingSpinner from './components/LoadingSpinner'
import Home from './pages/Home'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Profile from './pages/Profile'
import Explore from './pages/Explore'
import PostDetail from './pages/PostDetail'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    )
  }

  return (
      <HashRouter>      <div className="min-h-screen bg-gray-50">
        {user && <Navbar />}
        <main className={user ? 'pb-8' : ''}>
          <Routes>
            <Route path="/" element={user ? <Home /> : <Navigate to="/login" replace />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/signup" element={!user ? <SignUp /> : <Navigate to="/" replace />} />
            <Route path="/profile/:userId" element={user ? <Profile /> : <Navigate to="/login" replace />} />
            <Route path="/explore" element={user ? <Explore /> : <Navigate to="/login" replace />} />
            <Route path="/post/:postId" element={user ? <PostDetail /> : <Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

export default App

