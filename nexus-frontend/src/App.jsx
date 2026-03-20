/**
 * App.jsx — Root application component
 *
 * Sets up routing for all three user roles:
 *   - Public routes (landing, shop, auth)
 *   - Buyer routes (inside BuyerLayout with Navbar + Footer)
 *   - Seller routes (inside SellerLayout with sidebar)
 *   - Admin routes  (inside AdminLayout with sidebar)
 *
 * All routes use React.lazy + Suspense for code-splitting.
 * ProtectedRoute handles auth + role gating.
 */

import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useThemeStore } from './store/authStore'
import PageLoader from './components/ui/PageLoader'
import ProtectedRoute from './components/shared/ProtectedRoute'

// ── Lazy-loaded pages (split into separate JS chunks) ────────────────────────
const AuthPage        = lazy(() => import('./pages/auth/AuthPage'))
const VerifyEmail     = lazy(() => import('./pages/auth/VerifyEmail'))
const ForgotPassword  = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword   = lazy(() => import('./pages/auth/ResetPassword'))
const Landing         = lazy(() => import('./pages/Landing'))
const ShopPage        = lazy(() => import('./pages/buyer/ShopPage'))
const ProductDetail   = lazy(() => import('./pages/buyer/ProductDetail'))
const BuyerLayout     = lazy(() => import('./components/layout/BuyerLayout'))
const CartPage        = lazy(() => import('./pages/buyer/CartPage'))
const WishlistPage    = lazy(() => import('./pages/buyer/WishlistPage'))
const CheckoutPage    = lazy(() => import('./pages/buyer/CheckoutPage'))
const OrdersPage      = lazy(() => import('./pages/buyer/OrdersPage'))
const OrderDetail     = lazy(() => import('./pages/buyer/OrderDetail'))
const ProfilePage     = lazy(() => import('./pages/ProfilePage'))
const SellerLayout    = lazy(() => import('./components/layout/SellerLayout'))
const SellerDashboard = lazy(() => import('./pages/seller/SellerDashboard'))
const SellerProducts  = lazy(() => import('./pages/seller/SellerProducts'))
const SellerAddProduct= lazy(() => import('./pages/seller/SellerAddProduct'))
const SellerOrders    = lazy(() => import('./pages/seller/SellerOrders'))
const SellerProfile   = lazy(() => import('./pages/seller/SellerProfile'))
const SellerReviews   = lazy(() => import('./pages/seller/SellerReviews'))
const BuyerReviews    = lazy(() => import('./pages/buyer/ReviewsPage'))
const AdminLayout     = lazy(() => import('./components/layout/AdminLayout'))
const AdminDashboard  = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminSellers    = lazy(() => import('./pages/admin/AdminSellers'))
const AdminProducts   = lazy(() => import('./pages/admin/AdminProducts'))
const AdminOrders     = lazy(() => import('./pages/admin/AdminOrders'))
const AdminUsers      = lazy(() => import('./pages/admin/AdminUsers'))
const AdminConfig     = lazy(() => import('./pages/admin/AdminConfig'))
const NotFound        = lazy(() => import('./pages/error/NotFound'))
const Unauthorized    = lazy(() => import('./pages/error/Unauthorized'))
const ServerError     = lazy(() => import('./pages/error/ServerError'))
const SellerPending   = lazy(() => import('./pages/error/SellerPending'))

export default function App() {
  const { initTheme } = useThemeStore()

  // Apply saved or system-preferred theme on first render
  useEffect(() => { initTheme() }, [initTheme])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── Public routes ─────────────────────────────────────────────── */}
          <Route path="/"                        element={<Landing />} />
          {/* Both /login and /register render AuthPage — it uses useLocation to detect mode */}
          <Route path="/login"                   element={<AuthPage />} />
          <Route path="/register"                element={<AuthPage />} />
          {/* verify-email: shows OTP instructions (backend is OTP-only, not link-based) */}
          <Route path="/verify-email/:token"     element={<VerifyEmail />} />
          <Route path="/forgot-password"         element={<ForgotPassword />} />
          <Route path="/reset-password/:token"   element={<ResetPassword />} />
          {/* Shop is public — anyone can browse */}
          <Route path="/shop"                    element={<ShopPage />} />
          <Route path="/shop/:id"                element={<ProductDetail />} />
          {/* Error pages */}
          <Route path="/unauthorized"            element={<Unauthorized />} />
          <Route path="/server-error"            element={<ServerError />} />
          <Route path="/seller-pending"          element={<SellerPending />} />

          {/* ── Buyer routes (auth required, role = buyer) ─────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['buyer']} />}>
            <Route element={<BuyerLayout />}>
              <Route path="/cart"       element={<CartPage />} />
              <Route path="/wishlist"   element={<WishlistPage />} />
              <Route path="/checkout"   element={<CheckoutPage />} />
              <Route path="/orders"     element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/profile"    element={<ProfilePage />} />
              <Route path="/reviews"    element={<BuyerReviews />} />
            </Route>
          </Route>

          {/* ── Seller routes (auth + approved seller) ────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['seller']} requireApproved />}>
            <Route element={<SellerLayout />}>
              <Route path="/seller"              element={<SellerDashboard />} />
              <Route path="/seller/products"     element={<SellerProducts />} />
              <Route path="/seller/products/new" element={<SellerAddProduct />} />
              <Route path="/seller/products/:id" element={<SellerAddProduct />} />
              <Route path="/seller/orders"       element={<SellerOrders />} />
              <Route path="/seller/profile"      element={<SellerProfile />} />
              <Route path="/seller/reviews"      element={<SellerReviews />} />
            </Route>
          </Route>

          {/* ── Admin routes (auth + role = admin) ────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin"          element={<AdminDashboard />} />
              <Route path="/admin/sellers"  element={<AdminSellers />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/orders"   element={<AdminOrders />} />
              <Route path="/admin/users"    element={<AdminUsers />} />
              <Route path="/admin/config"   element={<AdminConfig />} />
              <Route path="/admin/profile"  element={<ProfilePage />} />
            </Route>
          </Route>

          {/* ── 404 fallback ──────────────────────────────────────────────── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
