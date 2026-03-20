/**
 * ForgotPassword.jsx — 3-step OTP-based password reset
 *
 * Step 1: Enter email → backend sends OTP
 * Step 2: Enter 6-digit OTP → backend returns a resetToken
 * Step 3: Enter new password using resetToken
 */
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft, Lock, Eye, EyeOff, CheckCircle, RefreshCw } from 'lucide-react'
import { authAPI } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import ThemeToggle from '../../components/ui/ThemeToggle'

function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([])
  const digits = value.split('')
  function handleKey(e, idx) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) inputs.current[idx - 1]?.focus()
  }
  function handleChange(e, idx) {
    const v = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = [...digits]; arr[idx] = v; onChange(arr.join(''))
    if (v && idx < 5) inputs.current[idx + 1]?.focus()
  }
  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) { onChange(pasted.padEnd(6, '').slice(0, 6)); inputs.current[Math.min(pasted.length, 5)]?.focus() }
    e.preventDefault()
  }
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input key={i} ref={el => inputs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''} onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKey(e, i)} onPaste={handlePaste} disabled={disabled}
          className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-all outline-none
            ${digits[i] ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)]'}
            focus:border-[var(--accent)] focus:bg-[var(--accent-soft)]
            disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  )
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [step, setStep]           = useState(1) // 1=email, 2=otp, 3=newpw
  const [email, setEmail]         = useState('')
  const [otp, setOtp]             = useState('')
  const [resetToken, setResetToken] = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  async function handleSendOtp(e) {
    e.preventDefault()
    if (!email.trim()) return toast.error('Enter your email')
    setLoading(true)
    try {
      await authAPI.forgotPassword(email.trim())
      toast.success('OTP sent to your email!')
      setStep(2)
      setCountdown(60)
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  async function handleVerifyOtp() {
    if (otp.length < 6) return toast.error('Enter the complete 6-digit OTP')
    setLoading(true)
    try {
      const res = await authAPI.verifyResetOtp(email.trim(), otp)
      setResetToken(res.data.data.resetToken)
      toast.success('OTP verified! Set your new password.')
      setStep(3)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP')
      setOtp('')
    } finally { setLoading(false) }
  }

  async function handleResendOtp() {
    setLoading(true)
    try {
      await authAPI.forgotPassword(email.trim())
      toast.success('New OTP sent!')
      setOtp('')
      setCountdown(60)
    } catch { toast.error('Could not resend OTP') }
    finally { setLoading(false) }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (password.length < 6) return toast.error('Password must be at least 6 characters')
    if (password !== confirm) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      const res = await authAPI.resetPassword(resetToken, email.trim(), password)
      setAuth(res.data.data, res.data.data.token)
      toast.success('Password reset successfully!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Session expired. Please start again.')
      setStep(1); setOtp(''); setResetToken('')
    } finally { setLoading(false) }
  }

  const stepLabels = ['Email', 'Verify OTP', 'New Password']

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] mesh-bg p-4">
      <div className="absolute top-5 right-5"><ThemeToggle /></div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-8 w-full max-w-md">
        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                i + 1 < step ? 'bg-green-500 text-white' :
                i + 1 === step ? 'bg-[var(--accent)] text-white' :
                'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
              }`}>
                {i + 1 < step ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i + 1 === step ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                {label}
              </span>
              {i < stepLabels.length - 1 && (
                <div className={`flex-1 h-0.5 rounded-full transition-all ${i + 1 < step ? 'bg-green-500' : 'bg-[var(--border)]'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1 — Email */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Link to="/login" className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-5 transition-colors">
                <ArrowLeft size={14} /> Back to login
              </Link>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Forgot password?</h2>
              <p className="text-[var(--text-muted)] mb-6">Enter your email and we'll send a 6-digit OTP.</p>
              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" className="input pl-9" autoFocus />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Send OTP'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 2 — OTP */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Enter OTP</h2>
              <p className="text-[var(--text-muted)] mb-6">
                We sent a 6-digit code to <strong className="text-[var(--text-primary)]">{email}</strong>
              </p>
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />
              <button onClick={handleVerifyOtp} disabled={loading || otp.length < 6} className="btn-primary w-full py-3 mt-5">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Verify OTP'}
              </button>
              <div className="flex items-center justify-center gap-2 mt-4">
                {countdown > 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">Resend in {countdown}s</p>
                ) : (
                  <button onClick={handleResendOtp} disabled={loading} className="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
                    <RefreshCw size={13} /> Resend OTP
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 3 — New Password */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Set new password</h2>
              <p className="text-[var(--text-muted)] mb-6">Choose a strong password for your account.</p>
              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="New password (min. 6 characters)" className="input pl-9 pr-10" autoFocus />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Confirm password" className="input pl-9" />
                </div>
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
                {confirm && password === confirm && confirm.length > 0 && (
                  <p className="text-xs text-green-500 flex items-center gap-1"><CheckCircle size={11} /> Passwords match</p>
                )}
                <button type="submit" disabled={loading || !password || !confirm} className="btn-primary w-full py-3">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Reset password'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
