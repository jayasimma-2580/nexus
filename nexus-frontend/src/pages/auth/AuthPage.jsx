import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Lock, User, Store, ArrowRight, Phone,
  Eye, EyeOff, CheckCircle, XCircle, ShieldCheck,
  RefreshCw
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { authAPI } from '../../api/client'
import toast from 'react-hot-toast'
import ThemeToggle from '../../components/ui/ThemeToggle'

// ── Password strength ─────────────────────────────────────────────────────────
function getStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '', checks: {} }
  const checks = {
    length:  pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    lower:   /[a-z]/.test(pw),
    number:  /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  }
  const score = Object.values(checks).filter(Boolean).length
  if (score <= 2) return { score: 1, label: 'Weak',   color: 'bg-red-500',    textColor: 'text-red-500',    checks }
  if (score === 3) return { score: 2, label: 'Fair',   color: 'bg-orange-400', textColor: 'text-orange-400', checks }
  if (score === 4) return { score: 3, label: 'Good',   color: 'bg-yellow-400', textColor: 'text-yellow-500', checks }
  return             { score: 4, label: 'Strong', color: 'bg-green-500',  textColor: 'text-green-500',  checks }
}
const pwReqs = [
  { key: 'length',  label: 'At least 8 characters' },
  { key: 'upper',   label: 'Uppercase (A–Z)' },
  { key: 'lower',   label: 'Lowercase (a–z)' },
  { key: 'number',  label: 'Number (0–9)' },
  { key: 'special', label: 'Special character' },
]

// ── OTP Input ─────────────────────────────────────────────────────────────────
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
            focus:border-[var(--accent)] focus:bg-[var(--accent-soft)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]
            disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  )
}

// ── Email OTP Screen ──────────────────────────────────────────────────────────
function EmailOtpScreen({ email, onVerified }) {
  const [otp, setOtp]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const { setAuth } = useAuthStore()

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  async function handleVerify() {
    if (otp.length < 6) return toast.error('Enter the complete 6-digit OTP')
    setLoading(true)
    try {
      const res = await authAPI.verifyOtp(email, otp)
      const { data } = res.data
      setAuth(data, data.token)
      toast.success('Email verified! Welcome to NEXUS 🎉')
      onVerified(data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP')
      setOtp('')
    } finally { setLoading(false) }
  }

  async function handleResend() {
    setResending(true)
    try {
      await authAPI.resendOtp(email)
      toast.success('New OTP sent!')
      setCountdown(60)
      setOtp('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend')
    } finally { setResending(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] p-4"
      style={{ backgroundImage: 'radial-gradient(at 20% 30%, rgba(99,102,241,0.1) 0, transparent 50%), radial-gradient(at 80% 70%, rgba(139,92,246,0.08) 0, transparent 50%)' }}>
      <div className="absolute top-5 right-5"><ThemeToggle /></div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-8 w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-soft)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center mx-auto mb-5">
          <Mail size={28} className="text-[var(--accent)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Verify your email</h2>
        <p className="text-[var(--text-muted)] mb-2 text-sm">We sent a 6-digit code to</p>
        <p className="font-semibold text-[var(--text-primary)] mb-6">{email}</p>
        <OtpInput value={otp} onChange={setOtp} disabled={loading} />
        <button onClick={handleVerify} disabled={loading || otp.length < 6} className="btn-primary w-full mt-5 py-3">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Verify email'}
        </button>
        <div className="mt-4">
          {countdown > 0
            ? <p className="text-sm text-[var(--text-muted)]">Resend in {countdown}s</p>
            : <button onClick={handleResend} disabled={resending} className="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline mx-auto">
                <RefreshCw size={13} /> Resend OTP
              </button>
          }
        </div>
      </motion.div>
    </div>
  )
}

// ── Phone OTP Screen ──────────────────────────────────────────────────────────
function PhoneOtpScreen({ phone, onVerified, onSkip }) {
  const [otp, setOtp]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const { setAuth } = useAuthStore()

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  async function handleVerify() {
    if (otp.length < 6) return toast.error('Enter the complete 6-digit OTP')
    setLoading(true)
    try {
      const res = await authAPI.verifyPhoneOtp(otp)
      const { data } = res.data
      setAuth(data, data.token)
      toast.success('Phone verified! 🎉')
      onVerified(data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP')
      setOtp('')
    } finally { setLoading(false) }
  }

  async function handleResend() {
    setResending(true)
    try {
      await authAPI.sendPhoneOtp()
      toast.success('New OTP sent to your email!')
      setCountdown(60)
      setOtp('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend')
    } finally { setResending(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] p-4"
      style={{ backgroundImage: 'radial-gradient(at 20% 30%, rgba(16,185,129,0.1) 0, transparent 50%)' }}>
      <div className="absolute top-5 right-5"><ThemeToggle /></div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-8 w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
          <Phone size={28} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Verify your phone</h2>
        <p className="text-[var(--text-muted)] mb-1 text-sm">We sent a 6-digit code to your email for</p>
        <p className="font-semibold text-[var(--text-primary)] mb-6">{phone}</p>
        <OtpInput value={otp} onChange={setOtp} disabled={loading} />
        <button onClick={handleVerify} disabled={loading || otp.length < 6} className="btn-primary w-full mt-5 py-3">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Verify phone'}
        </button>
        <div className="mt-4">
          {countdown > 0
            ? <p className="text-sm text-[var(--text-muted)]">Resend in {countdown}s</p>
            : <button onClick={handleResend} disabled={resending} className="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline mx-auto">
                <RefreshCw size={13} /> Resend OTP
              </button>
          }
        </div>
        <button onClick={onSkip} className="mt-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          Skip for now → verify later in Profile
        </button>
      </motion.div>
    </div>
  )
}

// ── Main AuthPage ─────────────────────────────────────────────────────────────
export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || null
  const mode     = location.pathname.includes('register') ? 'register' : 'login'

  const [role,        setRole]        = useState('buyer')
  const [loading,     setLoading]     = useState(false)
  const [showPw,      setShowPw]      = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [otpEmail,    setOtpEmail]    = useState(null)   // triggers email OTP screen
  const [phoneOtpData, setPhoneOtpData] = useState(null) // { phone } triggers phone OTP screen
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', shopName: '', shopDescription: '',
  })
  const [errors, setErrors] = useState({})
  const { setAuth } = useAuthStore()

  useEffect(() => {
    setForm({ name: '', email: '', password: '', confirmPassword: '', phone: '', shopName: '', shopDescription: '' })
    setErrors({})
    setOtpEmail(null)
    setPhoneOtpData(null)
    setRole('buyer')
  }, [mode])

  const strength = mode === 'register' ? getStrength(form.password) : null

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  function validate() {
    const errs = {}
    if (mode === 'register') {
      if (!form.name.trim())               errs.name = 'Name is required'
      else if (form.name.trim().length < 2) errs.name = 'At least 2 characters'
    }
    if (!form.email.trim())                errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.password)                    errs.password = 'Password is required'
    else if (mode === 'register') {
      if (form.password.length < 8)           errs.password = 'At least 8 characters'
      else if (!/[A-Z]/.test(form.password))  errs.password = 'Need at least one uppercase letter'
      else if (!/[a-z]/.test(form.password))  errs.password = 'Need at least one lowercase letter'
      else if (!/[0-9]/.test(form.password))  errs.password = 'Need at least one number'
    }
    if (mode === 'register') {
      if (!form.confirmPassword)             errs.confirmPassword = 'Please confirm password'
      else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match'
      if (role === 'seller' && !form.shopName.trim()) errs.shopName = 'Shop name is required'
      if (form.phone && !/^[\d\s\+\-\(\)]{7,20}$/.test(form.phone.trim()))
        errs.phone = 'Enter a valid phone number'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function redirectAfterLogin() {
    if (redirect) return navigate(redirect, { replace: true })
    navigate('/', { replace: true })
  }

  // Called after email OTP is verified — if phone was provided, go to phone OTP step
  function handleEmailVerified(userData) {
    if (userData.needsPhoneVerification && userData.phone) {
      setPhoneOtpData({ phone: userData.phone })
    } else {
      redirectAfterLogin()
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await authAPI.login({ email: form.email.trim(), password: form.password })
        const { data } = res.data
        setAuth(data, data.token)
        toast.success(`Welcome back, ${data.name}!`)
        redirectAfterLogin()
      } else {
        const payload = {
          name: form.name.trim(), email: form.email.trim(),
          password: form.password, role,
          phone: form.phone.trim() || undefined,
        }
        if (role === 'seller') {
          payload.shopName        = form.shopName.trim()
          payload.shopDescription = form.shopDescription.trim()
        }
        await authAPI.register(payload)
        setOtpEmail(form.email.trim())
        toast.success('OTP sent to your email!')
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong'
      if (err.response?.data?.requiresVerification) {
        setOtpEmail(err.response.data.email || form.email.trim())
      } else if (err.response?.status === 401) {
        setErrors({ password: 'Incorrect email or password' })
      } else if (err.response?.status === 409) {
        setErrors({ email: 'This email is already registered' })
      } else {
        toast.error(msg)
      }
    } finally { setLoading(false) }
  }

  if (phoneOtpData) {
    return (
      <PhoneOtpScreen
        phone={phoneOtpData.phone}
        onVerified={redirectAfterLogin}
        onSkip={redirectAfterLogin}
      />
    )
  }

  if (otpEmail) {
    return <EmailOtpScreen email={otpEmail} onVerified={handleEmailVerified} />
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-secondary)]">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-12 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <Link to="/" className="flex items-center gap-2 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-sm">N</div>
          <span className="text-white font-bold text-xl">NEXUS</span>
        </Link>
        <div className="flex-1 flex items-center relative z-10">
          <div>
            <h1 className="text-5xl font-bold text-white leading-tight mb-4" style={{ whiteSpace: 'pre-line' }}>
              {mode === 'login' ? 'Welcome\nback.' : 'Join the\nmarketplace.'}
            </h1>
            <p className="text-white/70 text-lg max-w-sm leading-relaxed">
              {mode === 'login'
                ? 'Sign in to access your account, track orders, and manage your store.'
                : 'Connect buyers and sellers on a platform built for modern commerce.'}
            </p>
            {mode === 'register' && (
              <div className="mt-8 flex flex-col gap-3">
                {['OTP-verified email & phone', 'Shop from verified sellers', 'Sell your products globally'].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-white/80">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <CheckCircle size={12} className="text-white" />
                    </div>
                    <span className="text-sm">{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-white/5 animate-float" />
        <div className="absolute top-1/3 right-20 w-20 h-20 rounded-full bg-white/10 animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <div className="flex justify-between items-center p-5 shrink-0">
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">N</div>
            <span className="font-bold text-[var(--text-primary)]">NEXUS</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-[var(--text-muted)] hidden sm:block">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button onClick={() => navigate(mode === 'login' ? '/register' : '/login')} className="btn-secondary py-1.5 px-4 text-sm">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-5 py-8">
          <motion.div key={mode} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="w-full max-w-md">
            <div className="mb-7">
              <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-1">
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </h2>
              <p className="text-[var(--text-muted)]">
                {mode === 'login' ? 'Welcome back! Enter your credentials.' : 'Fill in your details to get started.'}
              </p>
            </div>

            {/* Role selector */}
            {mode === 'register' && (
              <div className="flex gap-3 mb-6">
                {[
                  { value: 'buyer',  icon: User,  label: 'Buyer',  desc: 'Shop products' },
                  { value: 'seller', icon: Store, label: 'Seller', desc: 'Sell products' },
                ].map(({ value, icon: Icon, label, desc }) => (
                  <button key={value} type="button" onClick={() => setRole(value)}
                    className={`flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                      role === value
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                    }`}>
                    <Icon size={20} />
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs opacity-70">{desc}</span>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {/* Name */}
              {mode === 'register' && (
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Full name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input type="text" value={form.name} onChange={e => setField('name', e.target.value)}
                      placeholder="Your full name" className={`input pl-9 ${errors.name ? 'error' : ''}`} />
                  </div>
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Email address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                    placeholder="you@example.com" className={`input pl-9 ${errors.email ? 'error' : ''}`} autoComplete="email" />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Phone (register only) */}
              {mode === 'register' && (
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
                    Phone number <span className="text-[var(--text-muted)]">(optional — will be OTP verified)</span>
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)}
                      placeholder="+91 98765 43210" className={`input pl-9 ${errors.phone ? 'error' : ''}`} />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                  {form.phone && !errors.phone && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                      A verification OTP will be sent after email is verified
                    </p>
                  )}
                </div>
              )}

              {/* Password */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Password</label>
                  {mode === 'login' && <Link to="/forgot-password" className="text-xs text-[var(--accent)] hover:underline">Forgot password?</Link>}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => setField('password', e.target.value)}
                    placeholder={mode === 'register' ? 'Min. 8 chars, uppercase, number' : '••••••••'}
                    className={`input pl-9 pr-10 ${errors.password ? 'error' : ''}`}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                {mode === 'register' && form.password && (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-[var(--border)]'}`} />
                      ))}
                    </div>
                    <p className={`text-xs font-semibold ${strength.textColor}`}>{strength.label}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {pwReqs.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-1.5">
                          {strength.checks?.[key]
                            ? <CheckCircle size={11} className="text-green-500 shrink-0" />
                            : <XCircle    size={11} className="text-[var(--text-muted)] shrink-0" />
                          }
                          <span className={`text-[11px] ${strength.checks?.[key] ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-muted)]'}`}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              {mode === 'register' && (
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Confirm password</label>
                  <div className="relative">
                    <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword}
                      onChange={e => setField('confirmPassword', e.target.value)}
                      placeholder="Re-enter your password"
                      className={`input pl-9 pr-10 ${errors.confirmPassword ? 'error' : ''}`}
                      autoComplete="new-password" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                  {!errors.confirmPassword && form.confirmPassword && form.password === form.confirmPassword && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><CheckCircle size={11} /> Passwords match</p>
                  )}
                </div>
              )}

              {/* Seller fields */}
              {mode === 'register' && role === 'seller' && (
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-4 overflow-hidden">
                    <div>
                      <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Shop name</label>
                      <div className="relative">
                        <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input type="text" value={form.shopName} onChange={e => setField('shopName', e.target.value)}
                          placeholder="Your store name" className={`input pl-9 ${errors.shopName ? 'error' : ''}`} />
                      </div>
                      {errors.shopName && <p className="text-xs text-red-500 mt-1">{errors.shopName}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
                        Shop description <span className="text-[var(--text-muted)]">(optional)</span>
                      </label>
                      <textarea value={form.shopDescription} onChange={e => setField('shopDescription', e.target.value)}
                        placeholder="Tell buyers about your store…" rows={3} className="input resize-none" />
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Your seller account will be reviewed by an admin before you can list products.
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full mt-1 py-3 gap-2">
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></>
                }
              </button>

              <p className="text-center text-sm text-[var(--text-muted)] sm:hidden">
                {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
                <button type="button" onClick={() => navigate(mode === 'login' ? '/register' : '/login')} className="text-[var(--accent)] font-medium hover:underline">
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
