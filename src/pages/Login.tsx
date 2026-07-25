import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Login = () => {
  const navigate = useNavigate()
  const { sendOtp, verifyOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const emailRef = useRef<HTMLInputElement>(null)

  // Focus first OTP input when step changes to otp
  useEffect(() => {
    if (step === 'otp') {
      const firstInput = otpRefs.current[0]
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100)
      }
    }
  }, [step])

  // Handle OTP resend countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await sendOtp(email)
      setStep('otp')
      setCountdown(60) // 60s resend cooldown
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return // Only allow single digit

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter') {
      handleVerifyOtp()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const newOtp = [...otp]
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i]
    }
    setOtp(newOtp)

    // Focus the next empty input or last input
    if (pasted.length < 6) {
      otpRefs.current[pasted.length]?.focus()
    } else {
      otpRefs.current[5]?.focus()
    }
  }

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }

    setError('')
    setLoading(true)

    try {
      await verifyOtp(email, otpCode)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code')
      // Clear OTP inputs on error
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (countdown > 0) return
    setError('')
    setLoading(true)

    try {
      await sendOtp(email)
      setCountdown(60)
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setError('')
    setOtp(['', '', '', '', '', ''])
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <div className="text-4xl mb-4">📱</div>
            <h1 className="text-3xl font-bold text-gray-900">
              {step === 'email' ? 'Welcome back' : 'Check your email'}
            </h1>
            <p className="mt-2 text-gray-500">
              {step === 'email'
                ? 'Enter your email to receive a one-time code'
                : `We sent a 6-digit code to ${email}`}
            </p>
          </div>

          {step === 'email' ? (
            /* Step 1: Email Input */
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-sm"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending code...
                  </>
                ) : (
                  'Send OTP'
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                Don't have an account?{' '}
                <Link to="/signup" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Create one
                </Link>
              </p>
            </form>
          ) : (
            /* Step 2: OTP Input */
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  Enter the 6-digit code
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all duration-150
                        ${digit ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}
                        focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200`}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading || otp.join('').length !== 6}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Change email
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || loading}
                  className={`text-sm font-medium transition-colors ${
                    countdown > 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-indigo-600 hover:text-indigo-700'
                  }`}
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right - Illustration */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 items-center justify-center p-12">
        <div className="text-center text-white max-w-md">
          <div className="text-8xl mb-8">🚀</div>
          <h2 className="text-3xl font-bold mb-4">Connect with the world</h2>
          <p className="text-lg text-white/80">
            Share your thoughts, follow interesting people, and be part of a growing community.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-2xl mb-1">💬</div>
              <div className="text-sm font-medium">Share</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-2xl mb-1">❤️</div>
              <div className="text-sm font-medium">Connect</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-2xl mb-1">🌟</div>
              <div className="text-sm font-medium">Discover</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

