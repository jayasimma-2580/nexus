import { motion } from 'framer-motion'

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center mb-4">
          <Icon size={28} className="text-[var(--accent)]" />
        </div>
      )}
      <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--text-muted)] max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}
