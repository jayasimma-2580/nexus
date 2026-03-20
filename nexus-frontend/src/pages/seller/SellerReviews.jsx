/**
 * pages/seller/SellerReviews.jsx
 *
 * Sellers see all reviews on their products, can reply or edit their reply.
 * Grouped display: product name, buyer name, rating, comment, seller reply.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, MessageSquare, Pencil, Trash2, Send, Package } from 'lucide-react'
import { motion } from 'framer-motion'
import { reviewAPI } from '../../api/client'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

export default function SellerReviews() {
  const qc = useQueryClient()
  const [replyTargetId, setReplyTargetId] = useState(null)
  const [replyText, setReplyText]         = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['seller-reviews'],
    queryFn:  reviewAPI.getSellerReviews,
  })
  const reviews = data?.data?.data || []

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  function openReply(r) {
    setReplyTargetId(r._id)
    setReplyText(r.sellerReply?.comment || '')
  }

  const saveReply = useMutation({
    mutationFn: ({ id, comment }) => reviewAPI.addReply(id, comment),
    onSuccess: () => {
      toast.success('Reply saved')
      setReplyTargetId(null)
      setReplyText('')
      qc.invalidateQueries({ queryKey: ['seller-reviews'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to save reply'),
  })

  const deleteReply = useMutation({
    mutationFn: (id) => reviewAPI.deleteReply(id),
    onSuccess: () => {
      toast.success('Reply removed')
      qc.invalidateQueries({ queryKey: ['seller-reviews'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to remove reply'),
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size={28} /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reviews</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {reviews.length} review{reviews.length !== 1 ? 's' : ''} on your products
            {avgRating && ` · avg ${avgRating} ★`}
          </p>
        </div>
        {avgRating && (
          <div className="card px-4 py-2 flex items-center gap-2">
            <Star size={18} className="fill-amber-400 text-amber-400" />
            <span className="text-xl font-bold text-[var(--text-primary)]">{avgRating}</span>
            <span className="text-sm text-[var(--text-muted)]">/ 5</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Reviews will appear here when buyers rate your products after receiving them."
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((r, i) => (
            <motion.div key={r._id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="card p-5"
            >
              {/* Product + buyer row */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] overflow-hidden shrink-0">
                  {r.product?.images?.[0]?.url
                    ? <img src={r.product.images[0].url} className="w-full h-full object-cover" alt="" />
                    : <Package size={16} className="m-auto mt-3 text-[var(--text-muted)]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text-primary)] truncate text-sm">
                    {r.product?.name || 'Product'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-[var(--text-muted)]">by {r.buyer?.name || 'Buyer'}</span>
                    <span className="text-xs text-[var(--text-muted)]">·</span>
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={11}
                          className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-[var(--border)]'} />
                      ))}
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Buyer comment */}
              {r.comment && (
                <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed">{r.comment}</p>
              )}

              {/* Reply section */}
              {replyTargetId === r._id ? (
                /* Inline reply editor */
                <div className="border-t border-[var(--border)] pt-3">
                  <p className="text-xs font-semibold text-[var(--accent)] mb-2 flex items-center gap-1">
                    <MessageSquare size={12} /> Your reply
                  </p>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={3}
                    placeholder="Write a helpful reply to this review…"
                    className="input resize-none text-sm mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setReplyTargetId(null); setReplyText('') }}
                      className="btn-ghost py-1.5 px-3 text-sm">
                      Cancel
                    </button>
                    <button
                      onClick={() => saveReply.mutate({ id: r._id, comment: replyText })}
                      disabled={saveReply.isPending || !replyText.trim()}
                      className="btn-primary py-1.5 px-4 text-sm gap-1.5">
                      {saveReply.isPending
                        ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                        : <Send size={13} />}
                      Save reply
                    </button>
                  </div>
                </div>
              ) : r.sellerReply?.comment ? (
                /* Existing reply */
                <div className="border-t border-[var(--border)] pt-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1">
                      <MessageSquare size={12} /> Your reply
                      <span className="font-normal text-[var(--text-muted)] ml-1">
                        · {new Date(r.sellerReply.repliedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </span>
                    </p>
                    <div className="flex gap-1">
                      <button onClick={() => openReply(r)}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all"
                        title="Edit reply">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => deleteReply.mutate(r._id)}
                        disabled={deleteReply.isPending}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"
                        title="Delete reply">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{r.sellerReply.comment}</p>
                </div>
              ) : (
                /* No reply yet */
                <div className="border-t border-[var(--border)] pt-3">
                  <button onClick={() => openReply(r)}
                    className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline font-medium">
                    <MessageSquare size={12} /> Reply to this review
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
