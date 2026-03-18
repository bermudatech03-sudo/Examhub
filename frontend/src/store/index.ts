import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  avatarUrl?: string
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'EXAMINER' | 'CANDIDATE'
  status: string
  organizationId?: string
  organization?: { id: string; name: string; slug: string; logoUrl?: string }
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => {
        localStorage.setItem('examhub_token', token)
        set({ token, user, isAuthenticated: true })
      },
      setUser: (user) => set({ user }),
      logout: () => {
        localStorage.removeItem('examhub_token')
        set({ token: null, user: null, isAuthenticated: false })
      }
    }),
    {
      name: 'examhub-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
)

// Exam attempt store
interface ExamState {
  currentAttemptId: string | null
  currentExamId: string | null
  violationCount: number
  isFullscreen: boolean
  timeRemaining: number | null
  setAttempt: (attemptId: string, examId: string) => void
  incrementViolation: () => void
  setFullscreen: (v: boolean) => void
  setTimeRemaining: (t: number) => void
  clearAttempt: () => void
}

export const useExamStore = create<ExamState>()((set) => ({
  currentAttemptId: null,
  currentExamId: null,
  violationCount: 0,
  isFullscreen: false,
  timeRemaining: null,
  setAttempt: (attemptId, examId) => set({ currentAttemptId: attemptId, currentExamId: examId, violationCount: 0 }),
  incrementViolation: () => set((s) => ({ violationCount: s.violationCount + 1 })),
  setFullscreen: (v) => set({ isFullscreen: v }),
  setTimeRemaining: (t) => set({ timeRemaining: t }),
  clearAttempt: () => set({ currentAttemptId: null, currentExamId: null, violationCount: 0, timeRemaining: null })
}))
