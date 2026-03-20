import { useQuery } from '@tanstack/react-query'
import { Package, ShoppingBag, TrendingUp, DollarSign, Plus, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { analyticsAPI } from '../../api/client'
import StatCard from '../../components/ui/StatCard'
import Spinner from '../../components/ui/Spinner'
import { useAuthStore } from '../../store/authStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function SellerDashboard() {
  const { user } = useAuthStore()
  const { data: ov, isLoading } = useQuery({ queryKey: ['seller-overview'], queryFn: analyticsAPI.sellerOverview })
  const { data: monthly } = useQuery({ queryKey: ['seller-monthly'], queryFn: () => analyticsAPI.sellerMonthly() })
  const { data: topP } = useQuery({ queryKey: ['seller-top-products'], queryFn: analyticsAPI.sellerTopProducts })
  const { data: lowStock } = useQuery({ queryKey: ['seller-low-stock'], queryFn: analyticsAPI.sellerLowStock })

  const stats = ov?.data?.data
  const chartData = (monthly?.data?.data || []).map(d => ({ month: MONTHS[d.month - 1], net: d.netEarnings, commission: d.commission }))
  const topProducts = topP?.data?.data?.slice(0, 5) || []
  const lowStockItems = lowStock?.data?.data || []

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">{user?.shopName || 'My Store'}</p>
        </div>
        <Link to="/seller/products/new" className="btn-primary gap-2"><Plus size={16} /> Add product</Link>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{lowStockItems.length} product{lowStockItems.length !== 1 ? 's' : ''} running low on stock</p>
            <p className="text-xs text-[var(--text-muted)]">{lowStockItems.map(p => p.name).join(', ')}</p>
          </div>
          <Link to="/seller/products" className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline">View</Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Products"     value={stats?.totalProducts || 0}     icon={Package}     color="blue"   delay={0} />
        <StatCard title="Total orders" value={stats?.totalOrders || 0}        icon={ShoppingBag} color="purple" delay={0.05} />
        <StatCard title="Gross revenue" value={`₹${(stats?.totalGrossRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={TrendingUp} color="green" delay={0.1} />
        <StatCard title="Net earnings"  value={`₹${(stats?.totalNetEarnings || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={DollarSign}  color="yellow" delay={0.15} />
      </div>

      {/* Commission info */}
      <div className="card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] shrink-0 font-mono font-bold text-sm">%</div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Commission paid: ₹{(stats?.totalCommissionPaid || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-[var(--text-muted)]">Platform commission deducted from your gross revenue</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-5">Monthly earnings</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="net" fill="#6366f1" radius={[4,4,0,0]} name="Net earnings" />
                <Bar dataKey="commission" fill="#f59e0b" radius={[4,4,0,0]} name="Commission" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-[var(--text-muted)] py-10 text-center">No sales data yet. Start selling!</p>}
        </div>

        {/* Top products */}
        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Top products</h3>
            <Link to="/seller/products" className="text-xs text-[var(--accent)] hover:underline">View all</Link>
          </div>
          {topProducts.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No sales yet</p> : (
            <div className="flex flex-col gap-3">
              {topProducts.map((p, i) => (
                <div key={p._id} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-mono text-[var(--text-muted)]">#{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{p.totalSold} sold</p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">₹{p.totalEarnings?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
