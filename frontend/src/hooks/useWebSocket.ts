'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'

type MessageHandler = (message: { type: string; payload: any }) => void

export function useWebSocket(examId?: string, attemptId?: string, role: 'CANDIDATE' | 'EXAMINER' = 'CANDIDATE') {
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef<Map<string, MessageHandler>>(new Map())
  const { token } = useAuthStore()
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_URL}/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      // Authenticate
      ws.send(JSON.stringify({
        type: 'AUTH',
        payload: { token, role, examId, attemptId }
      }))

      // Heartbeat every 30 seconds
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'HEARTBEAT', payload: {} }))
        }
      }, 30000)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const handler = handlersRef.current.get(message.type)
        if (handler) handler(message)

        // Wildcard handler
        const wildcardHandler = handlersRef.current.get('*')
        if (wildcardHandler) wildcardHandler(message)
      } catch {}
    }

    ws.onclose = () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      // Auto-reconnect after 3 seconds
      setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [token, examId, attemptId, role])

  useEffect(() => {
    connect()
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  const on = useCallback((type: string, handler: MessageHandler) => {
    handlersRef.current.set(type, handler)
    return () => handlersRef.current.delete(type)
  }, [])

  const off = useCallback((type: string) => {
    handlersRef.current.delete(type)
  }, [])

  return { send, on, off }
}
