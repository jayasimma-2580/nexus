/**
 * components/ui/ProductCard.jsx
 *
 * Fix Bug #14: Wishlist state was always false on load.
 * Now accepts an optional `isWishlisted` prop from parent so pages
 * that already have wishlist data can pass it down. Falls back to false.
 *
 * Used in: ShopPage (grid), WishlistPage, Landing featured section.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { cartAPI, wishlistAPI } from '../../api/client'
import { useAuthStore, useCartStore } from '../../store/authStore'

export default function ProductCard({ product, delay = 0, isWishlisted = false }) {
  // Initialise from prop so parent can pass the real state
  const [wishlisted, setWishlisted] = useState(isWishlisted)
  const [adding, setAdding] = useState(false)
  const { user } = useAuthStore()
  const { increment } = useCartStore()

  const img = product.images?.[0]?.url || null

  // Add product to cart (1 unit)
  async function handleAddToCart(e) {
    e.preventDefault() // prevent Link navigation
    if (!user) return toast.error('Sign in to add to cart')
    if (user.role !== 'buyer') return toast.error('Only buyers can add to cart')
    setAdding(true)
    try {
      await cartAPI.add(product._id, 1)
      increment()
      toast.success('Added to cart')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart')
    } finally {
      setAdding(false)
    }
  }

  // Toggle wishlist
  async function handleWishlist(e) {
    e.preventDefault()
    if (!user) return toast.error('Sign in to save to wishlist')
    if (user.role !== 'buyer') return
    try {
      if (wishlisted) {
        await wishlistAPI.remove(product._id)
        setWishlisted(false)
        toast.success('Removed from wishlist')
      } else {
        await wishlistAPI.add(product._id)
        setWishlisted(true)
        toast.success('Saved to wishlist')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Link to={`/shop/${product._id}`} className="group block card overflow-hidden hover:-translate-y-1">

        {/* ── Product image ────────────────────────────────────────────────── */}
        <div className="relative aspect-square bg-[var(--bg-tertiary)] overflow-hidden">
          {img ? (
            <img
              src={img}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
              <ShoppingCart size={32} strokeWidth={1} />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Wishlist button — slides in on hover */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 translate-x-8 group-hover:translate-x-0 transition-transform duration-300">
            <button
              onClick={handleWishlist}
              title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              className={`w-8 h-8 rounded-lg backdrop-blur-md flex items-center justify-center transition-all ${
                wishlisted
                  ? 'bg-red-500 text-white'
                  : 'bg-white/80 dark:bg-black/40 text-[var(--text-secondary)] hover:text-red-500'
              }`}
            >
              <Heart size={14} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Out of stock overlay */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
              <span className="badge badge-gray text-xs">Out of stock</span>
            </div>
          )}
        </div>

        {/* ── Product info ──────────────────────────────────────────────────── */}
        <div className="p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">
            {product.category?.name || 'Uncategorized'}
          </p>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-tight line-clamp-2 mb-2">
            {product.name}
          </h3>

          {/* Star rating */}
          <div className="flex items-center gap-1 mb-3">
            <Star size={12} className="text-amber-400 fill-amber-400" />
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {product.rating?.toFixed(1) || '0.0'}
            </span>
            <span className="text-xs text-[var(--text-muted)]">({product.numReviews || 0})</span>
          </div>

          {/* Price + add to cart */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-[var(--text-primary)]">
              ₹{product.price?.toLocaleString()}
            </span>
            <button
              onClick={handleAddToCart}
              disabled={adding || product.stock === 0}
              title="Add to cart"
              className="w-8 h-8 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center disabled:opacity-40 transition-all"
            >
              {adding
                ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                : <ShoppingCart size={13} />
              }
            </button>
          </div>

          {/* Seller name */}
          {product.seller?.shopName && (
            <p className="text-xs text-[var(--text-muted)] mt-1.5">by {product.seller.shopName}</p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
