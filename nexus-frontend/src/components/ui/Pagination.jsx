import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center gap-2 justify-center mt-8">
      <button
        onClick={() => onPageChange(page - 1)} disabled={page <= 1}
        className="btn-ghost p-2 disabled:opacity-40"
      ><ChevronLeft size={16} /></button>

      {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
        const p = pages <= 7 ? i + 1 : i < 3 ? i + 1 : i === 3 ? '…' : pages - (6 - i)
        if (p === '…') return <span key="ellipsis" className="px-2 text-[var(--text-muted)]">…</span>
        return (
          <button
            key={p} onClick={() => onPageChange(p)}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
              p === page ? 'bg-[var(--accent)] text-white shadow-nexus' : 'btn-ghost'
            }`}
          >{p}</button>
        )
      })}

      <button
        onClick={() => onPageChange(page + 1)} disabled={page >= pages}
        className="btn-ghost p-2 disabled:opacity-40"
      ><ChevronRight size={16} /></button>
    </div>
  )
}
