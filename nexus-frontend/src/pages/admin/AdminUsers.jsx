import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Search, Users } from 'lucide-react'
import { adminAPI } from '../../api/client'
import Badge from '../../components/ui/Badge'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const qc = useQueryClient()
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useQuery({ queryKey: ['admin-users', roleFilter], queryFn: () => adminAPI.getUsers(roleFilter || undefined) })
  const users = (data?.data?.data || []).filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))

  const del = useMutation({ mutationFn: (id) => adminAPI.deleteUser(id), onSuccess: () => { toast.success('User deleted'); setDeleteTarget(null); qc.invalidateQueries({ queryKey: ['admin-users'] }) }, onError: e => toast.error(e.response?.data?.message || 'Failed') })

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Users</h1><p className="text-sm text-[var(--text-muted)]">All platform users</p></div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className="input pl-9 py-2 text-sm" />
        </div>
        <div className="flex gap-1 p-1 bg-[var(--bg-tertiary)] rounded-xl">
          {['all','buyer','seller','admin'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r === 'all' ? '' : r)} className={`px-3 py-1 rounded-lg text-sm font-medium capitalize transition-all ${(r === 'all' && !roleFilter) || r === roleFilter ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{r}</button>
          ))}
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Spinner size={28} /></div> :
       users.length === 0 ? <EmptyState icon={Users} title="No users found" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-tertiary)]">
              <tr>{['Name','Email','Role','Verified','Joined','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="border-t border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{u.name}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === 'admin' ? 'purple' : u.role === 'seller' ? 'blue' : 'green'}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.isEmailVerified ? 'green' : 'yellow'}>{u.isEmailVerified ? 'Verified' : 'Pending'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.role !== 'admin' && (
                      <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => del.mutate(deleteTarget._id)} loading={del.isPending}
        title="Delete user"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  )
}
