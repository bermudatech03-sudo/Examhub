'use client'
import { useQuery } from '@apollo/client'
import { useAuthStore } from '@/store'
import { GET_DASHBOARD_STATS, GET_AVAILABLE_EXAMS, GET_MY_RESULTS } from '@/lib/queries'
import Link from 'next/link'
import { FileText, Users, BarChart3, TrendingUp, Clock, CheckCircle, XCircle, ArrowRight, PlusCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN' || user?.role === 'EXAMINER'

  const { data: statsData } = useQuery(GET_DASHBOARD_STATS, { skip: !isAdmin })
  const { data: examsData } = useQuery(GET_AVAILABLE_EXAMS, { skip: isAdmin })
  const { data: resultsData } = useQuery(GET_MY_RESULTS, { skip: isAdmin })

  if (isAdmin) return <AdminDashboard data={statsData} user={user} />
  return <CandidateDashboard exams={examsData?.availableExams} results={resultsData?.myResults?.items} user={user} />
}

function AdminDashboard({ data, user }: any) {
  const stats = data?.dashboardStats

  const statCards = [
    { label: 'Total Exams', value: stats?.totalExams ?? '—', icon: FileText, color: 'text-accent' },
    { label: 'Candidates', value: stats?.totalCandidates ?? '—', icon: Users, color: 'text-status-info' },
    { label: 'Total Attempts', value: stats?.totalAttempts ?? '—', icon: BarChart3, color: 'text-status-warning' },
    { label: 'Avg Pass Rate', value: stats?.avgPassRate ? `${stats.avgPassRate.toFixed(1)}%` : '—', icon: TrendingUp, color: 'text-status-success' },
  ]

  const mockTrend = [
    { month: 'Jan', attempts: 42 }, { month: 'Feb', attempts: 67 }, { month: 'Mar', attempts: 55 },
    { month: 'Apr', attempts: 89 }, { month: 'May', attempts: 110 }, { month: 'Jun', attempts: 98 },
  ]

  return (
    <div className="p-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-black">Dashboard</h1>
          <p className="text-text-secondary mt-1">
            Welcome back, {user?.firstName}. Here's what's happening.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/questions/new" className="btn-secondary btn-sm">
            <PlusCircle size={15} /> Add Question
          </Link>
          <Link href="/dashboard/exams/new" className="btn-primary btn-sm">
            <PlusCircle size={15} /> Create Exam
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">{s.label}</span>
              <s.icon size={18} className={s.color} />
            </div>
            <div className="text-3xl font-black">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="font-bold mb-4">Exam Attempts — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={mockTrend}>
              <XAxis dataKey="month" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
              />
              <Line
                type="monotone" dataKey="attempts" stroke="#ff9900" strokeWidth={2}
                dot={{ fill: '#ff9900', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="font-bold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {[
              { href: '/dashboard/exams/new', label: 'Create new exam', icon: PlusCircle },
              { href: '/dashboard/questions/new', label: 'Add question to bank', icon: PlusCircle },
              { href: '/dashboard/analytics', label: 'View full analytics', icon: BarChart3 },
              { href: '/dashboard/monitor', label: 'Live exam monitor', icon: Users },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg-hover transition-colors group">
                <item.icon size={16} className="text-accent" />
                <span className="text-sm font-medium">{item.label}</span>
                <ArrowRight size={14} className="ml-auto text-text-muted group-hover:text-accent transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CandidateDashboard({ exams, results, user }: any) {
  const upcomingExams = exams?.slice(0, 6) || []
  const recentResults = results?.slice(0, 5) || []

  return (
    <div className="p-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-black">Welcome, {user?.firstName}!</h1>
          <p className="text-text-secondary mt-1">
            You have {upcomingExams.length} available exam{upcomingExams.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/exams" className="btn-primary btn-sm">
          Browse All Exams <ArrowRight size={15} />
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Available Exams', value: upcomingExams.length, icon: FileText, color: 'text-accent' },
          { label: 'Exams Taken', value: recentResults.length, icon: CheckCircle, color: 'text-status-success' },
          {
            label: 'Avg Score',
            value: recentResults.length
              ? `${(recentResults.reduce((s: number, r: any) => s + r.percentage, 0) / recentResults.length).toFixed(1)}%`
              : '—',
            icon: BarChart3, color: 'text-status-info'
          },
          {
            label: 'Pass Rate',
            value: recentResults.length
              ? `${Math.round((recentResults.filter((r: any) => r.status === 'PASS').length / recentResults.length) * 100)}%`
              : '—',
            icon: TrendingUp, color: 'text-status-warning'
          },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">{s.label}</span>
              <s.icon size={18} className={s.color} />
            </div>
            <div className="text-3xl font-black">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available exams */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Available Exams</h3>
            <Link href="/dashboard/exams" className="text-xs text-accent hover:text-accent-hover">View all</Link>
          </div>
          {upcomingExams.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">No exams available right now</div>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map((exam: any) => (
                <Link key={exam.id} href={`/exam/${exam.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-bg-hover transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{exam.title}</div>
                    <div className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                      <Clock size={10} /> {exam.duration} min
                      <span>·</span> {exam.questions?.length || 0} questions
                    </div>
                  </div>
                  <ArrowRight size={14} className="ml-auto text-text-muted group-hover:text-accent shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent results */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Recent Results</h3>
            <Link href="/dashboard/results" className="text-xs text-accent hover:text-accent-hover">View all</Link>
          </div>
          {recentResults.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">No results yet</div>
          ) : (
            <div className="space-y-3">
              {recentResults.map((result: any) => (
                <Link key={result.id} href={`/dashboard/results/${result.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-bg-hover transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    result.status === 'PASS' ? 'bg-status-success/10' : 'bg-status-error/10'
                  }`}>
                    {result.status === 'PASS'
                      ? <CheckCircle size={16} className="text-status-success" />
                      : <XCircle size={16} className="text-status-error" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{result.exam?.title}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-bold text-sm ${
                      result.status === 'PASS' ? 'text-status-success' : 'text-status-error'
                    }`}>
                      {result.percentage.toFixed(1)}%
                    </div>
                    <div className={`text-xs ${result.status === 'PASS' ? 'text-status-success' : 'text-status-error'}`}>
                      {result.status}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
