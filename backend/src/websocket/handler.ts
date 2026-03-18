import { FastifyInstance } from 'fastify'
import { WebSocket } from 'ws'

interface ProctorClient {
  ws: WebSocket
  userId: string
  examId?: string
  attemptId?: string
  role: 'CANDIDATE' | 'EXAMINER'
}

// In-memory store for active connections
const clients = new Map<string, ProctorClient>()
const examRooms = new Map<string, Set<string>>() // examId -> Set of clientIds

export function registerWebSocketHandlers(fastify: FastifyInstance) {
  fastify.get('/ws', { websocket: true }, (socket, request) => {
    const clientId = `client_${Date.now()}_${Math.random()}`

    socket.on('message', async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString())

        switch (message.type) {
          case 'AUTH': {
            const { token, role, examId, attemptId } = message.payload

            // Verify JWT
            let userId: string
            try {
              const decoded = fastify.jwt.verify<{ sub: string }>(token)
              userId = decoded.sub
            } catch {
              socket.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid token' } }))
              socket.close()
              return
            }

            const client: ProctorClient = {
              ws: socket,
              userId,
              examId,
              attemptId,
              role
            }
            clients.set(clientId, client)

            // Join exam room
            if (examId) {
              if (!examRooms.has(examId)) {
                examRooms.set(examId, new Set())
              }
              examRooms.get(examId)!.add(clientId)
            }

            socket.send(JSON.stringify({
              type: 'AUTHENTICATED',
              payload: { clientId }
            }))

            // Notify examiners of candidate joining
            if (role === 'CANDIDATE' && examId) {
              broadcastToExaminers(examId, {
                type: 'CANDIDATE_JOINED',
                payload: { userId, attemptId, timestamp: new Date().toISOString() }
              })
            }
            break
          }

          case 'VIOLATION': {
            const client = clients.get(clientId)
            if (!client || client.role !== 'CANDIDATE') break

            const { violationType, metadata } = message.payload

            // Broadcast to exam examiners
            if (client.examId) {
              broadcastToExaminers(client.examId, {
                type: 'VIOLATION_DETECTED',
                payload: {
                  userId: client.userId,
                  attemptId: client.attemptId,
                  violationType,
                  metadata,
                  timestamp: new Date().toISOString()
                }
              })
            }
            break
          }

          case 'HEARTBEAT': {
            const client = clients.get(clientId)
            if (!client) break

            socket.send(JSON.stringify({
              type: 'HEARTBEAT_ACK',
              payload: { timestamp: new Date().toISOString() }
            }))

            // Notify examiners of candidate activity
            if (client.role === 'CANDIDATE' && client.examId) {
              broadcastToExaminers(client.examId, {
                type: 'CANDIDATE_ACTIVE',
                payload: {
                  userId: client.userId,
                  attemptId: client.attemptId,
                  timestamp: new Date().toISOString()
                }
              })
            }
            break
          }

          case 'EXAM_STATUS_REQUEST': {
            const client = clients.get(clientId)
            if (!client) break

            const { examId } = message.payload
            if (!examRooms.has(examId)) {
              socket.send(JSON.stringify({
                type: 'EXAM_STATUS',
                payload: { examId, candidateCount: 0, candidates: [] }
              }))
              break
            }

            const roomClientIds = examRooms.get(examId)!
            const candidates = Array.from(roomClientIds)
              .map(id => clients.get(id))
              .filter(c => c?.role === 'CANDIDATE')
              .map(c => ({ userId: c!.userId, attemptId: c!.attemptId }))

            socket.send(JSON.stringify({
              type: 'EXAM_STATUS',
              payload: { examId, candidateCount: candidates.length, candidates }
            }))
            break
          }
        }
      } catch (err) {
        // Ignore malformed messages
      }
    })

    socket.on('close', () => {
      const client = clients.get(clientId)
      if (client) {
        if (client.examId) {
          examRooms.get(client.examId)?.delete(clientId)
          if (client.role === 'CANDIDATE') {
            broadcastToExaminers(client.examId, {
              type: 'CANDIDATE_LEFT',
              payload: {
                userId: client.userId,
                attemptId: client.attemptId,
                timestamp: new Date().toISOString()
              }
            })
          }
        }
        clients.delete(clientId)
      }
    })

    socket.on('error', () => {
      clients.delete(clientId)
    })
  })
}

function broadcastToExaminers(examId: string, message: object) {
  const roomClients = examRooms.get(examId)
  if (!roomClients) return

  const payload = JSON.stringify(message)
  roomClients.forEach(clientId => {
    const client = clients.get(clientId)
    if (client?.role === 'EXAMINER' && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload)
    }
  })
}

export function broadcastToExam(examId: string, message: object) {
  const roomClients = examRooms.get(examId)
  if (!roomClients) return

  const payload = JSON.stringify(message)
  roomClients.forEach(clientId => {
    const client = clients.get(clientId)
    if (client?.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload)
    }
  })
}
