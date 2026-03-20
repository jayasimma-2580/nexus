/**
 * pages/buyer/OrderDetail.jsx
 *
 * Shows full order details for a buyer.
 * - Price breakdown: items, tax, shipping, total
 * - Cancel button: visible only when orderStatus === "pending"
 *   Calls PUT /api/orders/:id/cancel — backend restores stock and marks cancelled.
 */

import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MapPin, CreditCard, Package, XCircle } from 'lucide-react'
import { orderAPI } from '../../api/client'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

export default function OrderDetail() {
  const { id } = useParams()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderAPI.getOne(id),
  })
  const order = data?.data?.data

  const cancel = useMutation({
    mutationFn: () => orderAPI.cancel(id),
    onSuccess: () => {
      toast.success('Order cancelled successfully')
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['my-orders'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Could not cancel order'),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>

  if (!order) return (
    <div className="page-container py-20 text-center text-[var(--text-muted)]">
      Order not found.
    </div>
  )

  const canCancel = order.orderStatus === 'pending'

  return (
    <div className="page-container py-10 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/orders"
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-all"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Order #{order._id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
          </p>
        </div>
        <Badge status={order.orderStatus} className="ml-auto">
          {order.orderStatus?.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Items + price breakdown */}
      <div className="card p-5 mb-4 space-y-3">
        <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Package size={16} className="text-[var(--accent)]" /> Items
        </h2>

        {order.orderItems?.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
            {item.image && (
              <img src={item.image} className="w-12 h-12 rounded-lg object-cover shrink-0" alt={item.name} />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--text-primary)] truncate">{item.name}</p>
              <p className="text-xs text-[var(--text-muted)]">
                Qty: {item.quantity} · ₹{item.price?.toLocaleString()} each
              </p>
              {item.seller?.shopName && (
                <p className="text-xs text-[var(--text-muted)]">by {item.seller.shopName}</p>
              )}
            </div>
            <span className="font-bold text-[var(--text-primary)] shrink-0">
              ₹{(item.price * item.quantity).toLocaleString()}
            </span>
          </div>
        ))}

        {/* Price breakdown */}
        <div className="space-y-1 pt-2 border-t border-[var(--border)] text-sm">
          <div className="flex justify-between text-[var(--text-secondary)]">
            <span>Subtotal</span><span>₹{order.itemsPrice?.toLocaleString()}</span>
          </div>
          {order.taxPrice > 0 && (
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Tax</span><span>₹{order.taxPrice?.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-[var(--text-secondary)]">
            <span>Shipping</span>
            {order.shippingPrice === 0
              ? <span className="text-green-500">Free</span>
              : <span>₹{order.shippingPrice?.toLocaleString()}</span>
            }
          </div>
          <div className="flex justify-between font-bold text-[var(--text-primary)] pt-1 border-t border-[var(--border)]">
            <span>Total</span><span>₹{order.totalPrice?.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Shipping + Payment */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="card p-5 space-y-1">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-[var(--accent)]" /> Shipping address
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">{order.shippingInfo?.address}</p>
          <p className="text-sm text-[var(--text-secondary)]">
            {order.shippingInfo?.city}, {order.shippingInfo?.postalCode}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">{order.shippingInfo?.country}</p>
          {order.shippingInfo?.phone && (
            <p className="text-sm text-[var(--text-secondary)]">📞 {order.shippingInfo.phone}</p>
          )}
        </div>

        <div className="card p-5 space-y-2">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-[var(--accent)]" /> Payment
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Method: <span className="font-medium text-[var(--text-primary)]">
              {order.paymentInfo?.method || 'COD'}
            </span>
          </p>
          <Badge variant={order.isPaid ? 'green' : 'yellow'}>
            {order.isPaid ? '✓ Paid' : 'Payment pending'}
          </Badge>
          {order.isPaid && order.paidAt && (
            <p className="text-xs text-[var(--text-muted)]">
              Paid on {new Date(order.paidAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Cancel button — only shown when order is still pending */}
      {canCancel && (
        <div className="card p-5 border-red-500/20">
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">Cancel order</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            You can cancel this order because it hasn't been processed yet. Stock will be restored automatically.
          </p>
          <button
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-red-500/30 text-red-500 text-sm font-medium hover:bg-red-500/10 transition-all disabled:opacity-50"
          >
            {cancel.isPending
              ? <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
              : <XCircle size={16} />
            }
            Cancel this order
          </button>
        </div>
      )}
    </div>
  )
}
