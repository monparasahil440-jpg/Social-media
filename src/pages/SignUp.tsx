import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const SignUp = () => {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(email, password, username || undefined)
      // Since email confirmation is disabled, user is auto-signed-in
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-slate-50">
      {/* Background ambient decorative light spheres */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-400/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* Left - Illustration */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-400/30 via-transparent to-black/30 pointer-events-none" />
        <div className="text-center text-white max-w-md relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-5xl mx-auto mb-6 shadow-2xl border border-white/20">
            🎉
          </div>
          <h2 className="text-3xl font-black mb-3 tracking-tight">Join Our Community</h2>
          <p className="text-sm text-white/80 leading-relaxed">
            Create an account today to share creative posts, connect with friends, and start audio/video chats.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-md border border-white/10 hover:scale-105 transition-transform">
              <div className="text-2xl mb-1">✍️</div>
              <div className="text-xs font-bold">Create</div>
            </div>
            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-md border border-white/10 hover:scale-105 transition-transform">
              <div className="text-2xl mb-1">🤝</div>
              <div className="text-xs font-bold">Connect</div>
            </div>
            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-md border border-white/10 hover:scale-105 transition-transform">
              <div className="text-2xl mb-1">📸</div>
              <div className="text-xs font-bold">Share</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-12 relative z-10 py-10">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-2xl rounded-3xl p-8 border border-slate-200/80 shadow-2xl shadow-purple-500/10">
          <div className="mb-8 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-purple-500/30 mb-4 mx-auto sm:mx-0">
              ✨
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">Create account</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-500">
              Join thousands of people connecting every day
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                Username (optional)
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 text-sm font-medium transition-all"
                placeholder="johndoe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 text-sm font-medium transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 text-sm font-medium transition-all"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 animate-fade-in">
                <p className="text-xs font-semibold text-rose-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create New Account'
              )}
            </button>

            <p className="text-center text-xs font-medium text-slate-500 pt-2">
              Already have an account?{' '}
              <Link to="/login" className="text-purple-600 hover:underline font-extrabold">
                Sign in instead
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SignUp

