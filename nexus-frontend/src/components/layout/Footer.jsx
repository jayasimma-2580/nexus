import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function Footer() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-card)] mt-auto">
      <div className="page-container py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">N</span>
            </div>
            <span className="font-bold text-[var(--text-primary)]">NEXUS</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">© {new Date().getFullYear()} NEXUS Market. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-[var(--text-muted)]">
            <Link to="/shop" className="hover:text-[var(--text-primary)] transition-colors">Shop</Link>
            {/* Only show auth links to guests */}
            {!isAuthenticated && (
              <>
                <Link to="/login"    className="hover:text-[var(--text-primary)] transition-colors">Sign in</Link>
                <Link to="/register" className="hover:text-[var(--text-primary)] transition-colors">Register</Link>
              </>
            )}
            {isAuthenticated && user?.role === 'buyer' && (
              <Link to="/orders" className="hover:text-[var(--text-primary)] transition-colors">My Orders</Link>
            )}
            {isAuthenticated && user?.role === 'seller' && (
              <Link to="/seller" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}