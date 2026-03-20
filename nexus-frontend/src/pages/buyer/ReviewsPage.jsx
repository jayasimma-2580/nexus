/**
 * pages/buyer/ReviewsPage.jsx
 *
 * Buyer can see all reviews they have written, edit them, and delete them.
 * Shows product name, their rating, comment, and if the seller replied.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Star, Pencil, Trash2, MessageSquare, Package, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { reviewAPI } from '../../api/client'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className="text-amber-400 hover:scale-110 transition-transform">
          <Star size={22} fill={s <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const qc = useQueryClient()
  const [editTarget, setEditTarget]   = useState(null) // { _id, rating, comment }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editForm, setEditForm]       = useState({ rating: 5, comment: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn:  reviewAPI.getMyReviews,
  })
  const reviews = data?.data?.data || []

  function openEdit(r) {
    setEditTarget(r)
    setEditForm({ rating: r.rating, comment: r.comment || '' })
  }

  const update = useMutation({
    mutationFn: () => reviewAPI.addOrUpdate({
      productId: editTarget.product._id,
      rating:    editForm.rating,
      comment:   editForm.comment,
    }),
    onSuccess: () => {
      toast.success('Review updated')
      setEditTarget(null)
      qc.invalidateQueries({ queryKey: ['my-reviews'] })
      qc.invalidateQueries({ queryKey: ['reviews', editTarget?.product?._id] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to update'),
  })

  const del = useMutation({
    mutationFn: () => reviewAPI.delete(deleteTarget._id),
    onSuccess: () => {
      toast.success('Review deleted')
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['my-reviews'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to delete'),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>

  return (
    <div className="page-container py-10">
      <div className="mb-8">
        <h1 className="section-heading text-3xl">My Reviews</h1>
        <p className="text-[var(--text-muted)] mt-1">
          {reviews.length > 0 ? `${reviews.length} review${reviews.length !== 1 ? 's' : ''} written` : 'No reviews yet'}
        </p>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="You can review products you've purchased and received. Go to your orders to find eligible products."
          action={<Link to="/orders" className="btn-primary">View my orders</Link>}
        />
      ) : (
        <div className="space-y-4 max-w-2xl">
          {reviews.map((r, i) => (
            <motion.div key={r._id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card p-5"
            >
              {/* Product info */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] overflow-hidden shrink-0">
                  {r.product?.images?.[0]?.url
                    ? <img src={r.product.images[0].url} className="w-full h-full object-cover" alt="" />
                    : <Package size={20} className="m-auto mt-3 text-[var(--text-muted)]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/shop/${r.product?._id}`}
                    className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate block">
                    {r.product?.name || 'Product'}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={12}
                          className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-[var(--border)]'} />
                      ))}
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </span>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => openEdit(r)}
                    className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent-soft)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
                    title="Edit review">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteTarget(r)}
                    className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-all"
                    title="Delete review">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Review comment */}
              {r.comment && (
                <p className="text-sm text-[var(--text-secondary)] mb-3">{r.comment}</p>
              )}

              {/* Seller reply */}
              {r.sellerReply?.comment && (
                <div className="mt-2 pl-3 border-l-2 border-[var(--accent-soft)] bg-[var(--bg-tertiary)] rounded-r-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare size={12} className="text-[var(--accent)]" />
                    <span className="text-xs font-semibold text-[var(--accent)]">Seller replied</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      · {new Date(r.sellerReply.repliedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{r.sellerReply.comment}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit your review" size="sm">
        {editTarget && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Rating</p>
              <StarPicker value={editForm.rating} onChange={v => setEditForm(f => ({ ...f, rating: v }))} />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Comment</p>
              <textarea value={editForm.comment}
                onChange={e => setEditForm(f => ({ ...f, comment: e.target.value }))}
                rows={4} placeholder="Share your experience…"
                className="input resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditTarget(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={() => update.mutate()}
                disabled={update.isPending}
                className="btn-primary flex-1 gap-2">
                {update.isPending
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <CheckCircle size={15} />}
                Save changes
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => del.mutate()}
        loading={del.isPending}
        title="Delete review"
        message={`Delete your review for "${deleteTarget?.product?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  )
}
