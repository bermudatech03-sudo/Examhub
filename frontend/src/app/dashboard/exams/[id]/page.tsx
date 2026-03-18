'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from '@apollo/client'
import Link from 'next/link'
import {
  ArrowLeft, Clock, Users, FileText, BarChart3, Eye,
  Send, Trash2, PlusCircle, Copy, Check, AlertTriangle
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { GET_EXAM, PUBLISH_EXAM_MUTATION, GET_EXAM_RESULTS, GET_EXAM_STATS } from '@/lib/queries'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

export default function ExamDetailPage() {
  const params = useParams()
  const examId = params.id as string
  const [tab, setTab] = useState<'overview' | 'questions' | 'results' | 'analytics'>('overview')
  const [copiedCode, setCopiedCode] = useState(false)

  const { data, loading, refetch } = useQuery(GET_EXAM, { variables: { id: examId } })
  const { data: resultsData } = useQuery(GET_EXAM_RESULTS, {
    variables: { examId },
    skip: tab !== 'results'
  })
  const { data: statsData } = useQuery(GET_EXAM_STATS, {
    variables: { examId },
    skip: tab !== 'analytics'
  })

  const [publishExam] = useMutation(PUBLISH_EXAM_MUTATION, {
    onCompleted: () => { toast.success('Exam published!'); refetch() },
    onError: e => toast.error(e.message)
  })

  const exam = data?.exam
  const results = resultsData?.examResults?.items || []
  const stats = statsData?.examStats

  if (loading) return (
    <div className="p-8">
      <div className="skeleton h-8 w-64 mb-4 rounded" />
      <div className="skeleton h-48 rounded-xl" />
    </div>
  )

  if (!exam) return (
    <div className="p-8"><p className="text-text-secondary">Exam not found.</p></div>
  )

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'badge-gray', PUBLISHED: 'badge-orange', ACTIVE: 'badge-success',
    COMPLETED: 'badge bg-status-info/10 text-status-info border-status-info/20', ARCHIVED: 'badge-gray'
  }

  const copyAccessCode = () => {
    if (exam.accessCode) {
      navigator.clipboard.writeText(exam.accessCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const TABS = [
    { key: 'overview', label: 'Overview', icon: Eye },
    { key: 'questions', label: `Questions (${exam.questions.length})`, icon: FileText },
    { key: 'results', label: 'Results', icon: Users },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link href="/dashboard/exams" className="btn-ghost btn-sm mt-1">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black">{exam.title}</h1>
            <span className={STATUS_COLORS[exam.status] || 'badge-gray'}>{exam.status}</span>
          </div>
          <p className="text-text-secondary text-sm mt-1">
            {exam.organization?.name} · Created by {exam.createdBy?.firstName} {exam.createdBy?.lastName}
          </p>
        </div>
        <div className="flex gap-2">
          {exam.status === 'DRAFT' && (
            <button
              onClick={() => publishExam({ variables: { id: examId } })}
              className="btn-primary btn-sm"
            >
              <Send size={13} /> Publish
            </button>
          )}
          <Link href={`/dashboard/exams/${examId}/edit`} className="btn-secondary btn-sm">
            Edit
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-bg-secondary rounded-xl w-fit mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-bg-card text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Duration', value: `${exam.duration}m` },
                { label: 'Questions', value: exam.questions.length },
                { label: 'Total Points', value: exam.totalPoints },
                { label: 'Pass Score', value: `${exam.passingScore}%` },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <span className="text-xs text-text-secondary">{s.label}</span>
                  <div className="text-2xl font-black">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            {exam.description && (
              <div className="card p-5">
                <h3 className="font-bold mb-2">Description</h3>
                <p className="text-text-secondary text-sm">{exam.description}</p>
              </div>
            )}

            {/* Instructions */}
            {exam.instructions && (
              <div className="card p-5">
                <h3 className="font-bold mb-2">Instructions</h3>
                <p className="text-text-secondary text-sm whitespace-pre-wrap">{exam.instructions}</p>
              </div>
            )}

            {/* Settings */}
            <div className="card p-5">
              <h3 className="font-bold mb-3">Exam Settings</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Proctored', value: exam.isProctored },
                  { label: 'Shuffle Questions', value: exam.shuffleQuestions },
                  { label: 'Shuffle Options', value: exam.shuffleOptions },
                  { label: 'Allow Backtrack', value: exam.allowBacktrack },
                  { label: 'Show Results', value: exam.showResults },
                  { label: 'Show Answers', value: exam.showCorrectAnswers },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between p-2.5 bg-bg-hover rounded-lg">
                    <span className="text-sm text-text-secondary">{s.label}</span>
                    <span className={clsx('text-xs font-bold', s.value ? 'text-status-success' : 'text-text-muted')}>
                      {s.value ? '✓ ON' : '✗ OFF'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {exam.accessCode && (
              <div className="card p-4">
                <h3 className="text-sm font-bold mb-2">Access Code</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-lg font-mono font-black text-accent bg-bg-hover px-3 py-2 rounded-lg tracking-widest">
                    {exam.accessCode}
                  </code>
                  <button onClick={copyAccessCode} className="btn-ghost btn-sm p-2">
                    {copiedCode ? <Check size={14} className="text-status-success" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}

            <div className="card p-4">
              <h3 className="text-sm font-bold mb-3">Scheduling</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Starts</span>
                  <span>{exam.startsAt ? new Date(exam.startsAt).toLocaleString() : 'Anytime'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Ends</span>
                  <span>{exam.endsAt ? new Date(exam.endsAt).toLocaleString() : 'No end'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Max Attempts</span>
                  <span>{exam.maxAttempts}</span>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-bold mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <Link href={`/dashboard/monitor?examId=${examId}`} className="sidebar-link w-full">
                  <Eye size={14} className="text-accent" /> Live Monitor
                </Link>
                <Link href={`/dashboard/analytics?examId=${examId}`} className="sidebar-link w-full">
                  <BarChart3 size={14} className="text-accent" /> Analytics
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'questions' && (
        <div className="space-y-3">
          {exam.questions.length === 0 ? (
            <div className="text-center py-16 card">
              <FileText size={40} className="text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">No questions added yet</p>
              <Link href={`/dashboard/exams/${examId}/edit`} className="btn-primary btn-sm mt-4 inline-flex">
                <PlusCircle size={13} /> Add Questions
              </Link>
            </div>
          ) : (
            exam.questions.map((eq: any, idx: number) => (
              <div key={eq.id} className="card p-4 flex items-center gap-4">
                <span className="w-7 h-7 rounded-full bg-bg-hover flex items-center justify-center text-xs font-bold text-text-muted shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{eq.question.title}</div>
                  <div className="text-xs text-text-muted mt-0.5 capitalize">
                    {eq.question.type.replace(/_/g, ' ').toLowerCase()} · {eq.question.difficulty}
                  </div>
                </div>
                <span className="text-xs font-bold text-accent shrink-0">{eq.points || eq.question.points} pts</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'results' && (
        <div>
          {results.length === 0 ? (
            <div className="text-center py-16 card">
              <Users size={40} className="text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">No results yet</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bg-border">
                    {['Candidate', 'Score', 'Status', 'Rank', 'Time', 'Graded'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-border">
                  {results.map((r: any) => (
                    <tr key={r.id} className="hover:bg-bg-hover transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.attempt?.candidate?.firstName} {r.attempt?.candidate?.lastName}</div>
                        <div className="text-xs text-text-muted">{r.attempt?.candidate?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('font-bold', r.status === 'PASS' ? 'text-status-success' : 'text-status-error')}>
                          {r.percentage.toFixed(1)}%
                        </span>
                        <div className="text-xs text-text-muted">{r.earnedPoints}/{r.totalPoints} pts</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={r.status === 'PASS' ? 'badge-success' : 'badge-error'}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">#{r.rank || '—'}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {r.timeTaken ? `${Math.floor(r.timeTaken / 60)}m ${r.timeTaken % 60}s` : '—'}
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs">
                        {r.gradedAt ? formatDistanceToNow(new Date(r.gradedAt), { addSuffix: true }) : 'Pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'analytics' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Attempts', value: stats.totalAttempts },
              { label: 'Avg Score', value: `${stats.avgScore.toFixed(1)}%` },
              { label: 'Pass Rate', value: `${stats.passRate.toFixed(1)}%` },
              { label: 'Avg Time', value: `${Math.round(stats.avgTimeTaken / 60)}m` },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <span className="text-xs text-text-secondary">{s.label}</span>
                <div className="text-3xl font-black text-accent">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="card p-6">
            <h3 className="font-bold mb-4">Score Distribution</h3>
            {Object.keys(stats.scoreDistribution).length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={Object.entries(stats.scoreDistribution).map(([range, count]) => ({ range, count }))}>
                  <XAxis dataKey="range" stroke="#666" fontSize={11} />
                  <YAxis stroke="#666" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#ff9900" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-muted text-sm text-center py-8">No data yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
