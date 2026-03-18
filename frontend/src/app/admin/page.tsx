'use client'
import { useQuery } from '@apollo/client'
import { GET_DASHBOARD_STATS, GET_USERS } from '@/lib/queries'
import { Building2, Users, BarChart3, Shield, PlusCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default function AdminPage() {
  const { data: statsData } = useQuery(GET_DASHBOARD_STATS)
  const { data: usersData } = useQuery(GET_USERS, {
    variables: { pagination: { pageSize: 10 } }
  })

  const stats = statsData?.dashboardStats
  const recentUsers = usersData?.users?.items || []

  return (
    <div className="p-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-black">Super Admin</h1>
          <p className="text-text-secondary mt-1">Platform overview and management</p>
        </div>
        <Link href="/admin/organizations/new" className="btn-primary btn-sm">
          <PlusCircle size={15} /> New Organization
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Total Exams', value: stats?.totalExams ?? '—', icon: BarChart3, color: 'text-accent', href: '/admin/organizations' },
          { label: 'Total Candidates', value: stats?.totalCandidates ?? '—', icon: Users, color: 'text-status-info', href: '/admin/users' },
          { label: 'Total Attempts', value: stats?.totalAttempts ?? '—', icon: BarChart3, color: 'text-status-warning', href: '/admin/organizations' },
          { label: 'Avg Pass Rate', value: stats?.avgPassRate ? `${stats.avgPassRate.toFixed(1)}%` : '—', icon: Shield, color: 'text-status-success', href: '/admin/organizations' },
        ].map(s => (
          <Link key={s.label} href={s.href} className="stat-card hover:border-accent/30 transition-colors group">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">{s.label}</span>
              <s.icon size={15} className={s.color} />
            </div>
            <div className="text-3xl font-black">{s.value}</div>
            <ArrowRight size={12} className="text-text-muted group-hover:text-accent transition-colors mt-1" />
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          {
            title: 'Organizations',
            desc: 'Manage all organizations on the platform',
            href: '/admin/organizations',
            icon: Building2,
          },
          {
            title: 'All Users',
            desc: 'View and manage every user account',
            href: '/admin/users',
            icon: Users,
          },
          {
            title: 'Security Logs',
            desc: 'Audit trail of all security events',
            href: '/admin/security',
            icon: Shield,
          },
        ].map(item => (
          <Link key={item.title} href={item.href} className="card-hover p-6 group">
            <item.icon size={22} className="text-accent mb-3" />
            <h3 className="font-bold mb-1">{item.title}</h3>
            <p className="text-text-secondary text-sm">{item.desc}</p>
            <div className="flex items-center gap-1 text-accent text-xs mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              Manage <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent users */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-bg-border flex items-center justify-between">
          <h3 className="font-bold">Recent Users</h3>
          <Link href="/admin/users" className="text-xs text-accent hover:text-accent-hover">View all</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border">
              <th className="text-left px-4 py-3 text-xs text-text-muted font-semibold uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs text-text-muted font-semibold uppercase hidden md:table-cell">Role</th>
              <th className="text-left px-4 py-3 text-xs text-text-muted font-semibold uppercase hidden lg:table-cell">Status</th>
              <th className="text-left px-4 py-3 text-xs text-text-muted font-semibold uppercase hidden xl:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border">
            {recentUsers.map((u: any) => (
              <tr key={u.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </div>
                    <div>
                      <div className="font-medium">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-text-muted">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="badge-orange text-xs">{u.role.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className={u.status === 'ACTIVE' ? 'badge-success' : 'badge-gray'}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 hidden xl:table-cell text-text-muted text-xs">
                  {u.createdAt ? formatDistanceToNow(new Date(u.createdAt), { addSuffix: true }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
