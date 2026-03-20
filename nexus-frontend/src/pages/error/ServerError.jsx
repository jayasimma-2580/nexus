import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ServerCrash, RefreshCw } from 'lucide-react'

export default function ServerError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] mesh-bg p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <ServerCrash size={32} className="text-amber-500" />
        </div>
        <span className="badge badge-yellow mb-4">500 Server Error</span>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Something went wrong</h1>
        <p className="text-[var(--text-muted)] mb-8">Our servers hit a snag. We're working on it — please try again in a moment.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.location.reload()} className="btn-primary"><RefreshCw size={16} /> Retry</button>
          <Link to="/" className="btn-ghost">Go home</Link>
        </div>
      </motion.div>
    </div>
  )
}
