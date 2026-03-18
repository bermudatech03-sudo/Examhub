'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import Link from 'next/link'
import { PlusCircle, Search, Filter, FileText, Clock, Users, Eye, Trash2, Send } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { GET_EXAMS, DELETE_EXAM_MUTATION, PUBLISH_EXAM_MUTATION, GET_AVAILABLE_EXAMS } from '@/lib/queries'
import { useAuthStore } from '@/store'
import { formatDistanceToNow } from 'date-fns'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
}

const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'status-draft',
  PUBLISHED: 'status-published',
  ACTIVE: 'status-active',
  COMPLETED: 'status-completed',
  ARCHIVED: 'status-archived',
}

export default function ExamsPage() {
  const { user } = useAuthStore()
  const isCandidate = user?.role === 'CANDIDATE'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, loading, refetch } = useQuery(isCandidate ? GET_AVAILABLE_EXAMS : GET_EXAMS, {
    variables: isCandidate ? {} : {
      filter: statusFilter ? { status: statusFilter } : undefined,
      pagination: { search: search || undefined, pageSize: 50 }
    }
  })

  const [deleteExam] = useMutation(DELETE_EXAM_MUTATION, {
    onCompleted: () => { toast.success('Exam deleted'); refetch() },
    onError: (e) => toast.error(e.message)
  })

  const [publishExam] = useMutation(PUBLISH_EXAM_MUTATION, {
    onCompleted: () => { toast.success('Exam published!'); refetch() },
    onError: (e) => toast.error(e.message)
  })

  const exams = isCandidate
    ? (data?.availableExams || [])
    : (data?.exams?.items || [])

  return (
    <div className="p-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-black">
            {isCandidate ? 'Available Exams' : 'Exam Management'}
          </h1>
          <p className="text-text-secondary mt-1">
            {isCandidate
              ? `${exams.length} exam${exams.length !== 1 ? 's' : ''} available`
              : `${data?.exams?.total || 0} total exams`
            }
          </p>
        </div>
        {!isCandidate && (
          <Link href="/dashboard/exams/new" className="btn-primary">
            <PlusCircle size={16} /> Create Exam
          </Link>
        )}
      </div>

      {/* Filters */}
      {!isCandidate && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text" placeholder="Search exams..."
              className="input pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-48"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      )}

      {/* Exam grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-6 space-y-3">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={48} className="text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">
            {isCandidate ? 'No exams available' : 'No exams yet'}
          </h3>
          <p className="text-text-secondary mb-6">
            {isCandidate
              ? 'Check back later for available exams'
              : 'Create your first exam to get started'
            }
          </p>
          {!isCandidate && (
            <Link href="/dashboard/exams/new" className="btn-primary">
              <PlusCircle size={16} /> Create Your First Exam
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {exams.map((exam: any) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              isCandidate={isCandidate}
              onDelete={() => {
                if (confirm('Delete this exam permanently?')) {
                  deleteExam({ variables: { id: exam.id } })
                }
              }}
              onPublish={() => publishExam({ variables: { id: exam.id } })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ExamCard({ exam, isCandidate, onDelete, onPublish }: any) {
  const questionCount = exam.questions?.length || 0

  return (
    <div className="card-hover p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <FileText size={18} className="text-accent" />
        </div>
        {!isCandidate && (
          <span className={STATUS_CLASS[exam.status] || 'badge-gray'}>
            {STATUS_LABELS[exam.status] || exam.status}
          </span>
        )}
      </div>

      {/* Title */}
      <div>
        <h3 className="font-bold text-base leading-snug mb-1">{exam.title}</h3>
        {exam.description && (
          <p className="text-text-secondary text-xs line-clamp-2 leading-relaxed">{exam.description}</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <Clock size={11} /> {exam.duration}m
        </span>
        <span className="flex items-center gap-1">
          <FileText size={11} /> {questionCount} Q
        </span>
        {exam.attemptCount !== undefined && (
          <span className="flex items-center gap-1">
            <Users size={11} /> {exam.attemptCount} attempts
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-bg-border">
        {isCandidate ? (
          <Link href={`/exam/${exam.id}`} className="btn-primary btn-sm flex-1">
            Start Exam <Eye size={13} />
          </Link>
        ) : (
          <>
            <Link href={`/dashboard/exams/${exam.id}`} className="btn-secondary btn-sm flex-1">
              <Eye size={13} /> View
            </Link>
            {exam.status === 'DRAFT' && (
              <button onClick={onPublish} className="btn-sm btn bg-status-success/10 border border-status-success/30 text-status-success hover:bg-status-success hover:text-white">
                <Send size={13} /> Publish
              </button>
            )}
            <button onClick={onDelete} className="btn-sm btn bg-status-error/10 border border-status-error/20 text-status-error hover:bg-status-error hover:text-white">
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
