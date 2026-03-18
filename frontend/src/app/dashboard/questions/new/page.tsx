'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@apollo/client'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Save, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { CREATE_QUESTION_MUTATION, GET_TAGS } from '@/lib/queries'

const QUESTION_TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'TRUE_FALSE', label: 'True / False' },
  { value: 'SHORT_ANSWER', label: 'Short Answer' },
  { value: 'ESSAY', label: 'Essay' },
  { value: 'CODING', label: 'Coding' },
]

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'EXPERT']
const CODING_LANGUAGES = ['PYTHON', 'JAVA', 'CPP', 'JAVASCRIPT']

export default function CreateQuestionPage() {
  const router = useRouter()
  const { data: tagsData } = useQuery(GET_TAGS)

  const [form, setForm] = useState({
    type: 'MULTIPLE_CHOICE',
    difficulty: 'MEDIUM',
    title: '',
    content: '',
    explanation: '',
    points: 1,
    timeLimit: '',
    subject: '',
    isPublic: false,
  })

  const [options, setOptions] = useState([
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
  ])

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const [codingProblem, setCodingProblem] = useState({
    languages: ['PYTHON'],
    boilerplate: { PYTHON: '# Write your solution here\n', JAVASCRIPT: '// Write your solution here\n', JAVA: '// Write your solution here\n', CPP: '// Write your solution here\n' },
    testCases: [{ input: '', expectedOutput: '', isHidden: false }],
    timeLimit: 5000,
    memoryLimit: 256,
  })

  const [createQuestion, { loading }] = useMutation(CREATE_QUESTION_MUTATION, {
    onCompleted: () => {
      toast.success('Question created!')
      router.push('/dashboard/questions')
    },
    onError: (e) => toast.error(e.message)
  })

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({
      ...prev,
      [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.content) return toast.error('Title and content are required')

    const input: any = {
      ...form,
      points: Number(form.points),
      timeLimit: form.timeLimit ? Number(form.timeLimit) : null,
      tagIds: selectedTagIds,
    }

    if (form.type === 'MULTIPLE_CHOICE' || form.type === 'TRUE_FALSE') {
      const validOptions = options.filter(o => o.content.trim())
      if (validOptions.length < 2) return toast.error('Add at least 2 options')
      if (!validOptions.some(o => o.isCorrect)) return toast.error('Mark at least one correct answer')
      input.options = validOptions.map((o, i) => ({ ...o, orderIndex: i }))
    }

    if (form.type === 'CODING') {
      input.codingProblem = {
        ...codingProblem,
        testCases: codingProblem.testCases.filter(tc => tc.input !== '' || tc.expectedOutput !== '')
      }
    }

    createQuestion({ variables: { input } })
  }

  const trueFalseOptions = [
    { content: 'True', isCorrect: options[0]?.isCorrect ?? false },
    { content: 'False', isCorrect: options[1]?.isCorrect ?? true },
  ]

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/questions" className="btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back
        </Link>
        <div>
          <h1 className="text-3xl font-black">Create Question</h1>
          <p className="text-text-secondary mt-0.5">Add a question to your bank</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type & meta */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-lg border-b border-bg-border pb-3">Question Settings</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Question Type *</label>
              <select className="input" value={form.type} onChange={f('type')}>
                {QUESTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={form.difficulty} onChange={f('difficulty')}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Points</label>
              <input type="number" className="input" min="0.5" step="0.5" value={form.points} onChange={f('points')} />
            </div>
            <div>
              <label className="label">Time Limit (sec)</label>
              <input type="number" className="input" placeholder="Optional" value={form.timeLimit} onChange={f('timeLimit')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Subject / Topic</label>
              <input type="text" className="input" placeholder="e.g. JavaScript, Algebra" value={form.subject} onChange={f('subject')} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#ff9900]" checked={form.isPublic} onChange={f('isPublic')} />
                <span className="text-sm font-medium">Make question public (visible to all examiners)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Question content */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-lg border-b border-bg-border pb-3">Question Content</h2>
          <div>
            <label className="label">Question Title *</label>
            <input type="text" className="input" placeholder="Short descriptive title" value={form.title} onChange={f('title')} required />
          </div>
          <div>
            <label className="label">Question Text *</label>
            <textarea
              className="input min-h-[120px] resize-none"
              placeholder="Write the full question text here..."
              value={form.content}
              onChange={f('content')}
              required
            />
          </div>
          <div>
            <label className="label">Explanation (shown after submission)</label>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="Explain the correct answer..."
              value={form.explanation}
              onChange={f('explanation')}
            />
          </div>
        </div>

        {/* Options for MCQ */}
        {form.type === 'MULTIPLE_CHOICE' && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-bg-border pb-3">
              <h2 className="font-bold text-lg">Answer Options</h2>
              <button
                type="button"
                onClick={() => setOptions(prev => [...prev, { content: '', isCorrect: false }])}
                className="btn-ghost btn-sm"
              >
                <Plus size={14} /> Add Option
              </button>
            </div>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOptions(prev => prev.map((o, i) => ({
                    ...o,
                    isCorrect: i === idx ? !o.isCorrect : o.isCorrect
                  })))}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    opt.isCorrect ? 'border-status-success bg-status-success' : 'border-bg-border hover:border-status-success/50'
                  }`}
                >
                  {opt.isCorrect && <CheckCircle size={12} className="text-white" />}
                </button>
                <input
                  type="text"
                  className="input flex-1"
                  placeholder={`Option ${idx + 1}`}
                  value={opt.content}
                  onChange={e => setOptions(prev => prev.map((o, i) => i === idx ? { ...o, content: e.target.value } : o))}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptions(prev => prev.filter((_, i) => i !== idx))}
                    className="text-text-muted hover:text-status-error transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <p className="text-xs text-text-muted">Click the circle to mark the correct answer(s)</p>
          </div>
        )}

        {/* True/False */}
        {form.type === 'TRUE_FALSE' && (
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg border-b border-bg-border pb-3">Correct Answer</h2>
            <div className="flex gap-4">
              {['True', 'False'].map((val, idx) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setOptions([
                    { content: 'True', isCorrect: idx === 0 },
                    { content: 'False', isCorrect: idx === 1 }
                  ])}
                  className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all ${
                    options[idx]?.isCorrect
                      ? 'border-status-success bg-status-success/10 text-status-success'
                      : 'border-bg-border hover:border-accent/30'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Coding problem */}
        {form.type === 'CODING' && (
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg border-b border-bg-border pb-3">Coding Problem Setup</h2>

            {/* Languages */}
            <div>
              <label className="label">Supported Languages</label>
              <div className="flex flex-wrap gap-2">
                {CODING_LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setCodingProblem(prev => ({
                      ...prev,
                      languages: prev.languages.includes(lang)
                        ? prev.languages.filter(l => l !== lang)
                        : [...prev.languages, lang]
                    }))}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      codingProblem.languages.includes(lang)
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-bg-border text-text-secondary hover:border-accent/30'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Time Limit (ms)</label>
                <input
                  type="number" className="input" value={codingProblem.timeLimit}
                  onChange={e => setCodingProblem(p => ({ ...p, timeLimit: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label">Memory Limit (MB)</label>
                <input
                  type="number" className="input" value={codingProblem.memoryLimit}
                  onChange={e => setCodingProblem(p => ({ ...p, memoryLimit: Number(e.target.value) }))}
                />
              </div>
            </div>

            {/* Test cases */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="label !mb-0">Test Cases</label>
                <button
                  type="button"
                  onClick={() => setCodingProblem(p => ({
                    ...p,
                    testCases: [...p.testCases, { input: '', expectedOutput: '', isHidden: false }]
                  }))}
                  className="btn-ghost btn-sm"
                >
                  <Plus size={13} /> Add Test Case
                </button>
              </div>
              <div className="space-y-3">
                {codingProblem.testCases.map((tc, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-3 p-3 bg-bg-hover rounded-lg border border-bg-border">
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Input</label>
                      <textarea
                        className="input min-h-[60px] text-xs font-mono resize-none"
                        placeholder="stdin input"
                        value={tc.input}
                        onChange={e => setCodingProblem(p => ({
                          ...p,
                          testCases: p.testCases.map((t, i) => i === idx ? { ...t, input: e.target.value } : t)
                        }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Expected Output</label>
                      <textarea
                        className="input min-h-[60px] text-xs font-mono resize-none"
                        placeholder="expected stdout"
                        value={tc.expectedOutput}
                        onChange={e => setCodingProblem(p => ({
                          ...p,
                          testCases: p.testCases.map((t, i) => i === idx ? { ...t, expectedOutput: e.target.value } : t)
                        }))}
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-[#ff9900]"
                          checked={tc.isHidden}
                          onChange={e => setCodingProblem(p => ({
                            ...p,
                            testCases: p.testCases.map((t, i) => i === idx ? { ...t, isHidden: e.target.checked } : t)
                          }))}
                        />
                        <span className="text-text-secondary">Hidden test case (not shown to candidate)</span>
                      </label>
                      {codingProblem.testCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCodingProblem(p => ({ ...p, testCases: p.testCases.filter((_, i) => i !== idx) }))}
                          className="text-text-muted hover:text-status-error transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {tagsData?.tags?.length > 0 && (
          <div className="card p-6 space-y-3">
            <h2 className="font-bold text-lg border-b border-bg-border pb-3">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tagsData.tags.map((tag: any) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedTagIds(prev =>
                    prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                  )}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    selectedTagIds.includes(tag.id)
                      ? 'opacity-100'
                      : 'opacity-50 hover:opacity-80'
                  }`}
                  style={{
                    borderColor: tag.color + '55',
                    color: selectedTagIds.includes(tag.id) ? tag.color : '#aaa',
                    backgroundColor: selectedTagIds.includes(tag.id) ? tag.color + '18' : 'transparent'
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/questions" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading
              ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              : <><Save size={15} /> Save Question</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
