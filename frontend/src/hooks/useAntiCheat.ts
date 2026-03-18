'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useMutation } from '@apollo/client'
import { LOG_VIOLATION_MUTATION } from '@/lib/queries'
import { useExamStore } from '@/store'
import toast from 'react-hot-toast'

const MAX_VIOLATIONS = 3

export function useAntiCheat(attemptId: string | null, enabled: boolean) {
  const { violationCount, incrementViolation } = useExamStore()
  const [logViolation] = useMutation(LOG_VIOLATION_MUTATION)
  const warnedRef = useRef(false)

  const reportViolation = useCallback(async (type: string, description: string) => {
    if (!attemptId || !enabled) return

    incrementViolation()
    const newCount = violationCount + 1

    const remaining = MAX_VIOLATIONS - newCount
    if (remaining > 0) {
      toast.error(`⚠️ Violation: ${description}. ${remaining} warning${remaining !== 1 ? 's' : ''} remaining before auto-submit.`, {
        duration: 4000
      })
    } else {
      toast.error('❌ Maximum violations reached. Exam will be auto-submitted.', { duration: 5000 })
    }

    try {
      await logViolation({
        variables: {
          input: { attemptId, type, description }
        }
      })
    } catch {
      // Silently fail - violation count still tracked locally
    }
  }, [attemptId, enabled, violationCount, incrementViolation, logViolation])

  // Tab switching / visibility change
  useEffect(() => {
    if (!enabled || !attemptId) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation('TAB_SWITCH', 'Left exam tab or switched window')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled, attemptId, reportViolation])

  // Fullscreen exit
  useEffect(() => {
    if (!enabled || !attemptId) return

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !warnedRef.current) {
        warnedRef.current = true
        reportViolation('FULLSCREEN_EXIT', 'Exited fullscreen mode')
        setTimeout(() => { warnedRef.current = false }, 3000)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [enabled, attemptId, reportViolation])

  // Right click
  useEffect(() => {
    if (!enabled || !attemptId) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      reportViolation('RIGHT_CLICK', 'Right-click menu triggered')
    }

    document.addEventListener('contextmenu', handleContextMenu)
    return () => document.removeEventListener('contextmenu', handleContextMenu)
  }, [enabled, attemptId, reportViolation])

  // Copy/paste
  useEffect(() => {
    if (!enabled || !attemptId) return

    const handleCopy = () => reportViolation('COPY_PASTE', 'Text copied from exam')
    const handlePaste = () => reportViolation('COPY_PASTE', 'Text pasted into exam')

    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
    }
  }, [enabled, attemptId, reportViolation])

  // Keyboard shortcuts
  useEffect(() => {
    if (!enabled || !attemptId) return

    const blockedKeys = new Set([
      'F12', // DevTools
      'PrintScreen',
    ])

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block DevTools shortcuts
      if (e.key === 'F12') {
        e.preventDefault()
        reportViolation('KEYBOARD_SHORTCUT', 'Attempted to open Developer Tools (F12)')
        return
      }

      // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
        e.preventDefault()
        reportViolation('KEYBOARD_SHORTCUT', 'Attempted to open DevTools (Ctrl+Shift+I/J/C)')
        return
      }

      // Block Ctrl+U (view source)
      if (e.ctrlKey && e.key.toLowerCase() === 'u') {
        e.preventDefault()
        reportViolation('KEYBOARD_SHORTCUT', 'Attempted to view page source (Ctrl+U)')
        return
      }

      // Block Alt+Tab (we can warn but can't prevent)
      if (blockedKeys.has(e.key)) {
        e.preventDefault()
        reportViolation('KEYBOARD_SHORTCUT', `Blocked key: ${e.key}`)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, attemptId, reportViolation])

  return { violationCount, reportViolation }
}

// Fullscreen utilities
export function requestFullscreen(element?: Element) {
  const el = element || document.documentElement
  if (el.requestFullscreen) {
    return el.requestFullscreen()
  }
  return Promise.resolve()
}

export function exitFullscreen() {
  if (document.exitFullscreen) {
    return document.exitFullscreen()
  }
  return Promise.resolve()
}

export function isFullscreen() {
  return !!document.fullscreenElement
}
