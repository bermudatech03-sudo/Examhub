import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import mercurius from 'mercurius'
import { schema } from './graphql/schema'
import { resolvers } from './graphql/resolvers'
import { buildContext } from './middleware/context'
import { registerWebSocketHandlers } from './websocket/handler'
import { startWorkers } from './workers'
import dotenv from 'dotenv'

dotenv.config()

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined
  },
  trustProxy: true
})

async function bootstrap() {
  // Security
  await server.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })

  await server.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })

  await server.register(rateLimit, {
    global: true,
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: '1 minute',
    skipOnError: false
  })

  // Auth
  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'examhub-secret-change-in-production',
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  })

  // WebSocket
  await server.register(websocket)

  // GraphQL via Mercurius
  await server.register(mercurius, {
    schema,
    resolvers,
    context: buildContext,
    graphiql: process.env.NODE_ENV === 'development',
    subscription: true,
    errorHandler: (error, request, reply) => {
      server.log.error(error)
      reply.send(error)
    }
  })

  // WebSocket handlers for real-time proctoring
  registerWebSocketHandlers(server)

  // Health check
  server.get('/health', async () => ({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  }))

  // Start background workers
  await startWorkers()

  const port = parseInt(process.env.PORT || '4000')
  const host = process.env.HOST || '0.0.0.0'

  await server.listen({ port, host })
  server.log.info(`ExamHub Backend running on http://${host}:${port}`)
  server.log.info(`GraphQL endpoint: http://${host}:${port}/graphql`)
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

export default server
