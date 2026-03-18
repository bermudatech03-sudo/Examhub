'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Search, UserCheck, UserX, ShieldAlert } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { GET_USERS } from '@/lib/queries'
import { gql } from '@apollo/client'
import { formatDistanceToNow } from 'date-fns'

const UPDATE_USER_STATUS = gql`
  mutation UpdateUserStatus($userId: ID!, $status: UserStatus!) {
    updateUserStatus(userId: $userId, status: $status) { id status }
  }
`
const UPDATE_USER_ROLE = gql`
  mutation UpdateUserRole($userId: ID!, $role: UserRole!) {
    updateUserRole(userId: $userId, role: $role) { id role }
  }
`

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ORG_ADMIN: 'bg-accent/10 text-accent border-accent/20',
  EXAMINER: 'bg-status-info/10 text-status-info border-status-info/20',
  CANDIDATE: 'bg-bg-hover text-text-secondary border-bg-border',
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, loading, refetch } = useQuery(GET_USERS, {
    variables: { pagination: { search: search || undefined, page, pageSize: 20 } }
  })

  const [updateStatus] = useMutation(UPDATE_USER_STATUS, {
    onCompleted: () => { toast.success('Status updated'); refetch() },
    onError: e => toast.error(e.message)
  })

  const [updateRole] = useMutation(UPDATE_USER_ROLE, {
    onCompleted: () => { toast.success('Role updated'); refetch() },
    onError: e => toast.error(e.message)
  })

  const users = data?.users?.items || []
  const total = data?.users?.total || 0

  return (
    <div className="p-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-black">All Users</h1>
          <p className="text-text-secondary mt-1">{total} total users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text" placeholder="Search users..."
          className="input pl-9"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border">
              {['User', 'Role', 'Status', 'Organization', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : users.map((u: any) => (
              <tr key={u.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </div>
                    <div>
                      <div className="font-medium">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-text-muted">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="bg-transparent text-xs border border-bg-border rounded px-2 py-1 cursor-pointer hover:border-accent/40"
                    value={u.role}
                    onChange={e => updateRole({ variables: { userId: u.id, role: e.target.value } })}
                  >
                    {['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER', 'CANDIDATE'].map(r => (
                      <option key={r} value={r} className="bg-bg-card">{r.replace('_', ' ')}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={clsx(
                    'badge text-xs',
                    u.status === 'ACTIVE' ? 'badge-success' :
                    u.status === 'SUSPENDED' ? 'badge-error' : 'badge-gray'
                  )}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {u.organization?.name || '—'}
                </td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  {u.createdAt ? formatDistanceToNow(new Date(u.createdAt), { addSuffix: true }) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {u.status !== 'ACTIVE' && (
                      <button
                        onClick={() => updateStatus({ variables: { userId: u.id, status: 'ACTIVE' } })}
                        className="p-1.5 rounded hover:bg-status-success/10 text-text-muted hover:text-status-success transition-colors"
                        title="Activate"
                      >
                        <UserCheck size={14} />
                      </button>
                    )}
                    {u.status !== 'SUSPENDED' && (
                      <button
                        onClick={() => {
                          if (confirm(`Suspend ${u.email}?`)) {
                            updateStatus({ variables: { userId: u.id, status: 'SUSPENDED' } })
                          }
                        }}
                        className="p-1.5 rounded hover:bg-status-error/10 text-text-muted hover:text-status-error transition-colors"
                        title="Suspend"
                      >
                        <UserX size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div className="p-4 border-t border-bg-border flex items-center justify-between">
            <span className="text-xs text-text-muted">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="btn-ghost btn-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page * 20 >= total}
                onClick={() => setPage(p => p + 1)}
                className="btn-ghost btn-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
