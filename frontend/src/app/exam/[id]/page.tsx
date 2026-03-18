'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Clock, Flag, ChevronLeft, ChevronRight, Send,
  AlertTriangle, CheckCircle, Code2, FileText, LayoutGrid
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  GET_EXAM, START_ATTEMPT_MUTATION, SUBMIT_ANSWER_MUTATION,
  SUBMIT_ATTEMPT_MUTATION, EXECUTE_CODE_MUTATION
} from '@/lib/queries'
import { useExamStore } from '@/store'
import { useAntiCheat, requestFullscreen } from '@/hooks/useAntiCheat'
import { useWebSocket } from '@/hooks/useWebSocket'
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

export default function ExamPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.id as string

  const { data: examData } = useQuery(GET_EXAM, { variables: { id: examId } })
  const exam = examData?.exam

  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [started, setStarted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const { setAttempt, setTimeRemaining, timeRemaining, violationCount, clearAttempt } = useExamStore()

  const { send } = useWebSocket(examId, attemptId || undefined, 'CANDIDATE')

  const [startAttempt] = useMutation(START_ATTEMPT_MUTATION)
  const [submitAnswer] = useMutation(SUBMIT_ANSWER_MUTATION)
  const [submitAttempt] = useMutation(SUBMIT_ATTEMPT_MUTATION)
  const [executeCode] = useMutation(EXECUTE_CODE_MUTATION)

  const { violationCount: antiCheatCount } = useAntiCheat(
    attemptId,
    started && (exam?.isProctored ?? true)
  )

  // Timer countdown
  useEffect(() => {
    if (!started || !timeRemaining) return

    timerRef.current = setInterval(() => {
      setTimeRemaining(timeRemaining - 1)
      if (timeRemaining <= 1) {
        clearInterval(timerRef.current!)
        handleAutoSubmit()
      }
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [started, timeRemaining])

  // Auto-submit on max violations
  useEffect(() => {
    if (antiCheatCount >= 3 && started && attemptId) {
      handleAutoSubmit()
    }
  }, [antiCheatCount])

  const handleStart = async () => {
    try {
      const result = await startAttempt({
        variables: { examId, accessCode: accessCode || undefined }
      })
      const attempt = result.data.startAttempt
      setAttemptId(attempt.id)
      setAttempt(attempt.id, examId)
      setTimeRemaining(exam!.duration * 60)

      // Pre-populate existing answers
      const existingAnswers: Record<string, any> = {}
      attempt.answers?.forEach((a: any) => {
        existingAnswers[a.questionId] = {
          selectedOptions: a.selectedOptions || [],
          textAnswer: a.textAnswer || '',
          code: ''
        }
      })
      setAnswers(existingAnswers)

      setStarted(true)

      // Request fullscreen if proctored
      if (exam?.isProctored) {
        await requestFullscreen().catch(() => {})
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleAnswerChange = useCallback(async (
    questionId: string,
    type: string,
    value: any
  ) => {
    const newAnswers = { ...answers, [questionId]: { ...answers[questionId], ...value } }
    setAnswers(newAnswers)

    if (!attemptId) return

    try {
      await submitAnswer({
        variables: {
          input: {
            attemptId,
            questionId,
            selectedOptions: newAnswers[questionId]?.selectedOptions || [],
            textAnswer: newAnswers[questionId]?.textAnswer || null
          }
        }
      })
    } catch {}
  }, [answers, attemptId, submitAnswer])

  const handleRunCode = async (questionId: string, language: string, code: string) => {
    if (!attemptId) return
    try {
      const result = await executeCode({
        variables: { input: { attemptId, questionId, language, code } }
      })
      return result.data.executeCode
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleSubmit = async () => {
    if (!attemptId || submitting) return
    if (!confirm('Are you sure you want to submit the exam? This cannot be undone.')) return
    handleAutoSubmit()
  }

  const handleAutoSubmit = async () => {
    if (!attemptId || submitting) return
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)

    try {
      const result = await submitAttempt({ variables: { attemptId } })
      clearAttempt()
      toast.success('Exam submitted!')
      router.push(`/dashboard/results/${result.data.submitAttempt.id}`)
    } catch (err: any) {
      toast.error(err.message)
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (!exam) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  )

  const questions = exam.questions || []
  const currentQuestion = questions[currentIdx]?.question

  // Pre-exam screen
  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-bg-primary">
        <div className="max-w-2xl w-full">
          <div className="card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <FileText size={22} className="text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-black">{exam.title}</h1>
                <p className="text-text-secondary">{exam.organization?.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: 'Duration', value: `${exam.duration} minutes` },
                { label: 'Questions', value: questions.length },
                { label: 'Passing Score', value: `${exam.passingScore}%` },
                { label: 'Max Attempts', value: exam.maxAttempts },
              ].map(item => (
                <div key={item.label} className="bg-bg-hover rounded-lg p-3">
                  <div className="text-xs text-text-muted">{item.label}</div>
                  <div className="font-bold mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>

            {exam.instructions && (
              <div className="bg-bg-hover rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-accent mb-2">Instructions</h3>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{exam.instructions}</p>
              </div>
            )}

            {exam.isProctored && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-status-warning/10 border border-status-warning/30 mb-6">
                <AlertTriangle size={18} className="text-status-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-status-warning mb-1">Proctored Exam</p>
                  <p className="text-text-secondary">
                    This exam monitors for cheating. Tab switching, right-clicking, copying, and keyboard shortcuts are prohibited.
                    <strong className="text-status-warning"> 3 violations will auto-submit the exam.</strong>
                  </p>
                </div>
              </div>
            )}

            {exam.accessCode && (
              <div className="mb-6">
                <label className="label">Access Code</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter exam access code"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                />
              </div>
            )}

            <button onClick={handleStart} className="btn-primary w-full btn-lg">
              Start Exam <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active exam
  return (
    <div className="exam-fullscreen flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3 bg-bg-secondary border-b border-bg-border shrink-0">
        <div className="font-black text-sm truncate flex-1">{exam.title}</div>

        {/* Violation indicator */}
        {exam.isProctored && (
          <div className={clsx(
            'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
            antiCheatCount === 0
              ? 'border-status-success/30 bg-status-success/10 text-status-success'
              : antiCheatCount === 1
              ? 'border-status-warning/30 bg-status-warning/10 text-status-warning'
              : 'border-status-error/30 bg-status-error/10 text-status-error'
          )}>
            <AlertTriangle size={12} />
            {antiCheatCount}/3 violations
          </div>
        )}

        {/* Timer */}
        <div className={clsx(
          'flex items-center gap-2 font-mono font-bold px-4 py-1.5 rounded-lg border text-sm',
          timeRemaining && timeRemaining <= 300
            ? 'border-status-error/50 bg-status-error/10 text-status-error timer-danger'
            : 'border-bg-border bg-bg-hover text-text-primary'
        )}>
          <Clock size={14} />
          {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
        </div>

        {/* Progress */}
        <div className="text-xs text-text-secondary">
          {currentIdx + 1} / {questions.length}
        </div>

        <button
          onClick={() => setShowGrid(!showGrid)}
          className="btn-ghost btn-sm"
          title="Question grid"
        >
          <LayoutGrid size={16} />
        </button>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary btn-sm"
        >
          {submitting
            ? <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            : <><Send size={13} /> Submit</>
          }
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Question nav sidebar */}
        {showGrid && (
          <div className="w-64 bg-bg-secondary border-r border-bg-border p-4 overflow-y-auto shrink-0">
            <h3 className="text-xs font-semibold text-text-muted uppercase mb-3">Questions</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((eq: any, idx: number) => {
                const ans = answers[eq.question.id]
                const hasAnswer = ans?.selectedOptions?.length > 0 || ans?.textAnswer || ans?.code
                const flagged = ans?.flagged
                return (
                  <button
                    key={eq.id}
                    onClick={() => { setCurrentIdx(idx); setShowGrid(false) }}
                    className={clsx(
                      'w-full aspect-square rounded text-xs font-bold border transition-all',
                      idx === currentIdx
                        ? 'bg-accent text-black border-accent'
                        : flagged
                        ? 'bg-status-warning/20 border-status-warning/50 text-status-warning'
                        : hasAnswer
                        ? 'bg-status-success/10 border-status-success/30 text-status-success'
                        : 'bg-bg-hover border-bg-border text-text-muted hover:border-accent/30'
                    )}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-text-secondary">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-status-success/20 border border-status-success/30" /> Answered</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-status-warning/20 border border-status-warning/30" /> Flagged</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-bg-hover border border-bg-border" /> Unanswered</div>
            </div>
          </div>
        )}

        {/* Main question area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {currentQuestion && (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-8 max-w-4xl mx-auto"
              >
                {/* Question header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-text-muted">Q{currentIdx + 1}</span>
                    <span className={`diff-${currentQuestion.difficulty.toLowerCase()}`}>
                      {currentQuestion.difficulty}
                    </span>
                    <span className="badge-gray capitalize">
                      {currentQuestion.type.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    <span className="text-xs text-text-muted">{currentQuestion.points} pts</span>
                  </div>
                  <button
                    onClick={() => handleAnswerChange(currentQuestion.id, '', {
                      flagged: !answers[currentQuestion.id]?.flagged
                    })}
                    className={clsx(
                      'btn-ghost btn-sm gap-1.5',
                      answers[currentQuestion.id]?.flagged && 'text-status-warning'
                    )}
                  >
                    <Flag size={14} />
                    {answers[currentQuestion.id]?.flagged ? 'Flagged' : 'Flag'}
                  </button>
                </div>

                {/* Question content */}
                <div className="mb-8">
                  <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.content}
                  </p>
                </div>

                {/* Answer area */}
                <QuestionAnswerArea
                  question={currentQuestion}
                  answer={answers[currentQuestion.id] || {}}
                  onChange={(val) => handleAnswerChange(currentQuestion.id, currentQuestion.type, val)}
                  onRunCode={(lang, code) => handleRunCode(currentQuestion.id, lang, code)}
                  attemptId={attemptId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-8 py-4 bg-bg-secondary border-t border-bg-border shrink-0">
        <button
          onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
          disabled={currentIdx === 0 || !exam.allowBacktrack}
          className="btn-secondary btn-sm"
        >
          <ChevronLeft size={15} /> Previous
        </button>

        <div className="text-sm text-text-secondary">
          {Object.values(answers).filter((a: any) => a?.selectedOptions?.length > 0 || a?.textAnswer).length} of {questions.length} answered
        </div>

        {currentIdx < questions.length - 1 ? (
          <button onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))} className="btn-primary btn-sm">
            Next <ChevronRight size={15} />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary btn-sm">
            <Send size={15} /> Submit Exam
          </button>
        )}
      </div>
    </div>
  )
}

function QuestionAnswerArea({ question, answer, onChange, onRunCode, attemptId }: any) {
  const [codeResults, setCodeResults] = useState<any>(null)
  const [runningCode, setRunningCode] = useState(false)
  const [selectedLang, setSelectedLang] = useState(question.codingProblem?.languages?.[0] || 'PYTHON')

  const LANG_MAP: Record<string, string> = {
    PYTHON: 'python',
    JAVA: 'java',
    CPP: 'cpp',
    JAVASCRIPT: 'javascript'
  }

  if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
    return (
      <div className="space-y-3">
        {question.options?.map((opt: any) => {
          const selected = (answer.selectedOptions || []).includes(opt.id)
          return (
            <button
              key={opt.id}
              onClick={() => onChange({ selectedOptions: [opt.id] })}
              className={clsx(
                'w-full text-left p-4 rounded-xl border transition-all',
                selected
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-bg-border bg-bg-card hover:border-accent/40 hover:bg-bg-hover text-text-primary'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                  selected ? 'border-accent bg-accent' : 'border-bg-border'
                )}>
                  {selected && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>
                <span className="text-sm font-medium">{opt.content}</span>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  if (question.type === 'SHORT_ANSWER' || question.type === 'ESSAY') {
    return (
      <textarea
        className="input min-h-[200px] resize-y font-mono text-sm"
        placeholder={question.type === 'SHORT_ANSWER' ? 'Type your answer here...' : 'Write your essay here...'}
        value={answer.textAnswer || ''}
        onChange={e => onChange({ textAnswer: e.target.value })}
      />
    )
  }

  if (question.type === 'CODING') {
    const problem = question.codingProblem
    const boilerplate = problem?.boilerplate?.[selectedLang] || ''
    const code = answer.code || boilerplate

    return (
      <div className="space-y-4">
        {/* Language selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">Language:</span>
          {problem?.languages?.map((lang: string) => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-bold border transition-all',
                selectedLang === lang
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-bg-border text-text-secondary hover:border-accent/30'
              )}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Code editor */}
        <div className="border border-bg-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-bg-hover border-b border-bg-border">
            <Code2 size={14} className="text-accent" />
            <span className="text-xs font-mono text-text-secondary">solution.{LANG_MAP[selectedLang]}</span>
          </div>
          <MonacoEditor
            height="350px"
            language={LANG_MAP[selectedLang]}
            value={code}
            onChange={(val) => onChange({ code: val || '' })}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              glyphMargin: false,
              folding: false,
              lineDecorationsWidth: 0,
              renderLineHighlight: 'line'
            }}
          />
        </div>

        {/* Run button */}
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setRunningCode(true)
              const result = await onRunCode(selectedLang, code)
              setCodeResults(result)
              setRunningCode(false)
            }}
            disabled={runningCode}
            className="btn-secondary btn-sm"
          >
            {runningCode
              ? <><span className="w-3 h-3 border-2 border-text-secondary/30 border-t-text-secondary rounded-full animate-spin" /> Running...</>
              : <><Code2 size={13} /> Run Code</>
            }
          </button>
          {codeResults && (
            <span className={clsx(
              'text-xs font-bold',
              codeResults.status === 'ACCEPTED' ? 'text-status-success' : 'text-status-error'
            )}>
              {codeResults.status.replace(/_/g, ' ')}
              {codeResults.executionTime && ` · ${codeResults.executionTime}ms`}
            </span>
          )}
        </div>

        {/* Test results */}
        {codeResults?.testResults && (
          <div className="card p-4 space-y-2">
            <h4 className="text-sm font-bold mb-2">Test Results</h4>
            {codeResults.testResults.map((tr: any, i: number) => (
              <div key={i} className={clsx(
                'flex items-center gap-3 p-2.5 rounded-lg text-xs border',
                tr.passed
                  ? 'border-status-success/30 bg-status-success/5'
                  : 'border-status-error/30 bg-status-error/5'
              )}>
                {tr.passed
                  ? <CheckCircle size={13} className="text-status-success shrink-0" />
                  : <AlertTriangle size={13} className="text-status-error shrink-0" />
                }
                <span className="text-text-secondary">Test {i + 1}:</span>
                <span className={tr.passed ? 'text-status-success' : 'text-status-error'}>
                  {tr.passed ? 'Passed' : `Expected: ${tr.expectedOutput} | Got: ${tr.actualOutput}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error message */}
        {codeResults?.error && (
          <div className="card p-4 border-status-error/30 bg-status-error/5">
            <h4 className="text-xs font-bold text-status-error mb-1">Error</h4>
            <pre className="text-xs text-text-secondary font-mono overflow-x-auto">{codeResults.error}</pre>
          </div>
        )}
      </div>
    )
  }

  return null
}
