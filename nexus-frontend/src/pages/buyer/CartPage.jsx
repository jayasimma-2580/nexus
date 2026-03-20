import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cartAPI } from '../../api/client'
import { useCartStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

export default function CartPage() {
  const qc = useQueryClient()
  const { setCount } = useCartStore()

  const { data, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn:  cartAPI.get,
  })
  const cart = data?.data?.data || { items: [], cartTotal: 0 }

  // Keep navbar badge in sync
  useEffect(() => {
    setCount(cart.items?.length || 0)
  }, [cart.items?.length, setCount])

  // v5 syntax — old v4 array syntax qc.invalidateQueries(['cart']) silently fails
  // and causes the cart to never refresh → blank white screen after mutations
  function invalidateCart() {
    qc.invalidateQueries({ queryKey: ['cart'] })
  }

  const updateQty = useMutation({
    mutationFn: ({ productId, quantity }) => cartAPI.update(productId, quantity),
    onSuccess:  invalidateCart,
    onError:    e => toast.error(e.response?.data?.message || 'Failed to update'),
  })

  const removeItem = useMutation({
    mutationFn: (productId) => cartAPI.remove(productId),
    onSuccess:  () => { toast.success('Item removed'); invalidateCart() },
    onError:    e => toast.error(e.response?.data?.message || 'Failed to remove'),
  })

  const clearCart = useMutation({
    mutationFn: cartAPI.clear,
    onSuccess:  () => { toast.success('Cart cleared'); invalidateCart() },
    onError:    e => toast.error(e.response?.data?.message || 'Failed'),
  })

  if (isLoading) return (
    <div className="flex justify-center py-20"><Spinner size={32} /></div>
  )

  return (
    <div className="page-container py-10">
      <h1 className="section-heading text-3xl mb-8">Shopping cart</h1>

      {cart.items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Browse the shop and add something you like."
          action={<Link to="/shop" className="btn-primary gap-2">Browse products</Link>}
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Items list */}
          <div className="lg:col-span-2 space-y-3">
            {cart.items.map((item, i) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-4 flex gap-4"
              >
                <div className="w-20 h-20 rounded-xl bg-[var(--bg-tertiary)] overflow-hidden shrink-0">
                  {item.image
                    ? <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                    : <ShoppingCart size={24} className="m-auto mt-6 text-[var(--text-muted)]" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">{item.name}</h3>
                  <p className="text-sm font-bold text-[var(--accent)] mt-0.5">
                    ₹{item.price?.toLocaleString()} each
                  </p>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (item.quantity === 1) removeItem.mutate(item.product)
                          else updateQty.mutate({ productId: item.product, quantity: item.quantity - 1 })
                        }}
                        className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center hover:bg-[var(--accent-soft)] transition-all"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-[var(--text-primary)]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty.mutate({ productId: item.product, quantity: item.quantity + 1 })}
                        className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center hover:bg-[var(--accent-soft)] transition-all"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </span>

                    <button
                      onClick={() => removeItem.mutate(item.product)}
                      className="ml-auto p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            <button
              onClick={() => clearCart.mutate()}
              disabled={clearCart.isPending}
              className="btn-ghost text-sm gap-2 text-red-500 border-red-500/20 hover:bg-red-500/10"
            >
              <Trash2 size={14} /> Clear cart
            </button>
          </div>

          {/* Order summary */}
          <div className="card p-5 h-fit sticky top-20">
            <h2 className="font-semibold text-[var(--text-primary)] mb-4">Order summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Subtotal ({cart.items.length} item{cart.items.length !== 1 ? 's' : ''})</span>
                <span>₹{cart.cartTotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Shipping</span>
                <span className="text-green-500">Calculated at checkout</span>
              </div>
            </div>
            <div className="border-t border-[var(--border)] my-4" />
            <div className="flex justify-between font-bold text-[var(--text-primary)] mb-5">
              <span>Estimated total</span>
              <span>₹{cart.cartTotal?.toLocaleString()}</span>
            </div>
            <Link to="/checkout" className="btn-primary w-full justify-center gap-2">
              Proceed to checkout <ArrowRight size={16} />
            </Link>
            <Link to="/shop" className="block text-center text-sm text-[var(--text-muted)] hover:text-[var(--accent)] mt-3 transition-colors">
              Continue shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}