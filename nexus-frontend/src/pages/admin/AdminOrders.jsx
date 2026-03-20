import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingBag, ChevronDown, Search, Eye,
  Package, MapPin, CreditCard, X
} from 'lucide-react'
import { orderAPI } from '../../api/client'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'

const STATUS_LABELS = {
  pending:           'Pending',
  processing:        'Processing',
  partially_shipped: 'Partially Shipped',
  shipped:           'Shipped',
  delivered:         'Delivered',
  cancelled:         'Cancelled',
}

const ALL_STATUSES = ['pending','processing','partially_shipped','shipped','delivered','cancelled']

export default function AdminOrders() {
  const [page, setPage]               = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchId, setSearchId]       = useState('')
  const [viewOrder, setViewOrder]     = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, statusFilter],
    queryFn:  () => orderAPI.getAll({ page, limit: 20, status: statusFilter || undefined }),
  })

  const orders = data?.data?.data || []
  const meta   = data?.data?.meta || {}

  // Client-side search by short 8-char order ID
  const filtered = useMemo(() => {
    if (!searchId.trim()) return orders
    const q = searchId.trim().toUpperCase().replace(/^#/, '')
    return orders.filter(o => o._id.slice(-8).toUpperCase().includes(q))
  }, [orders, searchId])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Orders</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {meta.total || 0} total orders — view only
        </p>
      </div>

      {/* Search + filter row */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={searchId}
            onChange={e => { setSearchId(e.target.value); setPage(1) }}
            placeholder="Search by order ID (e.g. AB12CD34)…"
            className="input pl-9 py-2 text-sm"
          />
          {searchId && (
            <button
              onClick={() => setSearchId('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="input appearance-none pr-9 text-sm py-2 min-w-40"
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={searchId ? `No orders matching "${searchId}"` : 'No orders found'}
          description={searchId ? 'Try a different order ID.' : 'No orders match the current filter.'}
        />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-[var(--bg-tertiary)]">
              <tr>
                {['Order ID','Buyer','Items','Total','Status','Date','Details'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o._id} className="border-t border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                    #{o._id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--text-primary)]">{o.buyer?.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{o.buyer?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {o.orderItems?.length} item{o.orderItems?.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 font-bold text-[var(--text-primary)]">
                    ₹{o.totalPrice?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={o.orderStatus}>
                      {STATUS_LABELS[o.orderStatus] || o.orderStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setViewOrder(o)}
                      className="flex items-center gap-1.5 btn-secondary py-1 px-3 text-xs"
                    >
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={meta.page || 1} pages={meta.pages || 1} onPageChange={setPage} />

      {/* Order detail modal */}
      <Modal
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        title={`Order #${viewOrder?._id?.slice(-8).toUpperCase()}`}
        size="lg"
      >
        {viewOrder && (
          <div className="space-y-5">

            {/* Status + date + buyer */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <Badge status={viewOrder.orderStatus}>
                  {STATUS_LABELS[viewOrder.orderStatus] || viewOrder.orderStatus}
                </Badge>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Placed on {new Date(viewOrder.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--text-muted)]">Buyer</p>
                <p className="font-semibold text-[var(--text-primary)]">{viewOrder.buyer?.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{viewOrder.buyer?.email}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3">
                <Package size={14} className="text-[var(--accent)]" /> Items
              </h3>
              <div className="space-y-2">
                {viewOrder.orderItems?.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Qty: {item.quantity} · ₹{item.price?.toLocaleString()} each
                        {item.seller?.shopName && ` · by ${item.seller.shopName}`}
                      </p>
                    </div>
                    <span className="font-semibold text-[var(--text-primary)] shrink-0">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price breakdown */}
              <div className="mt-3 space-y-1 text-sm border-t border-[var(--border)] pt-3">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Items subtotal</span>
                  <span>₹{viewOrder.itemsPrice?.toLocaleString()}</span>
                </div>
                {viewOrder.taxPrice > 0 && (
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Tax</span><span>₹{viewOrder.taxPrice?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Shipping</span>
                  <span>{viewOrder.shippingPrice === 0 ? 'Free' : `₹${viewOrder.shippingPrice}`}</span>
                </div>
                <div className="flex justify-between font-bold text-[var(--text-primary)] pt-1 border-t border-[var(--border)]">
                  <span>Total</span>
                  <span>₹{viewOrder.totalPrice?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>Platform commission</span>
                  <span>₹{viewOrder.totalCommission?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Shipping + payment */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card p-4 space-y-1">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                  <MapPin size={13} className="text-[var(--accent)]" /> Shipping address
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">{viewOrder.shippingInfo?.address}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {viewOrder.shippingInfo?.city}, {viewOrder.shippingInfo?.postalCode}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">{viewOrder.shippingInfo?.country}</p>
                {viewOrder.shippingInfo?.phone && (
                  <p className="text-sm text-[var(--text-muted)]">📞 {viewOrder.shippingInfo.phone}</p>
                )}
              </div>

              <div className="card p-4 space-y-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                  <CreditCard size={13} className="text-[var(--accent)]" /> Payment
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Method: <span className="font-medium text-[var(--text-primary)]">
                    {viewOrder.paymentInfo?.method || 'COD'}
                  </span>
                </p>
                <Badge variant={viewOrder.isPaid ? 'green' : 'yellow'}>
                  {viewOrder.isPaid ? '✓ Paid' : 'Payment pending'}
                </Badge>
                {viewOrder.isPaid && viewOrder.paidAt && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Paid on {new Date(viewOrder.paidAt).toLocaleDateString()}
                  </p>
                )}
                {viewOrder.deliveredAt && (
                  <p className="text-xs text-green-500">
                    Delivered on {new Date(viewOrder.deliveredAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Seller sub-orders */}
            {viewOrder.sellerSubOrders?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                  Seller fulfillment
                </h3>
                <div className="space-y-2">
                  {viewOrder.sellerSubOrders.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg text-sm flex-wrap gap-2">
                      <div>
                        <Badge status={sub.status}>{sub.status}</Badge>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          Gross: ₹{sub.grossAmount?.toLocaleString()} · Commission: ₹{sub.commissionAmount?.toLocaleString()} · Net: ₹{sub.netEarnings?.toLocaleString()}
                        </p>
                      </div>
                      {sub.shippedAt && (
                        <p className="text-xs text-[var(--text-muted)]">
                          Shipped: {new Date(sub.shippedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[var(--border)]">
              <button onClick={() => setViewOrder(null)} className="btn-ghost px-6">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}