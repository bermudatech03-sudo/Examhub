'use client'
import { useParams } from 'next/navigation'
import { useQuery } from '@apollo/client'
import Link from 'next/link'
import { CheckCircle, XCircle, Award, Clock, BarChart3, ArrowLeft, Download, Share2 } from 'lucide-react'
import { clsx } from 'clsx'
import { GET_RESULT } from '@/lib/queries'
import { format } from 'date-fns'

export default function ResultPage() {
  const params = useParams()
  const { data, loading } = useQuery(GET_RESULT, { variables: { id: params.id } })
  const result = data?.result

  if (loading) return (
    <div className="p-8 max-w-4xl">
      <div className="space-y-5">
        {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    </div>
  )

  if (!result) return (
    <div className="p-8">
      <p className="text-text-secondary">Result not found.</p>
    </div>
  )

  const passed = result.status === 'PASS'
  const percentage = result.percentage.toFixed(1)

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/results" className="btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back to Results
        </Link>
      </div>

      {/* Result hero */}
      <div className={clsx(
        'card p-8 mb-6 border-2',
        passed ? 'border-status-success/30 bg-status-success/5' : 'border-status-error/30 bg-status-error/5'
      )}>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className={clsx(
            'w-24 h-24 rounded-full flex items-center justify-center shrink-0',
            passed ? 'bg-status-success/20 border-4 border-status-success' : 'bg-status-error/20 border-4 border-status-error'
          )}>
            {passed
              ? <CheckCircle size={40} className="text-status-success" />
              : <XCircle size={40} className="text-status-error" />
            }
          </div>
          <div className="text-center md:text-left flex-1">
            <div className={clsx('text-5xl font-black mb-1', passed ? 'text-status-success' : 'text-status-error')}>
              {percentage}%
            </div>
            <div className={clsx('text-xl font-bold mb-2', passed ? 'text-status-success' : 'text-status-error')}>
              {passed ? '🎉 Congratulations! You Passed!' : '❌ Better luck next time'}
            </div>
            <div className="text-text-secondary text-sm">
              {result.exam?.title} · {result.attempt?.candidate?.firstName} {result.attempt?.candidate?.lastName}
            </div>
            {result.gradedAt && (
              <div className="text-text-muted text-xs mt-1">
                Graded {format(new Date(result.gradedAt), 'MMM d, yyyy HH:mm')}
              </div>
            )}
          </div>
          {result.certificate && (
            <div className="flex flex-col gap-2">
              <a
                href={result.certificate.pdfUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary btn-sm"
              >
                <Download size={14} /> Download Certificate
              </a>
              <button className="btn-secondary btn-sm">
                <Share2 size={14} /> Share
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Score',
            value: `${result.earnedPoints.toFixed(1)} / ${result.totalPoints.toFixed(1)}`,
            icon: BarChart3,
            color: 'text-accent'
          },
          {
            label: 'Percentage',
            value: `${percentage}%`,
            icon: BarChart3,
            color: passed ? 'text-status-success' : 'text-status-error'
          },
          {
            label: 'Time Taken',
            value: result.timeTaken ? `${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s` : '—',
            icon: Clock,
            color: 'text-status-info'
          },
          {
            label: 'Rank',
            value: result.rank ? `#${result.rank}` : '—',
            icon: Award,
            color: 'text-status-warning'
          },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">{s.label}</span>
              <s.icon size={15} className={s.color} />
            </div>
            <div className="text-2xl font-black mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Percentile bar */}
      {result.percentile !== null && result.percentile !== undefined && (
        <div className="card p-6 mb-6">
          <h3 className="font-bold mb-4">Performance vs Others</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-text-muted mb-2">
                <span>0th percentile</span>
                <span className="text-accent font-bold">You: {result.percentile}th percentile</span>
                <span>100th percentile</span>
              </div>
              <div className="h-3 bg-bg-hover rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-1000"
                  style={{ width: `${result.percentile}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-3">
            You scored better than <span className="text-accent font-bold">{result.percentile}%</span> of all candidates who took this exam.
          </p>
        </div>
      )}

      {/* Feedback */}
      {result.feedback && (
        <div className="card p-6 mb-6">
          <h3 className="font-bold mb-3">Examiner Feedback</h3>
          <p className="text-text-secondary text-sm leading-relaxed">{result.feedback}</p>
        </div>
      )}

      {/* Certificate section */}
      {result.certificate && (
        <div className="card p-6 border-accent/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Award size={22} className="text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold">Certificate Issued</h3>
              <p className="text-text-secondary text-sm">
                Grade: <span className="text-accent font-bold">{result.certificate.grade}</span>
                {' · '}
                Verify Code: <span className="font-mono text-xs text-text-secondary">{result.certificate.verifyCode}</span>
              </p>
            </div>
            <a
              href={`/verify/${result.certificate.verifyCode}`}
              className="btn-ghost btn-sm"
              target="_blank"
            >
              Verify
            </a>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <Link href="/dashboard/exams" className="btn-secondary">
          Browse More Exams
        </Link>
        <Link href="/dashboard/results" className="btn-ghost">
          All Results
        </Link>
      </div>
    </div>
  )
}
