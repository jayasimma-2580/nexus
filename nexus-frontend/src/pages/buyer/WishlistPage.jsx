/**
 * pages/buyer/WishlistPage.jsx
 *
 * Wishlist page for buyers. Rendered inside BuyerLayout — no Navbar/Footer.
 *
 * The Wishlist model stores products[] as an array of ObjectIds (or populated
 * Product objects). The backend's getWishlist populates the products array,
 * so items here are full product objects (not wrapped in an .items key).
 *
 * Fixed: correct data path — was reading data.items, backend returns data.products
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { wishlistAPI, cartAPI } from '../../api/client'
import { useCartStore } from '../../store/authStore'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

export default function WishlistPage() {
  const qc = useQueryClient()
  const { increment } = useCartStore()

  // Fetch the wishlist
  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: wishlistAPI.get,
  })

  // Backend returns: { success, data: { buyer, products: [...] } }
  // products[] contains populated Product objects
  const items = data?.data?.data?.products || []

  // Remove a product from wishlist
  const remove = useMutation({
    mutationFn: (productId) => wishlistAPI.remove(productId),
    onSuccess: () => {
      toast.success('Removed from wishlist')
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to remove'),
  })

  // Move a product from wishlist to cart
  const addToCart = useMutation({
    mutationFn: (productId) => cartAPI.add(productId, 1),
    onSuccess: (_, productId) => {
      toast.success('Added to cart')
      increment()
      qc.invalidateQueries({ queryKey: ['cart'] })
      // Remove from wishlist after adding to cart
      remove.mutate(productId)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to add to cart'),
  })

  if (isLoading) return (
    <div className="flex justify-center py-20"><Spinner size={32} /></div>
  )

  return (
    <div className="page-container py-10">
      <h1 className="section-heading text-3xl mb-8">
        Wishlist
        {items.length > 0 && (
          <span className="ml-3 text-base font-normal text-[var(--text-muted)]">
            ({items.length} item{items.length !== 1 ? 's' : ''})
          </span>
        )}
      </h1>

      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save products you love and come back to buy them later."
          action={<Link to="/shop" className="btn-primary">Browse shop</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(product => {
            // product may be a full Product object or just an ID
            if (!product || !product._id) return null
            return (
              <div key={product._id} className="card p-4">
                {/* Product image */}
                <Link to={`/shop/${product._id}`} className="block aspect-square rounded-xl bg-[var(--bg-tertiary)] overflow-hidden mb-3">
                  {product.images?.[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      alt={product.name}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                      <Heart size={32} strokeWidth={1} />
                    </div>
                  )}
                </Link>

                {/* Product info */}
                <Link to={`/shop/${product._id}`}>
                  <h3 className="font-semibold text-[var(--text-primary)] truncate hover:text-[var(--accent)] transition-colors">
                    {product.name}
                  </h3>
                </Link>
                {product.seller?.shopName && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">by {product.seller.shopName}</p>
                )}
                <p className="font-bold text-[var(--accent)] mt-1">
                  ₹{product.price?.toLocaleString()}
                </p>

                {/* Stock indicator */}
                {product.stock === 0 && (
                  <p className="text-xs text-red-500 mt-0.5">Out of stock</p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => addToCart.mutate(product._id)}
                    disabled={addToCart.isPending || product.stock === 0}
                    className="btn-primary flex-1 py-2 text-sm gap-1.5"
                  >
                    {addToCart.isPending
                      ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                      : <ShoppingCart size={13} />
                    }
                    Add to cart
                  </button>
                  <button
                    onClick={() => remove.mutate(product._id)}
                    disabled={remove.isPending}
                    title="Remove from wishlist"
                    className="btn-ghost p-2 text-red-500 border-red-500/20 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
