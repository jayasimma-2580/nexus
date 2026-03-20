import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldOff, ArrowLeft, LogIn } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

export default function Unauthorized() {
  const { isAuthenticated } = useAuthStore()
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] mesh-bg p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <ShieldOff size={32} className="text-red-500" />
        </div>
        <span className="badge badge-red mb-4">403 Forbidden</span>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access denied</h1>
        <p className="text-[var(--text-muted)] mb-8">You don't have permission to view this page.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.history.back()} className="btn-ghost"><ArrowLeft size={16} /> Go back</button>
          {!isAuthenticated && <Link to="/login" className="btn-primary"><LogIn size={16} /> Sign in</Link>}
        </div>
      </motion.div>
    </div>
  )
}
