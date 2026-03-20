/**
 * pages/buyer/CheckoutPage.jsx
 *
 * Shows a live order summary with tax + shipping calculated from the
 * platform config BEFORE the buyer places the order, so there are no
 * surprise charges after checkout.
 *
 * Fetches GET /api/orders/checkout-config to get taxRate, shippingCost,
 * and freeShippingThreshold, then mirrors the same computePrices logic
 * used in the backend so the preview is always accurate.
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MapPin, CreditCard, CheckCircle, Tag, Truck } from 'lucide-react'
import { cartAPI, orderAPI } from '../../api/client'
import { useCartStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

// Mirror the backend computePrices logic exactly so the preview matches
function computePrices(items, config) {
  const itemsPrice    = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const taxPrice      = Number((itemsPrice * (config.taxRate / 100)).toFixed(2))
  const shippingPrice = itemsPrice >= config.freeShippingThreshold ? 0 : config.shippingCost
  const totalPrice    = Number((itemsPrice + taxPrice + shippingPrice).toFixed(2))
  return { itemsPrice, taxPrice, shippingPrice, totalPrice }
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setCount } = useCartStore()

  const [shipping, setShipping] = useState({
    address: '', city: '', postalCode: '', country: '', phone: '',
  })
  const [payment, setPayment] = useState({ method: 'COD' })
  const [errors,  setErrors]  = useState({})

  // Fetch cart
  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn:  cartAPI.get,
  })
  const cart = cartData?.data?.data || { items: [], cartTotal: 0 }

  // Fetch platform config (tax rate, shipping cost, free shipping threshold)
  const { data: cfgData, isLoading: cfgLoading } = useQuery({
    queryKey: ['checkout-config'],
    queryFn:  orderAPI.getCheckoutConfig,
  })
  const config = cfgData?.data?.data || { taxRate: 0, shippingCost: 0, freeShippingThreshold: 0 }

  // Redirect if cart is empty (after loading)
  useEffect(() => {
    if (!cartLoading && cart.items.length === 0) {
      navigate('/cart', { replace: true })
    }
  }, [cartLoading, cart.items.length, navigate])

  // Live price breakdown using same formula as backend
  const prices = cart.items.length > 0
    ? computePrices(cart.items, config)
    : { itemsPrice: 0, taxPrice: 0, shippingPrice: 0, totalPrice: 0 }

  function validate() {
    const errs = {}
    if (!shipping.address.trim())    errs.address    = 'Address is required'
    if (!shipping.city.trim())       errs.city       = 'City is required'
    if (!shipping.postalCode.trim()) errs.postalCode = 'Postal code is required'
    if (!shipping.country.trim())    errs.country    = 'Country is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const place = useMutation({
    mutationFn: () => orderAPI.create({ shippingInfo: shipping, paymentInfo: payment }),
    onSuccess: (res) => {
      toast.success('Order placed successfully!')
      setCount(0)
      qc.invalidateQueries({ queryKey: ['cart'] })
      navigate(`/orders/${res.data.data._id}`)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to place order'),
  })

  if (cartLoading || cfgLoading || cart.items.length === 0) {
    return <div className="flex justify-center py-20"><Spinner size={32} /></div>
  }

  return (
    <div className="page-container py-10">
      <h1 className="section-heading text-3xl mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: shipping + payment */}
        <div className="lg:col-span-2 space-y-6">

          {/* Shipping address */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} className="text-[var(--accent)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Shipping address</h2>
            </div>

            <div>
              <input
                value={shipping.address}
                onChange={e => setShipping(s => ({ ...s, address: e.target.value }))}
                placeholder="Street address"
                className={`input ${errors.address ? 'error' : ''}`}
              />
              {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  value={shipping.city}
                  onChange={e => setShipping(s => ({ ...s, city: e.target.value }))}
                  placeholder="City"
                  className={`input ${errors.city ? 'error' : ''}`}
                />
                {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
              </div>
              <div>
                <input
                  value={shipping.postalCode}
                  onChange={e => setShipping(s => ({ ...s, postalCode: e.target.value }))}
                  placeholder="Postal code"
                  className={`input ${errors.postalCode ? 'error' : ''}`}
                />
                {errors.postalCode && <p className="text-xs text-red-500 mt-1">{errors.postalCode}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  value={shipping.country}
                  onChange={e => setShipping(s => ({ ...s, country: e.target.value }))}
                  placeholder="Country"
                  className={`input ${errors.country ? 'error' : ''}`}
                />
                {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country}</p>}
              </div>
              <input
                value={shipping.phone}
                onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))}
                placeholder="Phone (optional)"
                className="input"
              />
            </div>
          </div>

          {/* Payment method */}
          <div className="card p-6 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={18} className="text-[var(--accent)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Payment method</h2>
            </div>

            {[
              { method: 'COD',  label: 'Cash on Delivery',   badge: 'Most popular' },
              { method: 'Card', label: 'Credit / Debit Card', badge: null },
              { method: 'UPI',  label: 'UPI Payment',         badge: null },
            ].map(({ method, label, badge }) => (
              <button
                key={method}
                type="button"
                onClick={() => setPayment({ method })}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  payment.method === method
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] hover:border-[var(--border-hover)]'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  payment.method === method ? 'border-[var(--accent)]' : 'border-[var(--border)]'
                }`}>
                  {payment.method === method && (
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                  )}
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
                {badge && <span className="ml-auto badge badge-green text-xs">{badge}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Right: order summary with live tax + shipping */}
        <div className="card p-5 h-fit sticky top-20">
          <h2 className="font-semibold text-[var(--text-primary)] mb-4">Order summary</h2>

          {/* Item list */}
          <div className="space-y-2 mb-4">
            {cart.items.map(item => (
              <div key={item._id} className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)] truncate flex-1">
                  {item.name} ×{item.quantity}
                </span>
                <span className="text-[var(--text-primary)] font-medium ml-2">
                  ₹{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Price breakdown shown before placing */}
          <div className="border-t border-[var(--border)] pt-3 space-y-2 mb-5">
            <div className="flex justify-between text-sm text-[var(--text-secondary)]">
              <span>Subtotal</span>
              <span>₹{prices.itemsPrice.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <Tag size={12} /> Tax ({config.taxRate}%)
              </span>
              <span>₹{prices.taxPrice.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <Truck size={12} /> Shipping
              </span>
              {prices.shippingPrice === 0
                ? <span className="text-green-500 font-medium">Free</span>
                : <span>₹{prices.shippingPrice.toLocaleString()}</span>
              }
            </div>

            {prices.shippingPrice > 0 && (
              <p className="text-xs text-[var(--text-muted)]">
                Free shipping on orders above ₹{config.freeShippingThreshold.toLocaleString()}
              </p>
            )}

            <div className="flex justify-between font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border)]">
              <span>Total</span>
              <span>₹{prices.totalPrice.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={() => { if (validate()) place.mutate() }}
            disabled={place.isPending}
            className="btn-primary w-full justify-center gap-2 py-3"
          >
            {place.isPending
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <CheckCircle size={16} />
            }
            Place order
          </button>
        </div>
      </div>
    </div>
  )
}
