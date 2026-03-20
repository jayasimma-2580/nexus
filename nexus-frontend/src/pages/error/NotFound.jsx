import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] mesh-bg p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
        <div className="relative mb-8">
          <span className="text-[9rem] font-black text-[var(--border)] select-none leading-none block">404</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-[var(--accent-soft)] border border-[var(--border-hover)] flex items-center justify-center">
              <Search size={32} className="text-[var(--accent)]" />
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Page not found</h1>
        <p className="text-[var(--text-muted)] mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.history.back()} className="btn-ghost">Go back</button>
          <Link to="/" className="btn-primary"><Home size={16} /> Home</Link>
        </div>
      </motion.div>
    </div>
  )
}
