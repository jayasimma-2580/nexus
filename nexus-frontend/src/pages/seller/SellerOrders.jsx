import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag, ChevronDown, Package, MapPin, CheckCircle, XCircle } from 'lucide-react'
import { orderAPI } from '../../api/client'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

// Mirrors backend SELLER_TRANSITIONS — only valid next statuses shown in dropdown
const SELLER_TRANSITIONS = {
  pending:    ['processing', 'cancelled'],
  processing: ['shipped',    'cancelled'],
  shipped:    ['delivered',  'cancelled'],
  delivered:  [],  // terminal — locked
  cancelled:  [],  // terminal — locked
}

const STATUS_LABELS = {
  processing: 'Processing',
  shipped:    'Shipped',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
}

export default function SellerOrders() {
  const qc = useQueryClient()
  const [selected, setSelected]   = useState(null)
  const [newStatus, setNewStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn:  orderAPI.getSeller,
  })
  const orders = data?.data?.data || []

  const update = useMutation({
    mutationFn: ({ orderId, status }) => orderAPI.updateSellerStatus(orderId, status),
    onSuccess: () => {
      toast.success('Status updated')
      setSelected(null)
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  function openModal(order) {
    const current = order.subOrder?.status || 'pending'
    const allowed = SELLER_TRANSITIONS[current] || []
    if (allowed.length === 0) return
    setSelected(order)
    setNewStatus(allowed[0])
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size={28} /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My orders</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {orders.length} order{orders.length !== 1 ? 's' : ''} containing your products
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders yet"
          description="Orders will appear here when buyers purchase your products." />
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map(o => {
            const current    = o.subOrder?.status || 'pending'
            const allowed    = SELLER_TRANSITIONS[current] || []
            const isTerminal = allowed.length === 0

            return (
              <div key={o.orderId} className="card p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-mono text-sm text-[var(--text-muted)]">
                      #{o.orderId?.slice(-8).toUpperCase()}
                    </p>
                    <p className="font-semibold text-[var(--text-primary)]">{o.buyer?.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {o.buyer?.email} · {new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge status={current}>{current}</Badge>
                    {!isTerminal && (
                      <button onClick={() => openModal(o)} className="btn-secondary py-1.5 px-3 text-xs">
                        Update status
                      </button>
                    )}
                    {current === 'delivered' && (
                      <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                        <CheckCircle size={12} /> Completed
                      </span>
                    )}
                    {current === 'cancelled' && (
                      <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                        <XCircle size={12} /> Cancelled
                      </span>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {(o.myItems || []).length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                      <Package size={14} /> No item details
                    </p>
                  ) : o.myItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                      {item.image && <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">Qty: {item.quantity} · ₹{item.price?.toLocaleString()} each</p>
                      </div>
                      <span className="font-semibold text-[var(--text-primary)] shrink-0">
                        ₹{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Earnings */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                  <div className="text-xs text-[var(--text-muted)] space-x-3">
                    <span>Gross: ₹{o.subOrder?.grossAmount?.toLocaleString() || 0}</span>
                    <span>Commission: ₹{o.subOrder?.commissionAmount?.toLocaleString() || 0}</span>
                  </div>
                  <div className="text-sm font-bold text-green-500">
                    Net: ₹{o.subOrder?.netEarnings?.toLocaleString() || 0}
                  </div>
                </div>

                {o.shippingInfo?.address && (
                  <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                    <MapPin size={11} />
                    {o.shippingInfo.address}, {o.shippingInfo.city}, {o.shippingInfo.country}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Status update modal — only valid next statuses */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Update fulfillment status" size="sm">
        {selected && (() => {
          const current = selected.subOrder?.status || 'pending'
          const allowed = SELLER_TRANSITIONS[current] || []
          return (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-1">
                Order <strong className="font-mono text-[var(--text-primary)]">
                  #{selected.orderId?.slice(-8).toUpperCase()}
                </strong>
              </p>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Current: <span className="font-medium text-[var(--text-primary)]">{current}</span>
              </p>
              <div className="relative mb-4">
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="input appearance-none pr-9">
                  {allowed.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
              {newStatus === 'cancelled' && (
                <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mb-4">
                  ⚠️ Cancelling cannot be undone.
                </p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setSelected(null)} className="btn-ghost flex-1">Cancel</button>
                <button
                  onClick={() => update.mutate({ orderId: selected.orderId, status: newStatus })}
                  disabled={update.isPending}
                  className={`flex-1 ${newStatus === 'cancelled' ? 'btn-danger' : 'btn-primary'}`}
                >
                  {update.isPending
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : `Mark as ${STATUS_LABELS[newStatus] || newStatus}`}
                </button>
              </div>
            </>
          )
        })()}
      </Modal>
    </div>
  )
}