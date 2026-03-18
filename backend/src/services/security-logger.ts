import { PrismaClient } from '@prisma/client'

interface LogParams {
  userId?: string | null
  action: string
  resource?: string
  ipAddress?: string
  userAgent?: string | string[]
  statusCode?: number
  metadata?: Record<string, unknown>
}

export const securityLogger = {
  async log(params: LogParams, prisma: PrismaClient) {
    try {
      await prisma.securityLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          resource: params.resource,
          ipAddress: params.ipAddress,
          userAgent: typeof params.userAgent === 'string'
            ? params.userAgent
            : params.userAgent?.[0],
          statusCode: params.statusCode,
          metadata: (params.metadata || {}) as any
        }
      })
    } catch {
      // Non-critical — don't throw
    }
  }
}
