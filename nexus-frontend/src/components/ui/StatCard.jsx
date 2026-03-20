import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function StatCard({ title, value, icon: Icon, trend, trendLabel, color = 'purple', delay = 0 }) {
  const colors = {
    purple: 'from-indigo-500/10 to-purple-500/10 border-indigo-500/20',
    green:  'from-green-500/10 to-emerald-500/10 border-green-500/20',
    yellow: 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
    blue:   'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
    red:    'from-red-500/10 to-rose-500/10 border-red-500/20',
  }
  const iconColors = {
    purple: 'bg-indigo-500/15 text-indigo-400',
    green:  'bg-green-500/15 text-green-400',
    yellow: 'bg-amber-500/15 text-amber-400',
    blue:   'bg-blue-500/15 text-blue-400',
    red:    'bg-red-500/15 text-red-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      className={`card p-5 bg-gradient-to-br ${colors[color]} border`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">{title}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">{value}</p>
          {trend != null && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend)}% {trendLabel}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColors[color]}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
