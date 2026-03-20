import { useQuery } from '@tanstack/react-query'
import { Users, Store, Package, ShoppingBag, TrendingUp, AlertCircle, Clock, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { analyticsAPI } from '../../api/client'
import StatCard from '../../components/ui/StatCard'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminDashboard() {
  const { data: overviewData, isLoading } = useQuery({ queryKey: ['admin-overview'], queryFn: analyticsAPI.adminOverview })
  const { data: monthlyData } = useQuery({ queryKey: ['admin-monthly'], queryFn: () => analyticsAPI.adminMonthly() })
  const { data: recentData } = useQuery({ queryKey: ['admin-recent'], queryFn: analyticsAPI.adminRecentOrders })
  const { data: topSellersData } = useQuery({ queryKey: ['admin-top-sellers'], queryFn: analyticsAPI.adminTopSellers })

  const ov = overviewData?.data?.data
  const monthly = (monthlyData?.data?.data || []).map(d => ({ month: MONTHS[d.month - 1], sales: d.totalSales, commission: d.totalCommission }))
  const recent = recentData?.data?.data || []
  const topSellers = topSellersData?.data?.data?.slice(0, 5) || []

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>

  return (
    <div className="space-y-7">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)]">Platform overview</p>
      </div>

      {/* Alerts */}
      {(ov?.pendingSellers > 0 || ov?.pendingProducts > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {ov?.pendingSellers > 0 && (
            <Link to="/admin/sellers?status=pending" className="flex-1 flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-all">
              <Clock size={18} className="text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{ov.pendingSellers} seller application{ov.pendingSellers !== 1 ? 's' : ''} pending</p>
                <p className="text-xs text-[var(--text-muted)]">Review and approve</p>
              </div>
              <ChevronRight size={14} className="text-amber-500" />
            </Link>
          )}
          {ov?.pendingProducts > 0 && (
            <Link to="/admin/products" className="flex-1 flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-all">
              <AlertCircle size={18} className="text-blue-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{ov.pendingProducts} product{ov.pendingProducts !== 1 ? 's' : ''} awaiting approval</p>
                <p className="text-xs text-[var(--text-muted)]">Review listings</p>
              </div>
              <ChevronRight size={14} className="text-blue-500" />
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total buyers"     value={ov?.totalBuyers?.toLocaleString() || '0'}    icon={Users}       color="blue"   delay={0} />
        <StatCard title="Active sellers"   value={ov?.totalSellers?.toLocaleString() || '0'}   icon={Store}       color="green"  delay={0.05} />
        <StatCard title="Products listed"  value={ov?.totalProducts?.toLocaleString() || '0'}  icon={Package}     color="purple" delay={0.1} />
        <StatCard title="Total orders"     value={ov?.totalOrders?.toLocaleString() || '0'}    icon={ShoppingBag} color="yellow" delay={0.15} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Total revenue" value={`₹${(ov?.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={TrendingUp} color="green" delay={0.2} />
        <StatCard title="Commission earned" value={`₹${(ov?.totalCommission || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={TrendingUp} color="purple" delay={0.25} />
      </div>

      {/* Chart + top sellers */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-5">Revenue vs Commission</h3>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" fill="url(#colorSales)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="commission" stroke="#22c55e" fill="url(#colorComm)" strokeWidth={2} name="Commission" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-[var(--text-muted)] py-10 text-center">No data yet</p>}
        </div>

        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Top sellers</h3>
            <Link to="/admin/sellers" className="text-xs text-[var(--accent)] hover:underline">View all</Link>
          </div>
          {topSellers.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No data yet</p> : (
            <div className="flex flex-col gap-3">
              {topSellers.map((s, i) => (
                <div key={s._id} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-mono text-[var(--text-muted)]">#{i+1}</span>
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                    {s.shopName?.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{s.shopName || s.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{s.totalOrders} orders</p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">₹{s.totalNet?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="card p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-[var(--text-primary)]">Recent orders</h3>
          <Link to="/admin/orders" className="text-xs text-[var(--accent)] hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['Order ID','Buyer','Total','Status','Date'].map(h => (
                  <th key={h} className="text-left pb-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(o => (
                <tr key={o._id} className="border-b border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="py-3 font-mono text-xs text-[var(--text-muted)]">#{o._id.slice(-8).toUpperCase()}</td>
                  <td className="py-3 text-[var(--text-primary)]">{o.buyer?.name || 'Unknown'}</td>
                  <td className="py-3 font-semibold text-[var(--text-primary)]">₹{o.totalPrice?.toLocaleString()}</td>
                  <td className="py-3"><Badge status={o.orderStatus}>{o.orderStatus}</Badge></td>
                  <td className="py-3 text-[var(--text-muted)] text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-[var(--text-muted)]">No orders yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
