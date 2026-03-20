import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, ShieldCheck, TrendingUp, Star, Package, Store, Users, LayoutDashboard, ShoppingBag } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { useAuthStore } from '../store/authStore'

const features = [
  { icon: Zap,         title: 'Lightning fast',    desc: 'Optimized for speed. Browse, buy, and sell without friction.' },
  { icon: ShieldCheck, title: 'OTP-secured',        desc: 'Every account verified with OTP. Every seller approved by admin.' },
  { icon: TrendingUp,  title: 'Grow your business', desc: 'Seller dashboard with real-time analytics and earnings insights.' },
]
const stats = [
  { icon: Users,   value: '10K+', label: 'Active buyers' },
  { icon: Store,   value: '500+', label: 'Verified sellers' },
  { icon: Package, value: '50K+', label: 'Products listed' },
  { icon: Star,    value: '4.9',  label: 'Average rating' },
]
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { delay, type: 'spring', stiffness: 300, damping: 25 },
})

// ── Hero variants per role ────────────────────────────────────────────────────
function AuthenticatedHero({ user }) {
  const isAdmin  = user.role === 'admin'
  const isSeller = user.role === 'seller'
  const isBuyer  = user.role === 'buyer'

  const dashLink  = isAdmin ? '/admin' : isSeller ? '/seller' : '/shop'
  const dashLabel = isAdmin ? 'Go to Admin Console' : isSeller ? 'Go to Seller Dashboard' : 'Continue Shopping'
  const DashIcon  = isAdmin ? LayoutDashboard : isSeller ? TrendingUp : ShoppingBag

  const greeting = isAdmin
    ? `Welcome back, ${user.name} 👋`
    : isSeller
      ? `Welcome back, ${user.shopName || user.name} 👋`
      : `Welcome back, ${user.name} 👋`

  const subtitle = isAdmin
    ? 'Manage sellers, approve products, and monitor platform performance from your console.'
    : isSeller
      ? 'Check your sales, manage listings, and fulfill orders from your dashboard.'
      : 'Discover new arrivals, track your orders, and explore trending products.'

  return (
    <section className="relative overflow-hidden flex-1 flex items-center min-h-[75vh]">
      <div className="absolute inset-0 mesh-bg" />
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-indigo-500/8 blur-3xl animate-pulse-soft" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-purple-500/8 blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />

      <div className="page-container relative z-10 py-20">
        <div className="max-w-2xl">
          <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-sm text-[var(--text-secondary)] mb-6 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className={`badge ${user.role === 'admin' ? 'badge-purple' : user.role === 'seller' ? 'badge-blue' : 'badge-green'} text-xs`}>{user.role}</span>
            <span>{user.email}</span>
          </motion.div>

          <motion.h1 {...fadeUp(0.05)} className="section-heading text-5xl md:text-6xl mb-4">
            {greeting}
          </motion.h1>
          <motion.p {...fadeUp(0.1)} className="text-lg text-[var(--text-secondary)] max-w-lg mb-8 leading-relaxed">
            {subtitle}
          </motion.p>

          <motion.div {...fadeUp(0.15)} className="flex items-center gap-3 flex-wrap">
            <Link to={dashLink} className="btn-primary text-base py-3.5 px-7 gap-2">
              <DashIcon size={18} /> {dashLabel}
            </Link>
            {isBuyer && (
              <Link to="/orders" className="btn-ghost text-base py-3.5 px-7">
                My orders
              </Link>
            )}
            {isSeller && (
              <Link to="/seller/products/new" className="btn-ghost text-base py-3.5 px-7">
                Add product
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default function Landing() {
  const { user, isAuthenticated } = useAuthStore()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero — different for logged-in vs guest */}
      {isAuthenticated && user ? (
        <AuthenticatedHero user={user} />
      ) : (
        <section className="relative overflow-hidden flex-1 flex items-center min-h-[90vh]">
          <div className="absolute inset-0 mesh-bg" />
          <div className="absolute inset-0 dot-grid opacity-40" />
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />

          <div className="page-container relative z-10 py-20">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-sm text-[var(--text-secondary)] mb-6 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Now accepting new sellers
              </motion.div>

              <motion.h1 {...fadeUp(0.05)} className="section-heading text-5xl md:text-7xl mb-6">
                The marketplace<br />
                <span className="gradient-text">reimagined.</span>
              </motion.h1>

              <motion.p {...fadeUp(0.1)} className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-10 leading-relaxed">
                NEXUS connects buyers with verified sellers in a modern, transparent platform. Buy anything. Sell everything.
              </motion.p>

              <motion.div {...fadeUp(0.15)} className="flex items-center gap-3 justify-center flex-wrap">
                <Link to="/shop" className="btn-primary text-base py-3.5 px-7 gap-2">
                  Start shopping <ArrowRight size={18} />
                </Link>
                <Link to="/register" className="btn-ghost text-base py-3.5 px-7">
                  Become a seller
                </Link>
              </motion.div>

              <motion.div {...fadeUp(0.2)} className="flex items-center gap-4 justify-center mt-8">
                <div className="flex -space-x-2">
                  {['A','B','C','D'].map((l, i) => (
                    <div key={l} className="w-8 h-8 rounded-full border-2 border-[var(--bg-secondary)] flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: ['#6366f1','#8b5cf6','#ec4899','#f59e0b'][i] }}>{l}</div>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} className="fill-amber-400 text-amber-400" />)}
                </div>
                <span className="text-sm text-[var(--text-muted)]">Trusted by 10,000+ users</span>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="py-12 border-y border-[var(--border)] bg-[var(--bg-card)]">
        <div className="page-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(({ icon: Icon, value, label }, i) => (
              <motion.div key={label} {...fadeUp(i * 0.05)} className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center mb-3">
                  <Icon size={18} className="text-[var(--accent)]" />
                </div>
                <span className="text-2xl font-bold text-[var(--text-primary)]">{value}</span>
                <span className="text-sm text-[var(--text-muted)]">{label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-[var(--bg-secondary)]">
        <div className="page-container">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <h2 className="section-heading mb-3">Built differently</h2>
            <p className="text-[var(--text-muted)] max-w-xl mx-auto">We designed NEXUS from scratch to be fast, fair, and transparent for everyone.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} {...fadeUp(i * 0.08)} className="card p-6">
                <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center mb-4">
                  <Icon size={22} className="text-[var(--accent)]" />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-2">{title}</h3>
                <p className="text-[var(--text-muted)] leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — only for guests */}
      {!isAuthenticated && (
        <section className="py-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 relative overflow-hidden">
          <div className="absolute inset-0 dot-grid opacity-20" />
          <div className="page-container relative z-10 text-center">
            <motion.div {...fadeUp()}>
              <h2 className="text-4xl font-bold text-white mb-4">Ready to get started?</h2>
              <p className="text-white/70 mb-8 text-lg max-w-md mx-auto">Join thousands of buyers and sellers already on the platform.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link to="/register" className="py-3.5 px-7 rounded-xl bg-white text-indigo-600 font-semibold hover:bg-white/90 transition-all">Create free account</Link>
                <Link to="/shop"     className="py-3.5 px-7 rounded-xl border-2 border-white/30 text-white hover:bg-white/10 transition-all font-semibold">Browse shop</Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}