/**
 * pages/admin/AdminSellers.jsx
 *
 * Fix Bug #17: "Reinstate" button was only shown for suspended sellers.
 * Banned sellers should also be reinstateable. Fixed to show reinstate for
 * both 'suspended' and 'banned' status.
 *
 * Also cleaned up modal state management for clarity.
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Ban, RotateCcw, Percent, Search, Store } from 'lucide-react'
import { adminAPI } from '../../api/client'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

const STATUS_TABS = ['all', 'pending', 'approved', 'suspended', 'banned']

export default function AdminSellers() {
  const qc = useQueryClient()
  const [tab, setTab]           = useState('all')
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null)   // { type, seller }
  const [reason, setReason]     = useState('')
  const [commission, setCommission] = useState('')

  // Fetch sellers filtered by tab status
  const { data, isLoading } = useQuery({
    queryKey: ['admin-sellers', tab],
    queryFn: () => adminAPI.getSellers(tab === 'all' ? undefined : tab),
  })

  // Client-side search filtering
  const sellers = (data?.data?.data || []).filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.shopName?.toLowerCase().includes(search.toLowerCase())
  )

  // Invalidate the sellers list after any mutation
  function refetch() { qc.invalidateQueries({ queryKey: ['admin-sellers'] }) }

  const approve   = useMutation({ mutationFn: (id)             => adminAPI.approveSeller(id),            onSuccess: () => { toast.success('Seller approved');    refetch() }, onError: e => toast.error(e.response?.data?.message || 'Failed') })
  const reject    = useMutation({ mutationFn: ({ id, reason }) => adminAPI.rejectSeller(id, reason),     onSuccess: () => { toast.success('Application rejected'); setModal(null); refetch() }, onError: e => toast.error(e.response?.data?.message || 'Failed') })
  const suspend   = useMutation({ mutationFn: ({ id, reason }) => adminAPI.suspendSeller(id, reason),    onSuccess: () => { toast.success('Seller suspended');   setModal(null); refetch() }, onError: e => toast.error(e.response?.data?.message || 'Failed') })
  const ban       = useMutation({ mutationFn: ({ id, reason }) => adminAPI.banSeller(id, reason),        onSuccess: () => { toast.success('Seller banned');      setModal(null); refetch() }, onError: e => toast.error(e.response?.data?.message || 'Failed') })
  const reinstate = useMutation({ mutationFn: (id)             => adminAPI.reinstateSeller(id),          onSuccess: () => { toast.success('Seller reinstated');  refetch() }, onError: e => toast.error(e.response?.data?.message || 'Failed') })
  const setComm   = useMutation({ mutationFn: ({ id, rate })   => adminAPI.setCommission(id, rate),      onSuccess: () => { toast.success('Commission updated'); setModal(null); refetch() }, onError: e => toast.error(e.response?.data?.message || 'Failed') })

  // Open a modal, pre-populate fields
  function openModal(type, seller) {
    setModal({ type, seller })
    setReason('')
    setCommission(seller.commissionRate ?? '')
  }

  // Dispatch the right mutation based on modal type
  function handleAction() {
    if (modal.type !== 'commission' && !reason.trim()) {
      return toast.error('Reason is required')
    }
    if (modal.type === 'reject')     reject.mutate({ id: modal.seller._id, reason })
    if (modal.type === 'suspend')    suspend.mutate({ id: modal.seller._id, reason })
    if (modal.type === 'ban')        ban.mutate({ id: modal.seller._id, reason })
    if (modal.type === 'commission') setComm.mutate({ id: modal.seller._id, rate: Number(commission) })
  }

  const modalTitles = {
    reject:     'Reject application',
    suspend:    'Suspend seller',
    ban:        'Ban seller',
    commission: 'Set commission rate',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sellers</h1>
          <p className="text-sm text-[var(--text-muted)]">Manage seller accounts and applications</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-tertiary)] rounded-xl w-fit flex-wrap">
        {STATUS_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or shop…"
          className="input pl-9 py-2 text-sm"
        />
      </div>

      {/* Sellers table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : sellers.length === 0 ? (
        <EmptyState icon={Store} title="No sellers found" description="Try a different tab or search term." />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-[var(--bg-tertiary)]">
              <tr>
                {['Seller', 'Shop', 'Status', 'Commission', 'Applied', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sellers.map(s => (
                <tr key={s._id} className="border-t border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--text-primary)]">{s.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{s.email}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{s.shopName || '—'}</td>
                  <td className="px-4 py-3"><Badge status={s.sellerStatus}>{s.sellerStatus}</Badge></td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {s.commissionRate != null ? `${s.commissionRate}%` : 'Default'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Pending: approve or reject */}
                      {s.sellerStatus === 'pending' && (
                        <>
                          <button onClick={() => approve.mutate(s._id)} disabled={approve.isPending} title="Approve" className="p-1.5 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all"><CheckCircle size={14} /></button>
                          <button onClick={() => openModal('reject', s)} title="Reject" className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"><XCircle size={14} /></button>
                        </>
                      )}
                      {/* Approved: suspend or ban */}
                      {s.sellerStatus === 'approved' && (
                        <>
                          <button onClick={() => openModal('suspend', s)} title="Suspend" className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all"><Ban size={14} /></button>
                          <button onClick={() => openModal('ban', s)} title="Ban" className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"><XCircle size={14} /></button>
                        </>
                      )}
                      {/* Fix Bug #17: both suspended AND banned can be reinstated */}
                      {(s.sellerStatus === 'suspended' || s.sellerStatus === 'banned') && (
                        <button onClick={() => reinstate.mutate(s._id)} disabled={reinstate.isPending} title="Reinstate" className="p-1.5 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all"><RotateCcw size={14} /></button>
                      )}
                      {/* Commission — always available */}
                      <button onClick={() => openModal('commission', s)} title="Set commission" className="p-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all"><Percent size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal ? modalTitles[modal.type] : ''} size="sm">
        {modal?.type === 'commission' ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--text-muted)]">
              Set a custom commission rate for <strong className="text-[var(--text-primary)]">{modal.seller?.shopName}</strong>.
              Leave blank to use the platform default.
            </p>
            <div className="relative">
              <input
                type="number" min="0" max="100"
                value={commission}
                onChange={e => setCommission(e.target.value)}
                placeholder="e.g. 8"
                className="input pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">%</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleAction} disabled={setComm.isPending} className="btn-primary flex-1">Save</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--text-muted)]">
              Provide a reason — this will be sent to the seller.
            </p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Reason…"
              className="input resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleAction} disabled={!reason.trim()} className="btn-danger flex-1">Confirm</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
