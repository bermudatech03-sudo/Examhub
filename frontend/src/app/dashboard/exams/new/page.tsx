'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@apollo/client'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CREATE_EXAM_MUTATION, GET_QUESTIONS } from '@/lib/queries'

const defaultForm = {
  title: '',
  description: '',
  instructions: '',
  duration: 60,
  passingScore: 60,
  maxAttempts: 1,
  shuffleQuestions: false,
  shuffleOptions: false,
  showResults: true,
  showCorrectAnswers: false,
  isProctored: true,
  allowBacktrack: true,
  category: '',
  accessCode: '',
  startsAt: '',
  endsAt: '',
}

export default function CreateExamPage() {
  const router = useRouter()
  const [form, setForm] = useState(defaultForm)
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [qSearch, setQSearch] = useState('')

  const { data: questionsData } = useQuery(GET_QUESTIONS, {
    variables: { pagination: { pageSize: 50, search: qSearch || undefined } }
  })

  const [createExam, { loading }] = useMutation(CREATE_EXAM_MUTATION, {
    onCompleted: (data) => {
      toast.success('Exam created successfully!')
      router.push(`/dashboard/exams/${data.createExam.id}`)
    },
    onError: (e) => toast.error(e.message)
  })

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) return toast.error('Title is required')
    if (!form.duration) return toast.error('Duration is required')

    createExam({
      variables: {
        input: {
          ...form,
          duration: Number(form.duration),
          passingScore: Number(form.passingScore),
          maxAttempts: Number(form.maxAttempts),
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
          accessCode: form.accessCode || null,
          questionIds: selectedQuestions
        }
      }
    })
  }

  const questions = questionsData?.questions?.items || []

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/exams" className="btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back
        </Link>
        <div>
          <h1 className="text-3xl font-black">Create Exam</h1>
          <p className="text-text-secondary mt-0.5">Configure your exam settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Main settings */}
          <div className="lg:col-span-2 space-y-5">
            <div className="card p-6 space-y-4">
              <h2 className="font-bold text-lg border-b border-bg-border pb-3">Basic Information</h2>
              <div>
                <label className="label">Exam Title *</label>
                <input type="text" className="input" placeholder="e.g. JavaScript Fundamentals" value={form.title} onChange={f('title')} required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-[80px] resize-none" placeholder="Brief description for candidates..." value={form.description} onChange={f('description')} />
              </div>
              <div>
                <label className="label">Instructions</label>
                <textarea className="input min-h-[80px] resize-none" placeholder="Instructions shown before the exam starts..." value={form.instructions} onChange={f('instructions')} />
              </div>
              <div>
                <label className="label">Category</label>
                <input type="text" className="input" placeholder="e.g. Programming, Math, Science" value={form.category} onChange={f('category')} />
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="font-bold text-lg border-b border-bg-border pb-3">Timing & Access</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Duration (minutes) *</label>
                  <input type="number" className="input" min="1" value={form.duration} onChange={f('duration')} required />
                </div>
                <div>
                  <label className="label">Max Attempts</label>
                  <input type="number" className="input" min="1" max="10" value={form.maxAttempts} onChange={f('maxAttempts')} />
                </div>
                <div>
                  <label className="label">Passing Score (%)</label>
                  <input type="number" className="input" min="1" max="100" value={form.passingScore} onChange={f('passingScore')} />
                </div>
                <div>
                  <label className="label">Access Code (optional)</label>
                  <input type="text" className="input" placeholder="Leave empty for open access" value={form.accessCode} onChange={f('accessCode')} />
                </div>
                <div>
                  <label className="label">Starts At</label>
                  <input type="datetime-local" className="input" value={form.startsAt} onChange={f('startsAt')} />
                </div>
                <div>
                  <label className="label">Ends At</label>
                  <input type="datetime-local" className="input" value={form.endsAt} onChange={f('endsAt')} />
                </div>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="font-bold text-lg border-b border-bg-border pb-3">Exam Options</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'isProctored', label: 'Anti-cheat / Proctoring' },
                  { key: 'shuffleQuestions', label: 'Shuffle questions' },
                  { key: 'shuffleOptions', label: 'Shuffle answer options' },
                  { key: 'allowBacktrack', label: 'Allow backtracking' },
                  { key: 'showResults', label: 'Show results after submit' },
                  { key: 'showCorrectAnswers', label: 'Show correct answers' },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-3 p-3 rounded-lg bg-bg-hover cursor-pointer hover:bg-bg-border transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-[#ff9900]"
                      checked={(form as any)[opt.key]}
                      onChange={f(opt.key)}
                    />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Question selector */}
          <div className="space-y-5">
            <div className="card p-5 sticky top-4">
              <h2 className="font-bold mb-3">Questions ({selectedQuestions.length})</h2>
              <input
                type="text"
                className="input mb-3"
                placeholder="Search questions..."
                value={qSearch}
                onChange={e => setQSearch(e.target.value)}
              />
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {questions.length === 0 && (
                  <p className="text-text-muted text-xs text-center py-4">No questions found</p>
                )}
                {questions.map((q: any) => {
                  const selected = selectedQuestions.includes(q.id)
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setSelectedQuestions(prev =>
                        selected ? prev.filter(id => id !== q.id) : [...prev, q.id]
                      )}
                      className={`w-full text-left p-2.5 rounded-lg text-xs border transition-all ${
                        selected
                          ? 'border-accent/50 bg-accent/10 text-accent'
                          : 'border-bg-border hover:border-accent/30 hover:bg-bg-hover'
                      }`}
                    >
                      <div className="font-medium truncate">{q.title}</div>
                      <div className="text-text-muted mt-0.5 capitalize">
                        {q.type.replace('_', ' ')} · {q.difficulty} · {q.points}pt
                      </div>
                    </button>
                  )
                })}
              </div>
              {selectedQuestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-bg-border">
                  <p className="text-xs text-text-secondary">
                    {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                  </p>
                  <Link href="/dashboard/questions/new" className="text-xs text-accent hover:text-accent-hover mt-1 inline-block">
                    + Create new question
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/exams" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading
              ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              : <><Save size={15} /> Create Exam</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
