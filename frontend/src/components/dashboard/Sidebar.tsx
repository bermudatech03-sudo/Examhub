'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@apollo/client'
import {
  LayoutDashboard, BookOpen, FileText, Users, BarChart3,
  Settings, LogOut, Bell, Award, Shield, Building2,
  ChevronDown, CheckCircle, AlertTriangle, Monitor, PlusCircle
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store'
import { LOGOUT_MUTATION, GET_NOTIFICATIONS } from '@/lib/queries'
import toast from 'react-hot-toast'
import { useState } from 'react'

const navByRole = {
  SUPER_ADMIN: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Organizations', href: '/admin/organizations', icon: Building2 },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Security Logs', href: '/admin/security', icon: Shield },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  ORG_ADMIN: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Exams', href: '/dashboard/exams', icon: FileText },
    { label: 'Question Bank', href: '/dashboard/questions', icon: BookOpen },
    { label: 'Users', href: '/dashboard/users', icon: Users },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  EXAMINER: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Exams', href: '/dashboard/exams', icon: FileText },
    { label: 'Question Bank', href: '/dashboard/questions', icon: BookOpen },
    { label: 'Live Monitor', href: '/dashboard/monitor', icon: Monitor },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  ],
  CANDIDATE: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Available Exams', href: '/dashboard/exams', icon: FileText },
    { label: 'My Results', href: '/dashboard/results', icon: BarChart3 },
    { label: 'Certificates', href: '/dashboard/certificates', icon: Award },
  ],
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [showNotifications, setShowNotifications] = useState(false)

  const { data: notifData } = useQuery(GET_NOTIFICATIONS, {
    variables: { unreadOnly: false },
    skip: !user,
    pollInterval: 30000
  })

  const [logoutMutation] = useMutation(LOGOUT_MUTATION, {
    onCompleted: () => {
      logout()
      router.push('/auth/login')
    }
  })

  if (!user) return null

  const role = user.role as keyof typeof navByRole
  const navItems = navByRole[role] || navByRole.CANDIDATE
  const unreadCount = notifData?.unreadCount || 0

  return (
    <aside className="w-64 flex-shrink-0 bg-bg-secondary border-r border-bg-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-bg-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <span className="text-black font-black text-sm">EH</span>
          </div>
          <div className="min-w-0">
            <div className="font-black text-base leading-tight">ExamHub</div>
            {user.organization && (
              <div className="text-xs text-text-muted truncate">{user.organization.name}</div>
            )}
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(active ? 'sidebar-link-active' : 'sidebar-link')}
            >
              <item.icon size={17} className="shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-bg-border space-y-0.5">
        {/* Notifications */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="sidebar-link w-full relative"
        >
          <Bell size={17} />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="ml-auto text-xs bg-accent text-black rounded-full px-1.5 py-0.5 font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => toast('Profile settings coming soon')}
            className="sidebar-link w-full"
          >
            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-medium text-text-primary truncate">{user.fullName || `${user.firstName} ${user.lastName}`}</div>
              <div className="text-xs text-text-muted">{role.replace('_', ' ')}</div>
            </div>
            <ChevronDown size={14} className="shrink-0" />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            logout()
            router.push('/auth/login')
          }}
          className="sidebar-link w-full text-status-error hover:text-status-error hover:bg-status-error/10"
        >
          <LogOut size={17} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Notification panel */}
      {showNotifications && (
        <div className="absolute bottom-40 left-64 w-80 ml-2 z-50 card shadow-xl border-bg-border max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-bg-border flex items-center justify-between">
            <span className="text-sm font-semibold">Notifications</span>
            <button onClick={() => setShowNotifications(false)} className="text-text-muted hover:text-text-primary text-lg leading-none">&times;</button>
          </div>
          {notifData?.myNotifications?.length > 0 ? (
            <div className="divide-y divide-bg-border">
              {notifData.myNotifications.slice(0, 10).map((n: any) => (
                <div key={n.id} className={clsx('p-3', n.isRead ? 'opacity-60' : '')}>
                  <div className="flex items-start gap-2">
                    {n.isRead
                      ? <CheckCircle size={14} className="text-text-muted mt-0.5 shrink-0" />
                      : <AlertTriangle size={14} className="text-accent mt-0.5 shrink-0" />
                    }
                    <div>
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-text-secondary mt-0.5">{n.body}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-text-muted text-sm">No notifications</div>
          )}
        </div>
      )}
    </aside>
  )
}
