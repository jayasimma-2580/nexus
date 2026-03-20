import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, ShoppingBag,
  Settings, LogOut, Menu, Store, Home
} from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import ThemeToggle from '../ui/ThemeToggle'
import { authAPI } from '../../api/client'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/admin',          icon: LayoutDashboard, label: 'Dashboard',  exact: true },
  { to: '/admin/sellers',  icon: Store,           label: 'Sellers' },
  { to: '/admin/products', icon: Package,         label: 'Products' },
  { to: '/admin/orders',   icon: ShoppingBag,     label: 'Orders' },
  { to: '/admin/users',    icon: Users,           label: 'Users' },
  { to: '/admin/config',   icon: Settings,        label: 'Config' },
]

function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    try { await authAPI.logout() } catch { /* ignore */ }
    logout()
    navigate('/')
    toast.success('Logged out')
    if (onClose) onClose()
  }

  return (
    <div className={`flex flex-col h-full ${mobile ? 'p-4' : 'p-5'}`}>

      {/* Logo — clicking goes back to / */}
      <button
        onClick={() => { navigate('/'); if (onClose) onClose() }}
        className="flex items-center gap-2.5 mb-8 hover:opacity-80 transition-opacity text-left"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          N
        </div>
        <div>
          <span className="font-bold text-[var(--text-primary)] text-sm">NEXUS</span>
          <p className="text-[10px] text-[var(--text-muted)] -mt-0.5">Admin Console</p>
        </div>
      </button>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => { if (onClose) onClose() }}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[var(--accent)] text-white shadow-nexus'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`
            }
          >
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[var(--border)] pt-4 mt-4 space-y-1">

        {/* Back to site */}
        <button
          onClick={() => { navigate('/'); if (onClose) onClose() }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all"
        >
          <Home size={15} /> Back to site
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.name}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">Administrator</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-secondary)]">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-[var(--bg-card)] border-r border-[var(--border)]">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-[var(--bg-card)] border-r border-[var(--border)] z-50 md:hidden"
            >
              <Sidebar mobile onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between px-5 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
          >
            <Menu size={16} />
          </button>
          <div className="flex-1" />
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}