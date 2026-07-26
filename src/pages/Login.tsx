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

  const handleLogin = async (e: React.FormEvent) => {
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
    <div className="min-h-screen flex">
      {/* Left Side */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <div className="text-5xl mb-4">📱</div>

            <h1 className="text-3xl font-bold text-gray-900">
              Welcome Back
            </h1>

            <p className="mt-2 text-gray-500">
              Sign in with your email and password.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-indigo-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <p className="text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-medium text-indigo-600 hover:text-indigo-700"
              >
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Right Side */}
      <div className="hidden flex-1 items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-12 lg:flex">
        <div className="max-w-md text-center text-white">
          <div className="mb-8 text-8xl">🚀</div>

          <h2 className="mb-4 text-3xl font-bold">
            Connect with the World
          </h2>

          <p className="text-lg text-white/80">
            Share your thoughts, connect with people, and become part of a
            growing social community.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="mb-1 text-2xl">💬</div>
              <div className="text-sm font-medium">Share</div>
            </div>

            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="mb-1 text-2xl">❤️</div>
              <div className="text-sm font-medium">Connect</div>
            </div>

            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="mb-1 text-2xl">🌟</div>
              <div className="text-sm font-medium">Discover</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login