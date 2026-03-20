import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { productAPI } from '../../api/client'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import toast from 'react-hot-toast'

export default function SellerProducts() {
  const qc = useQueryClient()
  const [page, setPage]               = useState(1)
  const [status, setStatus]           = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-products', page, status],
    queryFn:  () => productAPI.getMy({ page, limit: 15, status: status || undefined }),
  })
  const products = data?.data?.data || []
  const meta     = data?.data?.meta || {}

  const del = useMutation({
    mutationFn: (id) => productAPI.delete(id),
    onSuccess: () => {
      toast.success('Product deleted')
      setDeleteTarget(null)
      // v5 syntax — must use object form so invalidation matches the registered queryKey
      qc.invalidateQueries({ queryKey: ['my-products'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to delete'),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">My products</h1>
          <p className="text-sm text-[var(--text-muted)]">{meta.total || 0} total</p>
        </div>
        <Link to="/seller/products/new" className="btn-primary gap-2">
          <Plus size={16} /> Add product
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-tertiary)] rounded-xl w-fit">
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s === 'all' ? '' : s); setPage(1) }}
            className={`px-3 py-1 rounded-lg text-sm font-medium capitalize transition-all ${
              (s === 'all' && !status) || s === status
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Product list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={status ? `No ${status} products` : 'No products yet'}
          description={status ? 'Try a different filter.' : 'Add your first product to get started.'}
          action={
            !status
              ? <Link to="/seller/products/new" className="btn-primary gap-2"><Plus size={15} /> Add product</Link>
              : undefined
          }
        />
      ) : (
        <div className="grid gap-3">
          {products.map(p => (
            <div key={p._id} className="card p-4 flex gap-4 items-center">
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-xl bg-[var(--bg-tertiary)] overflow-hidden shrink-0">
                {p.images?.[0]?.url
                  ? <img src={p.images[0].url} className="w-full h-full object-cover" alt={p.name} />
                  : <Package size={20} className="m-auto mt-3.5 text-[var(--text-muted)]" />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">{p.name}</h3>
                  <Badge status={p.status}>{p.status}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-sm font-bold text-[var(--text-primary)]">₹{p.price?.toLocaleString()}</span>
                  <span className={`text-xs ${p.stock === 0 ? 'text-red-500 font-medium' : 'text-[var(--text-muted)]'}`}>
                    Stock: {p.stock === 0 ? 'Out of stock' : p.stock}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{p.category?.name}</span>
                </div>
                {p.rejectionReason && (
                  <p className="text-xs text-red-500 mt-1">
                    Rejected: {p.rejectionReason}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <Link
                  to={`/seller/products/${p._id}`}
                  className="p-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent-soft)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
                  title="Edit product"
                >
                  <Pencil size={15} />
                </Link>
                <button
                  onClick={() => setDeleteTarget(p)}
                  className="p-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-all"
                  title="Delete product"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={meta.page || 1} pages={meta.pages || 1} onPageChange={setPage} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => del.mutate(deleteTarget._id)}
        loading={del.isPending}
        title="Delete product"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  )
}