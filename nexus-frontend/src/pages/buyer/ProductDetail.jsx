/**
 * pages/buyer/ProductDetail.jsx
 *
 * Fixes:
 *   Bug #4  — wishlist button always showed "not wishlisted". Now fetches
 *             wishlist on mount to initialise the heart icon correctly.
 *   Bug #5  — Navbar/Footer were rendered here even though this page is
 *             a PUBLIC route (not inside BuyerLayout). Kept them here because
 *             /shop/:id is declared outside BuyerLayout in App.jsx.
 *   Misc    — review form only shown to buyers (sellers/admins can't review).
 *             Out-of-stock products show a clear disabled state.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ShoppingCart, Heart, Star, Package, Minus, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { productAPI, cartAPI, wishlistAPI, reviewAPI } from '../../api/client'
import { useAuthStore, useCartStore } from '../../store/authStore'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import toast from 'react-hot-toast'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { increment } = useCartStore()
  const qc = useQueryClient()

  const [qty, setQty] = useState(1)
  const [imgIdx, setImgIdx] = useState(0)
  const [review, setReview] = useState({ rating: 5, comment: '' })
  const [wishlisted, setWishlisted] = useState(false) // initialised from API below

  // Fetch product details
  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productAPI.getOne(id),
  })
  const product = data?.data?.data

  // Fetch reviews for this product
  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewAPI.getForProduct(id),
  })
  const reviews = reviewsData?.data?.data || []

  // Fix Bug #4: Initialise wishlist state from API on mount (only for buyers)
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: wishlistAPI.get,
    enabled: user?.role === 'buyer', // only fetch if logged in as buyer
  })
  useEffect(() => {
    if (!wishlistData) return
    // Wishlist model stores products[] array of ObjectIds or populated objects
    const products = wishlistData?.data?.data?.products || []
    const isInWishlist = products.some(p => {
      const pid = typeof p === 'object' ? (p._id || p.product?._id) : p
      return pid?.toString() === id
    })
    setWishlisted(isInWishlist)
  }, [wishlistData, id])

  // Add to cart mutation
  const addToCart = useMutation({
    mutationFn: () => cartAPI.add(id, qty),
    onSuccess: () => { increment(); qc.invalidateQueries({ queryKey: ['cart'] }); toast.success('Added to cart') },
    onError: e => toast.error(e.response?.data?.message || 'Failed to add to cart'),
  })

  // Submit review mutation
  const addReview = useMutation({
    mutationFn: (data) => reviewAPI.addOrUpdate(data),
    onSuccess: () => {
      toast.success('Review submitted!')
      setReview({ rating: 5, comment: '' })
      qc.invalidateQueries({ queryKey: ['reviews', id] })
      qc.invalidateQueries({ queryKey: ['product', id] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to submit review'),
  })

  // Toggle wishlist mutation
  const toggleWishlist = useMutation({
    mutationFn: () => wishlisted ? wishlistAPI.remove(id) : wishlistAPI.add(id),
    onSuccess: () => {
      const nowWishlisted = !wishlisted
      setWishlisted(nowWishlisted)
      toast.success(nowWishlisted ? 'Added to wishlist' : 'Removed from wishlist')
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  // Loading / not found states
  if (isLoading) return (
    <>
      <Navbar />
      <div className="flex justify-center py-20"><Spinner size={32} /></div>
      <Footer />
    </>
  )
  if (!product) return (
    <>
      <Navbar />
      <div className="page-container py-20 text-center text-[var(--text-muted)]">
        Product not found.
      </div>
      <Footer />
    </>
  )

  const images = product.images || []
  const currentImage = images[imgIdx]?.url

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 page-container py-10">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="grid lg:grid-cols-2 gap-10 mb-12">
          {/* ── Image gallery ─────────────────────────────────────────────── */}
          <div>
            <div className="aspect-square rounded-2xl bg-[var(--bg-tertiary)] overflow-hidden mb-3">
              {currentImage
                ? <img src={currentImage} className="w-full h-full object-cover" alt={product.name} />
                : <Package size={48} className="m-auto mt-32 text-[var(--text-muted)]" />
              }
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((im, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      i === imgIdx ? 'border-[var(--accent)]' : 'border-transparent'
                    }`}
                  >
                    <img src={im.url} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product info ──────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="gray">{product.category?.name || 'Uncategorized'}</Badge>
              <Badge status={product.stock > 0 ? 'approved' : 'rejected'}>
                {product.stock > 0 ? 'In stock' : 'Out of stock'}
              </Badge>
            </div>

            <h1 className="section-heading text-3xl mb-2">{product.name}</h1>

            {/* Star rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    size={16}
                    className={s <= Math.round(product.rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-[var(--border)]'}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {product.rating?.toFixed(1)} ({product.numReviews} review{product.numReviews !== 1 ? 's' : ''})
              </span>
            </div>

            <p className="text-3xl font-bold text-[var(--text-primary)] mb-1">
              ₹{product.price?.toLocaleString()}
            </p>
            {product.seller?.shopName && (
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Sold by <span className="font-medium text-[var(--text-primary)]">{product.seller.shopName}</span>
              </p>
            )}
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              {product.description}
            </p>

            {/* Add to cart — only for logged-in buyers with in-stock product */}
            {user?.role === 'buyer' && product.stock > 0 && (
              <div className="space-y-3">
                {/* Qty selector */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center hover:bg-[var(--accent-soft)] transition-all"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center font-semibold text-[var(--text-primary)]">{qty}</span>
                    <button
                      onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                      className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center hover:bg-[var(--accent-soft)] transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-sm text-[var(--text-muted)]">{product.stock} available</span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => addToCart.mutate()}
                    disabled={addToCart.isPending}
                    className="btn-primary flex-1 py-3 gap-2"
                  >
                    {addToCart.isPending
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <ShoppingCart size={16} />
                    }
                    Add to cart
                  </button>
                  <button
                    onClick={() => toggleWishlist.mutate()}
                    disabled={toggleWishlist.isPending}
                    className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all ${
                      wishlisted
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:text-red-500 hover:border-red-500/30'
                    }`}
                  >
                    <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            )}

            {/* Guest prompt */}
            {!user && product.stock > 0 && (
              <p className="text-sm text-[var(--text-muted)] mt-4">
                <a href="/login" className="text-[var(--accent)] font-medium hover:underline">Sign in</a> to add to cart or wishlist.
              </p>
            )}
          </div>
        </div>

        {/* ── Reviews section ───────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">
            Reviews ({reviews.length})
          </h2>

          {/* Write a review — only buyers */}
          {user?.role === 'buyer' && (
            <div className="card p-5 mb-6">
              <h3 className="font-semibold text-[var(--text-primary)] mb-3">Write a review</h3>
              {/* Star picker */}
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setReview(r => ({ ...r, rating: s }))}
                    className="text-amber-400 hover:scale-110 transition-transform"
                  >
                    <Star size={22} fill={s <= review.rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <textarea
                value={review.comment}
                onChange={e => setReview(r => ({ ...r, comment: e.target.value }))}
                rows={3}
                placeholder="Share your experience with this product…"
                className="input resize-none mb-3"
              />
              <button
                onClick={() => addReview.mutate({ productId: id, ...review })}
                disabled={addReview.isPending || !review.comment.trim()}
                className="btn-primary gap-2"
              >
                {addReview.isPending
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : null
                }
                Submit review
              </button>
            </div>
          )}

          {/* Review list */}
          <div className="space-y-4">
            {reviews.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">No reviews yet. Be the first!</p>
            )}
            {reviews.map((r, i) => (
              <motion.div
                key={r._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{r.buyer?.name || 'Anonymous'}</p>
                    <div className="flex gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          size={12}
                          className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-[var(--border)]'}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-2">{r.comment}</p>
                {/* Seller reply */}
                {r.sellerReply?.comment && (
                  <div className="mt-3 ml-4 pl-3 border-l-2 border-[var(--accent-soft)]">                    <p className="text-xs font-semibold text-[var(--accent)] mb-0.5">Seller reply</p>
                    <p className="text-sm text-[var(--text-secondary)]">{r.sellerReply.comment}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{new Date(r.sellerReply.repliedAt).toLocaleDateString()}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
