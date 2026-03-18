'use client'
import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@apollo/client'
import { Monitor, AlertTriangle, Users, Clock, Activity, Eye, XCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { GET_EXAMS, GET_EXAM_ATTEMPTS } from '@/lib/queries'
import { useWebSocket } from '@/hooks/useWebSocket'
import { formatDistanceToNow } from 'date-fns'

interface LiveCandidate {
  userId: string
  attemptId: string
  lastSeen: Date
  violations: Array<{ type: string; timestamp: Date }>
  status: 'ACTIVE' | 'INACTIVE' | 'LEFT'
}

export default function LiveMonitorPage() {
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [liveCandidates, setLiveCandidates] = useState<Map<string, LiveCandidate>>(new Map())
  const [alertLog, setAlertLog] = useState<Array<{ message: string; time: Date; type: string }>>([])

  const { data: examsData } = useQuery(GET_EXAMS, {
    variables: { filter: { status: 'PUBLISHED' }, pagination: { pageSize: 50 } }
  })

  const { data: attemptsData } = useQuery(GET_EXAM_ATTEMPTS, {
    variables: { examId: selectedExamId },
    skip: !selectedExamId,
    pollInterval: 10000
  })

  const { on, off, send } = useWebSocket(selectedExamId || undefined, undefined, 'EXAMINER')

  useEffect(() => {
    if (!selectedExamId) return

    const handleJoin = ({ payload }: any) => {
      setLiveCandidates(prev => {
        const next = new Map(prev)
        next.set(payload.userId, {
          userId: payload.userId,
          attemptId: payload.attemptId,
          lastSeen: new Date(),
          violations: [],
          status: 'ACTIVE'
        })
        return next
      })
      addAlert(`Candidate joined: ${payload.userId.slice(-6)}`, 'info')
    }

    const handleLeft = ({ payload }: any) => {
      setLiveCandidates(prev => {
        const next = new Map(prev)
        const c = next.get(payload.userId)
        if (c) next.set(payload.userId, { ...c, status: 'LEFT' })
        return next
      })
      addAlert(`Candidate left: ${payload.userId.slice(-6)}`, 'warning')
    }

    const handleActive = ({ payload }: any) => {
      setLiveCandidates(prev => {
        const next = new Map(prev)
        const c = next.get(payload.userId)
        if (c) next.set(payload.userId, { ...c, lastSeen: new Date(), status: 'ACTIVE' })
        return next
      })
    }

    const handleViolation = ({ payload }: any) => {
      setLiveCandidates(prev => {
        const next = new Map(prev)
        const c = next.get(payload.userId)
        if (c) {
          next.set(payload.userId, {
            ...c,
            violations: [...c.violations, { type: payload.violationType, timestamp: new Date() }]
          })
        }
        return next
      })
      addAlert(`⚠️ Violation: ${payload.violationType} by ${payload.userId.slice(-6)}`, 'violation')
    }

    const unsubJoin = on('CANDIDATE_JOINED', handleJoin)
    const unsubLeft = on('CANDIDATE_LEFT', handleLeft)
    const unsubActive = on('CANDIDATE_ACTIVE', handleActive)
    const unsubViolation = on('VIOLATION_DETECTED', handleViolation)

    // Request initial status
    send('EXAM_STATUS_REQUEST', { examId: selectedExamId })

    return () => {
      unsubJoin?.()
      unsubLeft?.()
      unsubActive?.()
      unsubViolation?.()
    }
  }, [selectedExamId, on, send])

  const addAlert = useCallback((message: string, type: string) => {
    setAlertLog(prev => [{ message, time: new Date(), type }, ...prev.slice(0, 49)])
  }, [])

  const exams = examsData?.exams?.items || []
  const candidates = Array.from(liveCandidates.values())
  const activeCount = candidates.filter(c => c.status === 'ACTIVE').length
  const violationCount = candidates.reduce((s, c) => s + c.violations.length, 0)

  return (
    <div className="p-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-black">Live Monitor</h1>
          <p className="text-text-secondary mt-1">Real-time exam proctoring dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border',
            selectedExamId
              ? 'border-status-success/30 bg-status-success/10 text-status-success'
              : 'border-bg-border bg-bg-hover text-text-muted'
          )}>
            <span className={clsx('w-2 h-2 rounded-full', selectedExamId ? 'bg-status-success animate-pulse' : 'bg-text-muted')} />
            {selectedExamId ? 'LIVE' : 'NOT MONITORING'}
          </div>
        </div>
      </div>

      {/* Exam selector */}
      <div className="card p-5 mb-6">
        <label className="label">Select Exam to Monitor</label>
        <select
          className="input max-w-md"
          value={selectedExamId || ''}
          onChange={e => {
            setSelectedExamId(e.target.value || null)
            setLiveCandidates(new Map())
            setAlertLog([])
          }}
        >
          <option value="">Choose an exam...</option>
          {exams.map((exam: any) => (
            <option key={exam.id} value={exam.id}>
              {exam.title} ({exam.status})
            </option>
          ))}
        </select>
      </div>

      {!selectedExamId ? (
        <div className="text-center py-20">
          <Monitor size={48} className="text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Select an exam to start monitoring</h3>
          <p className="text-text-secondary">Real-time candidate activity will appear here</p>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Active Now', value: activeCount, icon: Activity, color: 'text-status-success' },
              { label: 'Total Attempts', value: attemptsData?.examAttempts?.length || 0, icon: Users, color: 'text-accent' },
              { label: 'Violations', value: violationCount, icon: AlertTriangle, color: violationCount > 0 ? 'text-status-error' : 'text-text-muted' },
              { label: 'Watching', value: liveCandidates.size, icon: Eye, color: 'text-status-info' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">{s.label}</span>
                  <s.icon size={15} className={s.color} />
                </div>
                <div className="text-3xl font-black">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidate list */}
            <div className="lg:col-span-2 card p-5">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Users size={16} className="text-accent" />
                Candidates ({candidates.length})
              </h3>
              {candidates.length === 0 ? (
                <div className="text-center py-12 text-text-muted text-sm">
                  Waiting for candidates to join...
                </div>
              ) : (
                <div className="space-y-2">
                  {candidates.map(c => (
                    <div key={c.userId} className={clsx(
                      'flex items-center gap-4 p-3 rounded-lg border transition-all',
                      c.violations.length >= 2
                        ? 'border-status-error/40 bg-status-error/5'
                        : c.violations.length === 1
                        ? 'border-status-warning/40 bg-status-warning/5'
                        : c.status === 'ACTIVE'
                        ? 'border-status-success/30 bg-status-success/5'
                        : 'border-bg-border bg-bg-hover opacity-60'
                    )}>
                      <div className={clsx(
                        'w-2 h-2 rounded-full shrink-0',
                        c.status === 'ACTIVE' ? 'bg-status-success' : 'bg-text-muted'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono">
                          {/* In real app, look up candidate name from DB */}
                          Candidate ...{c.userId.slice(-6)}
                        </div>
                        <div className="text-xs text-text-muted">
                          {c.status === 'ACTIVE'
                            ? `Active · seen ${formatDistanceToNow(c.lastSeen, { addSuffix: true })}`
                            : c.status === 'LEFT' ? 'Left the exam' : 'Inactive'
                          }
                        </div>
                      </div>
                      {c.violations.length > 0 && (
                        <div className={clsx(
                          'flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full',
                          c.violations.length >= 2 ? 'bg-status-error/20 text-status-error' : 'bg-status-warning/20 text-status-warning'
                        )}>
                          <AlertTriangle size={11} />
                          {c.violations.length} violation{c.violations.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alert log */}
            <div className="card p-5">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Activity size={16} className="text-accent" />
                Activity Log
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {alertLog.length === 0 ? (
                  <p className="text-text-muted text-xs text-center py-8">No activity yet</p>
                ) : (
                  alertLog.map((alert, i) => (
                    <div key={i} className={clsx(
                      'text-xs p-2.5 rounded-lg border',
                      alert.type === 'violation'
                        ? 'border-status-error/30 bg-status-error/5 text-status-error'
                        : alert.type === 'warning'
                        ? 'border-status-warning/30 bg-status-warning/5 text-status-warning'
                        : 'border-bg-border text-text-secondary'
                    )}>
                      <div>{alert.message}</div>
                      <div className="text-text-muted mt-0.5">
                        {formatDistanceToNow(alert.time, { addSuffix: true })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* DB attempts table */}
          {attemptsData?.examAttempts?.length > 0 && (
            <div className="card mt-6 overflow-hidden">
              <div className="p-4 border-b border-bg-border">
                <h3 className="font-bold">All Attempt Records</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bg-border">
                    {['Candidate', 'Status', 'Started', 'Violations', 'Score'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-border">
                  {attemptsData.examAttempts.map((a: any) => (
                    <tr key={a.id} className="hover:bg-bg-hover transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{a.candidate?.firstName} {a.candidate?.lastName}</div>
                        <div className="text-xs text-text-muted">{a.candidate?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'badge',
                          a.status === 'IN_PROGRESS' ? 'badge-orange' :
                          a.status === 'SUBMITTED' || a.status === 'EVALUATED' ? 'badge-success' :
                          a.isDisqualified ? 'badge-error' : 'badge-gray'
                        )}>
                          {a.isDisqualified ? 'DISQUALIFIED' : a.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {a.startedAt ? formatDistanceToNow(new Date(a.startedAt), { addSuffix: true }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {a.violationCount > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-status-warning">
                            <AlertTriangle size={11} /> {a.violationCount}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {a.result
                          ? <span className={clsx('font-bold text-sm', a.result.status === 'PASS' ? 'text-status-success' : 'text-status-error')}>
                              {a.result.percentage.toFixed(1)}%
                            </span>
                          : <span className="text-text-muted text-xs">Pending</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
