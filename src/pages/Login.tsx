import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Login = () => {
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-slate-50">
      {/* Background ambient decorative light spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-400/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 flex items-center justify-center px-6 lg:px-12 relative z-10 py-10">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-2xl rounded-3xl p-8 border border-slate-200/80 shadow-2xl shadow-indigo-500/10">
          <div className="mb-8 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-500/30 mb-4 mx-auto sm:mx-0">
              ✨
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">Welcome back</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-500">Sign in to your account to continue</p>
          </div>
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm font-medium transition-all"
                placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm font-medium transition-all"
                placeholder="••••••••" />
            </div>
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 animate-fade-in">
                <p className="text-xs font-semibold text-rose-600">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading || !email || !password}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in...</>
              ) : 'Sign In to Account'}
            </button>
            <p className="text-center text-xs font-medium text-slate-500 pt-2">
              Don't have an account?{' '}
              <Link to="/signup" className="text-indigo-600 hover:underline font-extrabold">Create one now</Link>
            </p>
          </form>
        </div>
      </div>

      {/* Decorative Right Hero Banner */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-400/30 via-transparent to-black/30 pointer-events-none" />
        <div className="text-center text-white max-w-md relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-5xl mx-auto mb-6 shadow-2xl border border-white/20">
            🚀
          </div>
          <h2 className="text-3xl font-black mb-3 tracking-tight">Connect with the World</h2>
          <p className="text-sm text-white/80 leading-relaxed">Share your moments, engage with real-time conversations, and experience a modern social platform.</p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-md border border-white/10 hover:scale-105 transition-transform">
              <div className="text-2xl mb-1">💬</div>
              <div className="text-xs font-bold">Realtime Chat</div>
            </div>
            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-md border border-white/10 hover:scale-105 transition-transform">
              <div className="text-2xl mb-1">📞</div>
              <div className="text-xs font-bold">Video Calls</div>
            </div>
            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-md border border-white/10 hover:scale-105 transition-transform">
              <div className="text-2xl mb-1">❤️</div>
              <div className="text-xs font-bold">Reactions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
