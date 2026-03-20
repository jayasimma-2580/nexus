import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, CheckCircle, Mail, LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { authAPI } from '../../api/client'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function SellerPending() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const statusConfig = {
    pending:   { icon: Clock,        color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', title: 'Application under review', desc: "We're reviewing your seller application. This usually takes 1–2 business days." },
    suspended: { icon: Clock,        color: 'text-red-500',   bg: 'bg-red-500/10 border-red-500/20',   title: 'Account suspended',         desc: user?.adminNote || 'Your account has been temporarily suspended. Contact support for more information.' },
    banned:    { icon: CheckCircle,  color: 'text-red-500',   bg: 'bg-red-500/10 border-red-500/20',   title: 'Account banned',            desc: user?.adminNote || 'Your account has been permanently banned.' },
  }
  const cfg = statusConfig[user?.sellerStatus] || statusConfig.pending
  const Icon = cfg.icon

  async function handleLogout() {
    try { await authAPI.logout() } catch {}
    logout(); navigate('/')
    toast.success('Logged out')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] mesh-bg p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="card p-8 max-w-md w-full text-center">
        <div className={`w-16 h-16 rounded-2xl ${cfg.bg} border flex items-center justify-center mx-auto mb-4`}>
          <Icon size={28} className={cfg.color} />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{cfg.title}</h2>
        <p className="text-[var(--text-muted)] mb-2">{cfg.desc}</p>
        {user?.shopName && <p className="text-sm font-medium text-[var(--text-secondary)] mb-6">Store: <span className="text-[var(--text-primary)]">{user.shopName}</span></p>}
        {user?.sellerStatus === 'pending' && (
          <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">What happens next</p>
            <ul className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" /> Admin reviews your shop details</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" /> You receive an email notification</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" /> Log back in to start listing products</li>
            </ul>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={handleLogout} className="btn-ghost flex-1 gap-2"><LogOut size={15} /> Sign out</button>
          <Link to="/shop" className="btn-primary flex-1">Browse shop</Link>
        </div>
      </motion.div>
    </div>
  )
}
