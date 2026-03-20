/**
 * pages/auth/VerifyEmail.jsx
 *
 * Fix Bug #2: This page was calling authAPI.verifyEmail(token) which doesn't exist.
 * The backend uses OTP-based verification only, not link-based tokens.
 *
 * New behaviour: redirect to /login with a helpful message explaining the user
 * should use the OTP sent to their email. This page is kept as a graceful fallback
 * for any old verify-email links that might exist.
 */

import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowRight } from 'lucide-react'

export default function VerifyEmail() {
  const navigate = useNavigate()

  // Auto-redirect to login after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => navigate('/login'), 5000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] mesh-bg p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-10 max-w-sm w-full text-center"
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-soft)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center mx-auto mb-5">
          <Mail size={28} className="text-[var(--accent)]" />
        </div>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Check your email
        </h2>
        <p className="text-[var(--text-muted)] mb-6 leading-relaxed">
          NEXUS uses OTP-based verification. Please check your email for a
          6-digit code and enter it on the login screen.
        </p>

        <Link to="/login" className="btn-primary w-full justify-center gap-2">
          Go to login <ArrowRight size={16} />
        </Link>

        <p className="text-xs text-[var(--text-muted)] mt-4">
          Redirecting automatically in a few seconds…
        </p>
      </motion.div>
    </div>
  )
}
