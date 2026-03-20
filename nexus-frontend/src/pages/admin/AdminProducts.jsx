import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Search, Package } from 'lucide-react'
import { productAPI } from '../../api/client'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

export default function AdminProducts() {
  const qc = useQueryClient()
  const [rejectModal, setRejectModal] = useState(null)
  const [reason, setReason] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['pending-products'], queryFn: productAPI.getPending })
  const products = (data?.data?.data || []).filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  const approve = useMutation({ mutationFn: productAPI.approve, onSuccess: () => { toast.success('Product approved'); qc.invalidateQueries({ queryKey: ['pending-products'] }) }, onError: e => toast.error(e.response?.data?.message || 'Failed') })
  const reject  = useMutation({ mutationFn: ({ id, reason }) => productAPI.reject(id, reason), onSuccess: () => { toast.success('Product rejected'); setRejectModal(null); qc.invalidateQueries({ queryKey: ['pending-products'] }) }, onError: e => toast.error(e.response?.data?.message || 'Failed') })

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Product approvals</h1><p className="text-sm text-[var(--text-muted)]">Review and approve seller product listings</p></div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className="input pl-9 py-2 text-sm" />
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Spinner size={28} /></div> :
       products.length === 0 ? <EmptyState icon={Package} title="All clear!" description="No products pending approval." /> : (
        <div className="grid gap-4">
          {products.map(p => (
            <div key={p._id} className="card p-5 flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-20 h-20 rounded-xl bg-[var(--bg-tertiary)] overflow-hidden shrink-0">
                {p.images?.[0]?.url ? <img src={p.images[0].url} className="w-full h-full object-cover" alt={p.name} /> : <Package size={24} className="m-auto mt-6 text-[var(--text-muted)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="font-semibold text-[var(--text-primary)]">{p.name}</h3>
                  <Badge status="pending">Pending</Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">by {p.seller?.shopName || p.seller?.name} · {p.category?.name}</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{p.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="font-bold text-[var(--text-primary)]">₹{p.price?.toLocaleString()}</span>
                  <span className="text-xs text-[var(--text-muted)]">Stock: {p.stock}</span>
                  <span className="text-xs text-[var(--text-muted)]">{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex sm:flex-col gap-2">
                <button onClick={() => approve.mutate(p._id)} disabled={approve.isPending} className="btn-secondary py-2 px-4 text-sm gap-1.5 text-green-600 border-green-500/30 bg-green-500/10 hover:bg-green-500/15">
                  <CheckCircle size={14} /> Approve
                </button>
                <button onClick={() => { setRejectModal(p); setReason('') }} className="btn-danger py-2 px-4 text-sm gap-1.5">
                  <XCircle size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject product" size="sm">
        <p className="text-sm text-[var(--text-muted)] mb-4">Tell the seller why their product <strong className="text-[var(--text-primary)]">"{rejectModal?.name}"</strong> was rejected so they can fix it.</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason for rejection…" className="input resize-none mb-4" />
        <div className="flex gap-3">
          <button onClick={() => setRejectModal(null)} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => reject.mutate({ id: rejectModal._id, reason })} disabled={!reason.trim() || reject.isPending} className="btn-danger flex-1">Reject</button>
        </div>
      </Modal>
    </div>
  )
}
