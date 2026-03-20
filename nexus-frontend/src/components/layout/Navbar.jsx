/**
 * components/layout/Navbar.jsx
 *
 * Shown on public pages and buyer pages (via BuyerLayout).
 * Seller and admin have their own sidebar layouts.
 *
 * Fixes:
 *  1. Dropdown backdrop was z-10, navbar is z-40 → backdrop clicks never fired.
 *     Fixed backdrop to z-[49] and dropdown panel to z-[50].
 *  2. isAuthenticated was a JS getter in authStore (now fixed to plain boolean).
 *  3. Buyer "My Account" now goes to /orders (not /shop).
 */

import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Heart, LogOut, Menu, X,
  Settings, LayoutDashboard, Store, Star
} from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore, useCartStore } from '../../store/authStore'
import ThemeToggle from '../ui/ThemeToggle'
import toast from 'react-hot-toast'
import { authAPI } from '../../api/client'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const { count } = useCartStore()
  const navigate  = useNavigate()
  const [menuOpen, setMenuOpen]         = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  async function handleLogout() {
    try { await authAPI.logout() } catch { /* JWT stateless — ignore */ }
    logout()
    navigate('/')
    toast.success('Logged out successfully')
    setUserMenuOpen(false)
    setMenuOpen(false)
  }

  // Where the primary "dashboard" link goes per role
  const dashboardLink =
    user?.role === 'admin'  ? '/admin'  :
    user?.role === 'seller' ? '/seller' :
    '/orders'   // buyers go to their order history

  // Profile & Settings — always different from dashboardLink
  const settingsLink =
    user?.role === 'admin'  ? '/admin/profile'  :
    user?.role === 'seller' ? '/seller/profile' :
    '/profile'

  // Human-friendly label
  const dashboardLabel =
    user?.role === 'admin'  ? 'Admin Console'    :
    user?.role === 'seller' ? 'Seller Dashboard' :
    'My Orders'

  return (
    <nav className="sticky top-0 z-40 w-full">
      <div className="glass border-b border-[var(--border)]">
        <div className="page-container">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">N</span>
              </div>
              <span className="font-display font-bold text-lg tracking-tight text-[var(--text-primary)]">
                NEXUS
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/shop"
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
              >
                Shop
              </Link>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <ThemeToggle />

              {/* Wishlist + Cart — buyers only */}
              {isAuthenticated && user?.role === 'buyer' && (
                <>
                  <Link
                    to="/wishlist"
                    title="Wishlist"
                    className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
                  >
                    <Heart size={18} />
                  </Link>
                  <Link
                    to="/cart"
                    title="Cart"
                    className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
                  >
                    <ShoppingCart size={18} />
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {/* Authenticated user dropdown */}
              {isAuthenticated ? (
                <div className="relative">
                  {/* Avatar button */}
                  <button
                    onClick={() => setUserMenuOpen(prev => !prev)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-[var(--text-secondary)] hidden sm:block max-w-24 truncate">
                      {user?.name}
                    </span>
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <>
                        {/* Backdrop — z-[49] so it sits above the navbar (z-40) but below the panel */}
                        <div
                          className="fixed inset-0 z-[49]"
                          onClick={() => setUserMenuOpen(false)}
                        />
                        {/* Dropdown panel — z-[50] so it renders on top of everything */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -8 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="absolute right-0 top-full mt-2 w-56 card p-1.5 z-[50] shadow-xl"
                        >
                          {/* User info */}
                          <div className="px-3 py-2 mb-1">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                              {user?.name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
                            <span className={`badge mt-1 ${
                              user?.role === 'admin'  ? 'badge-purple' :
                              user?.role === 'seller' ? 'badge-blue'   : 'badge-green'
                            }`}>
                              {user?.role}
                            </span>
                          </div>

                          <div className="border-t border-[var(--border)] pt-1 flex flex-col">

                            {/* Primary dashboard link */}
                            <Link
                              to={dashboardLink}
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all"
                            >
                              <LayoutDashboard size={15} />
                              {dashboardLabel}
                            </Link>

                            {/* Buyer: Cart quick link */}
                            {user?.role === 'buyer' && (
                              <>
                                <Link
                                  to="/cart"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all"
                                >
                                  <ShoppingCart size={15} /> My Cart
                                </Link>
                                <Link
                                  to="/reviews"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all"
                                >
                                  <Star size={15} /> My Reviews
                                </Link>
                              </>
                            )}

                            {/* Seller: Products quick link */}
                            {user?.role === 'seller' && (
                              <Link
                                to="/seller/products"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all"
                              >
                                <Store size={15} /> My Products
                              </Link>
                            )}

                            {/* Profile & Settings */}
                            <Link
                              to={settingsLink}
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all"
                            >
                              <Settings size={15} /> Profile & Settings
                            </Link>

                            {/* Sign out */}
                            <button
                              onClick={handleLogout}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-all"
                            >
                              <LogOut size={15} /> Sign out
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* Guest buttons */
                <div className="flex items-center gap-2">
                  <Link to="/login"    className="btn-ghost text-sm py-2 px-4 hidden sm:flex">Sign in</Link>
                  <Link to="/register" className="btn-primary text-sm py-2 px-4">Get started</Link>
                </div>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setMenuOpen(prev => !prev)}
                className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass border-b border-[var(--border)] md:hidden overflow-hidden"
          >
            <div className="page-container py-3 flex flex-col gap-1">
              <Link
                to="/shop"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              >
                Shop
              </Link>

              {!isAuthenticated ? (
                <>
                  <Link to="/login"    onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Sign in</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--accent)]">Get started</Link>
                </>
              ) : (
                <>
                  <Link to={dashboardLink} onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">{dashboardLabel}</Link>
                  <Link to={settingsLink}  onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Profile & Settings</Link>
                  <button onClick={handleLogout} className="px-3 py-2 rounded-lg text-sm font-medium text-red-500 text-left">Sign out</button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}