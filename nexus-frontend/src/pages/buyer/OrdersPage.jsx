/**
 * pages/buyer/OrdersPage.jsx
 *
 * Lists all orders for the logged-in buyer. Rendered inside BuyerLayout.
 * Clean render — no Navbar/Footer (provided by layout).
 */

import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { orderAPI } from '../../api/client'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: orderAPI.getMy,
  })
  const orders = data?.data?.data || []

  if (isLoading) return (
    <div className="flex justify-center py-20"><Spinner size={32} /></div>
  )

  return (
    <div className="page-container py-10">
      <h1 className="section-heading text-3xl mb-8">
        My orders
        {orders.length > 0 && (
          <span className="ml-3 text-base font-normal text-[var(--text-muted)]">
            ({orders.length})
          </span>
        )}
      </h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="Place your first order from the shop."
          action={<Link to="/shop" className="btn-primary">Start shopping</Link>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order, i) => (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/orders/${order._id}`}
                className="card p-5 flex items-center gap-4 hover:border-[var(--border-hover)] block transition-all"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center shrink-0">
                  <ShoppingBag size={20} className="text-[var(--accent)]" />
                </div>

                {/* Order info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-mono text-sm text-[var(--text-muted)]">
                      #{order._id.slice(-8).toUpperCase()}
                    </p>
                    <Badge status={order.orderStatus}>
                      {order.orderStatus?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                    {order.orderItems?.length || 0} item{order.orderItems?.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </p>
                </div>

                {/* Price + chevron */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-[var(--text-primary)]">
                    ₹{order.totalPrice?.toLocaleString()}
                  </p>
                  <ChevronRight size={16} className="text-[var(--text-muted)] mt-1 ml-auto" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
