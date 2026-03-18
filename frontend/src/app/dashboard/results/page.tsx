'use client'
import { useQuery } from '@apollo/client'
import Link from 'next/link'
import { CheckCircle, XCircle, Clock, BarChart3, Award } from 'lucide-react'
import { clsx } from 'clsx'
import { GET_MY_RESULTS } from '@/lib/queries'
import { formatDistanceToNow } from 'date-fns'

export default function ResultsPage() {
  const { data, loading } = useQuery(GET_MY_RESULTS)
  const results = data?.myResults?.items || []

  return (
    <div className="p-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-black">My Results</h1>
          <p className="text-text-secondary mt-1">{data?.myResults?.total || 0} exam results</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20">
          <BarChart3 size={48} className="text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No results yet</h3>
          <p className="text-text-secondary mb-6">Take an exam to see your results here</p>
          <Link href="/dashboard/exams" className="btn-primary">Browse Exams</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result: any) => (
            <Link
              key={result.id}
              href={`/dashboard/results/${result.id}`}
              className="card-hover p-5 flex items-center gap-5"
            >
              <div className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                result.status === 'PASS' ? 'bg-status-success/10' : 'bg-status-error/10'
              )}>
                {result.status === 'PASS'
                  ? <CheckCircle size={22} className="text-status-success" />
                  : <XCircle size={22} className="text-status-error" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{result.exam?.title}</div>
                <div className="text-xs text-text-muted flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {result.timeTaken ? `${Math.floor(result.timeTaken / 60)}m` : '—'}
                  </span>
                  <span>{formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}</span>
                  {result.rank && <span>Rank #{result.rank}</span>}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className={clsx(
                  'text-2xl font-black',
                  result.status === 'PASS' ? 'text-status-success' : 'text-status-error'
                )}>
                  {result.percentage.toFixed(1)}%
                </div>
                <div className={clsx(
                  'text-xs font-semibold',
                  result.status === 'PASS' ? 'text-status-success' : 'text-status-error'
                )}>
                  {result.status}
                </div>
              </div>

              {result.certificate && (
                <Award size={18} className="text-accent shrink-0" aria-label="Certificate available" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
