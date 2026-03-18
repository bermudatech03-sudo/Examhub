import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export interface GraphQLContext {
  prisma: PrismaClient
  redis: Redis
  request: FastifyRequest
  reply: FastifyReply
  userId: string | null
  userRole: string | null
  organizationId: string | null
}

export async function buildContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<GraphQLContext> {
  let userId: string | null = null
  let userRole: string | null = null
  let organizationId: string | null = null

  const authHeader = request.headers.authorization

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const decoded = await request.jwtVerify<{
        sub: string
        role: string
        orgId: string | null
      }>()
      userId = decoded.sub
      userRole = decoded.role
      organizationId = decoded.orgId
    } catch {
      // Invalid token — continue as unauthenticated
    }
  }

  return {
    prisma,
    redis,
    request,
    reply,
    userId,
    userRole,
    organizationId
  }
}

export function requireAuth(context: GraphQLContext) {
  if (!context.userId) {
    throw new Error('UNAUTHENTICATED')
  }
}

export function requireRole(
  context: GraphQLContext,
  roles: string[]
) {
  requireAuth(context)
  if (!roles.includes(context.userRole || '')) {
    throw new Error('FORBIDDEN')
  }
}

export { prisma, redis }
