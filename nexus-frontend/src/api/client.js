/**
 * api/client.js — Centralized Axios instance + all API method wrappers
 *
 * - Reads JWT from Zustand persisted localStorage automatically
 * - Intercepts 401 → clears auth state and redirects to /login
 * - Intercepts 5xx → shows a generic toast error
 *
 * Exports:
 *   default (api)   — raw Axios instance
 *   authAPI         — auth endpoints
 *   userAPI         — profile management
 *   categoryAPI     — category CRUD
 *   productAPI      — product CRUD + approval
 *   cartAPI         — shopping cart
 *   wishlistAPI     — wishlist
 *   orderAPI        — order placement + status
 *   reviewAPI       — product reviews
 *   adminAPI        — admin actions
 *   analyticsAPI    — seller + admin analytics
 */

import axios from 'axios'
import toast from 'react-hot-toast'

// Base instance — uses VITE_API_URL in production, proxied /api in dev
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach JWT from localStorage ────────────────────────
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('nexus-auth')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    }
  } catch {
    // localStorage parse failure — ignore, request proceeds without token
  }
  return config
})

// ── Response interceptor: handle auth + server errors globally ───────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    if (status === 401) {
      // Clear persisted auth and redirect to login
      localStorage.removeItem('nexus-auth')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?session=expired'
      }
    } else if (status >= 500) {
      toast.error('Server error. Please try again later.')
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth endpoints ────────────────────────────────────────────────────────────
export const authAPI = {
  register:          (data)                      => api.post('/auth/register', data),
  login:             (data)                      => api.post('/auth/login', data),
  logout:            ()                          => api.post('/auth/logout'),
  getMe:             ()                          => api.get('/auth/me'),
  verifyOtp:         (email, otp)                => api.post('/auth/verify-otp', { email, otp }),
  resendOtp:         (email)                     => api.post('/auth/resend-otp', { email }),
  sendPhoneOtp:      ()                          => api.post('/auth/send-phone-otp'),
  verifyPhoneOtp:    (otp)                       => api.post('/auth/verify-phone-otp', { otp }),
  forgotPassword:    (email)                     => api.post('/auth/forgot-password', { email }),
  verifyResetOtp:    (email, otp)                => api.post('/auth/verify-reset-otp', { email, otp }),
  resetPassword:     (resetToken, email, password) => api.post('/auth/reset-password', { resetToken, email, password }),
}

// ── User / profile endpoints ──────────────────────────────────────────────────
export const userAPI = {
  getProfile:     ()     => api.get('/user/me'),
  updateProfile:  (data) => api.put('/user/me', data),
  changePassword: (data) => api.put('/user/change-password', data),
}

// ── Category endpoints ────────────────────────────────────────────────────────
export const categoryAPI = {
  getAll:  ()          => api.get('/categories'),
  getOne:  (id)        => api.get(`/categories/${id}`),
  create:  (data)      => api.post('/categories', data),
  update:  (id, data)  => api.put(`/categories/${id}`, data),
  delete:  (id)        => api.delete(`/categories/${id}`),
}

// ── Product endpoints ─────────────────────────────────────────────────────────
export const productAPI = {
  getAll:     (params)       => api.get('/products', { params }),
  getOne:     (id)           => api.get(`/products/${id}`),
  getMy:      (params)       => api.get('/products/my', { params }),
  getPending: ()             => api.get('/products/pending'),
  create:     (data)         => api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:     (id, data)     => api.put(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete:     (id)           => api.delete(`/products/${id}`),
  approve:    (id)           => api.put(`/products/${id}/approve`),
  reject:     (id, reason)   => api.put(`/products/${id}/reject`, { reason }),
}

// ── Cart endpoints ────────────────────────────────────────────────────────────
export const cartAPI = {
  get:    ()                    => api.get('/cart'),
  add:    (productId, quantity) => api.post('/cart', { productId, quantity }),
  update: (productId, quantity) => api.put('/cart/item', { productId, quantity }),
  remove: (productId)           => api.delete(`/cart/item/${productId}`),
  clear:  ()                    => api.delete('/cart/clear'),
}

// ── Wishlist endpoints ────────────────────────────────────────────────────────
export const wishlistAPI = {
  get:    ()          => api.get('/wishlist'),
  add:    (productId) => api.post('/wishlist', { productId }),
  remove: (productId) => api.delete(`/wishlist/item/${productId}`),
  clear:  ()          => api.delete('/wishlist'),
  // Check if a single product is wishlisted — used to initialise button state
  check:  (productId) => api.get('/wishlist').then(res => {
    const items = res.data?.data?.products || res.data?.data?.items || []
    return items.some(p => (p._id || p.product?._id || p) === productId)
  }),
}

// ── Order endpoints ───────────────────────────────────────────────────────────
export const orderAPI = {
  create:             (data)           => api.post('/orders', data),
  getMy:              ()               => api.get('/orders/my'),
  getSeller:          ()               => api.get('/orders/seller'),
  getAll:             (params)         => api.get('/orders', { params }),
  getOne:             (id)             => api.get(`/orders/${id}`),
  updateStatus:       (id, status)     => api.put(`/orders/${id}/status`, { status }),
  updateSellerStatus: (orderId, status)=> api.put(`/orders/${orderId}/seller-status`, { status }),
  cancel:             (id)             => api.put(`/orders/${id}/cancel`),
  getCheckoutConfig:  ()               => api.get('/orders/checkout-config'),
}

// ── Review endpoints ──────────────────────────────────────────────────────────
export const reviewAPI = {
  getForProduct:  (productId) => api.get(`/reviews/product/${productId}`),
  addOrUpdate:    (data)      => api.post('/reviews', data),
  delete:         (id)        => api.delete(`/reviews/${id}`),
  getMyReviews:   ()          => api.get('/reviews/my'),
  getSellerReviews: ()        => api.get('/reviews/seller'),
  addReply:       (id, comment) => api.put(`/reviews/${id}/reply`, { comment }),
  deleteReply:    (id)        => api.delete(`/reviews/${id}/reply`),
}

// ── Admin endpoints ───────────────────────────────────────────────────────────
export const adminAPI = {
  getSellers:      (status)       => api.get('/admin/sellers', { params: { status } }),
  approveSeller:   (id)           => api.put(`/admin/sellers/${id}/approve`),
  rejectSeller:    (id, reason)   => api.put(`/admin/sellers/${id}/reject`, { reason }),
  suspendSeller:   (id, reason)   => api.put(`/admin/sellers/${id}/suspend`, { reason }),
  banSeller:       (id, reason)   => api.put(`/admin/sellers/${id}/ban`, { reason }),
  reinstateSeller: (id)           => api.put(`/admin/sellers/${id}/reinstate`),
  setCommission:   (id, rate)     => api.put(`/admin/sellers/${id}/commission`, { commissionRate: rate }),
  getUsers:        (role)         => api.get('/admin/users', { params: { role } }),
  deleteUser:      (id)           => api.delete(`/admin/users/${id}`),
  getConfig:       ()             => api.get('/admin/config'),
  updateConfig:    (data)         => api.put('/admin/config', data),
}

// ── Analytics endpoints ───────────────────────────────────────────────────────
export const analyticsAPI = {
  adminOverview:     ()     => api.get('/admin/analytics/overview'),
  adminMonthly:      (year) => api.get('/admin/analytics/sales/monthly', { params: { year } }),
  adminTopSellers:   ()     => api.get('/admin/analytics/top-sellers'),
  adminTopProducts:  ()     => api.get('/admin/analytics/top-products'),
  adminLowStock:     ()     => api.get('/admin/analytics/low-stock'),
  adminRecentOrders: ()     => api.get('/admin/analytics/recent-orders'),
  sellerOverview:    ()     => api.get('/seller/analytics/overview'),
  sellerMonthly:     (year) => api.get('/seller/analytics/monthly', { params: { year } }),
  sellerTopProducts: ()     => api.get('/seller/analytics/top-products'),
  sellerLowStock:    ()     => api.get('/seller/analytics/low-stock'),
}
