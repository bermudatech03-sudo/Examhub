'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import Link from 'next/link'
import { PlusCircle, Search, BookOpen, Trash2, Edit, Code2, AlignLeft, CheckSquare, ToggleLeft } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { GET_QUESTIONS, DELETE_QUESTION_MUTATION, GET_TAGS } from '@/lib/queries'

const TYPE_ICONS: Record<string, any> = {
  MULTIPLE_CHOICE: CheckSquare,
  TRUE_FALSE: ToggleLeft,
  SHORT_ANSWER: AlignLeft,
  ESSAY: AlignLeft,
  CODING: Code2,
}

const DIFF_CLASS: Record<string, string> = {
  EASY: 'diff-easy',
  MEDIUM: 'diff-medium',
  HARD: 'diff-hard',
  EXPERT: 'diff-expert',
}

export default function QuestionsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [diffFilter, setDiffFilter] = useState('')

  const { data, loading, refetch } = useQuery(GET_QUESTIONS, {
    variables: {
      filter: {
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(diffFilter ? { difficulty: diffFilter } : {}),
      },
      pagination: { search: search || undefined, pageSize: 50 }
    }
  })

  const { data: tagsData } = useQuery(GET_TAGS)

  const [deleteQuestion] = useMutation(DELETE_QUESTION_MUTATION, {
    onCompleted: () => { toast.success('Question deleted'); refetch() },
    onError: (e) => toast.error(e.message)
  })

  const questions = data?.questions?.items || []

  return (
    <div className="p-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-black">Question Bank</h1>
          <p className="text-text-secondary mt-1">{data?.questions?.total || 0} questions</p>
        </div>
        <Link href="/dashboard/questions/new" className="btn-primary">
          <PlusCircle size={16} /> Add Question
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search questions..."
            className="input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-44" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
          <option value="TRUE_FALSE">True / False</option>
          <option value="SHORT_ANSWER">Short Answer</option>
          <option value="ESSAY">Essay</option>
          <option value="CODING">Coding</option>
        </select>
        <select className="input w-40" value={diffFilter} onChange={e => setDiffFilter(e.target.value)}>
          <option value="">All Difficulty</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
          <option value="EXPERT">Expert</option>
        </select>
      </div>

      {/* Questions table */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={48} className="text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No questions yet</h3>
          <p className="text-text-secondary mb-6">Add questions to your bank to start building exams</p>
          <Link href="/dashboard/questions/new" className="btn-primary">
            <PlusCircle size={16} /> Create First Question
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Question</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide hidden lg:table-cell">Difficulty</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide hidden lg:table-cell">Points</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide hidden xl:table-cell">Tags</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {questions.map((q: any) => {
                const TypeIcon = TYPE_ICONS[q.type] || BookOpen
                return (
                  <tr key={q.id} className="hover:bg-bg-hover transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-medium leading-snug line-clamp-2 max-w-md">{q.title}</div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <TypeIcon size={13} className="text-accent" />
                        <span className="text-xs capitalize">{q.type.replace(/_/g, ' ').toLowerCase()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className={DIFF_CLASS[q.difficulty] || 'badge-gray'}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-text-secondary text-xs">{q.points} pts</span>
                    </td>
                    <td className="px-4 py-4 hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {q.tags?.slice(0, 3).map((tag: any) => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded-full text-xs border"
                            style={{ borderColor: tag.color + '44', color: tag.color, backgroundColor: tag.color + '11' }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/dashboard/questions/${q.id}/edit`} className="btn-ghost btn-sm p-2">
                          <Edit size={14} />
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm('Delete this question?')) {
                              deleteQuestion({ variables: { id: q.id } })
                            }
                          }}
                          className="btn-sm btn bg-transparent text-text-muted hover:text-status-error hover:bg-status-error/10 border-0 p-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
