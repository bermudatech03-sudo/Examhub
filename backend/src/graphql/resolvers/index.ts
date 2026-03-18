import { authResolvers } from './auth'
import { examResolvers } from './exam'
import { GraphQLContext, requireAuth, requireRole } from '../../middleware/context'

const questionResolvers = {
  Query: {
    questions: async (_: unknown, { filter, pagination }: any, ctx: GraphQLContext) => {
      requireAuth(ctx)
      const page = pagination?.page || 1
      const pageSize = Math.min(pagination?.pageSize || 20, 100)
      const skip = (page - 1) * pageSize

      const where: any = { isActive: true }

      if (ctx.userRole === 'CANDIDATE') {
        where.isPublic = true
      } else if (ctx.userRole === 'EXAMINER') {
        where.OR = [
          { isPublic: true },
          { createdById: ctx.userId }
        ]
      }

      if (filter?.type) where.type = filter.type
      if (filter?.difficulty) where.difficulty = filter.difficulty
      if (filter?.subject) where.subject = { contains: filter.subject, mode: 'insensitive' }
      if (filter?.isPublic !== undefined) where.isPublic = filter.isPublic

      if (pagination?.search) {
        where.OR = [
          { title: { contains: pagination.search, mode: 'insensitive' } },
          { content: { contains: pagination.search, mode: 'insensitive' } }
        ]
      }

      const [items, total] = await Promise.all([
        ctx.prisma.question.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            options: { orderBy: { orderIndex: 'asc' } },
            tags: { include: { tag: true } },
            codingProblem: true
          }
        }),
        ctx.prisma.question.count({ where })
      ])

      return { items, total, page, pageSize }
    },

    question: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx)
      return ctx.prisma.question.findUnique({
        where: { id },
        include: {
          options: { orderBy: { orderIndex: 'asc' } },
          tags: { include: { tag: true } },
          codingProblem: true
        }
      })
    },

    tags: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx)
      return ctx.prisma.tag.findMany({ orderBy: { name: 'asc' } })
    }
  },

  Mutation: {
    createQuestion: async (_: unknown, { input }: any, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])

      const { tagIds, options, codingProblem, ...questionData } = input

      return ctx.prisma.question.create({
        data: {
          ...questionData,
          createdById: ctx.userId!,
          organizationId: ctx.organizationId,
          tags: tagIds?.length ? {
            create: tagIds.map((tagId: string) => ({ tagId }))
          } : undefined,
          options: options?.length ? {
            create: options.map((opt: any, idx: number) => ({
              ...opt,
              orderIndex: idx
            }))
          } : undefined,
          codingProblem: codingProblem ? { create: codingProblem } : undefined
        },
        include: {
          options: { orderBy: { orderIndex: 'asc' } },
          tags: { include: { tag: true } },
          codingProblem: true
        }
      })
    },

    updateQuestion: async (_: unknown, { id, input }: any, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])

      const { tagIds, options, codingProblem, ...questionData } = input

      // Delete existing options and tags, recreate
      await ctx.prisma.questionOption.deleteMany({ where: { questionId: id } })
      await ctx.prisma.questionTag.deleteMany({ where: { questionId: id } })

      return ctx.prisma.question.update({
        where: { id },
        data: {
          ...questionData,
          tags: tagIds?.length ? {
            create: tagIds.map((tagId: string) => ({ tagId }))
          } : undefined,
          options: options?.length ? {
            create: options.map((opt: any, idx: number) => ({
              ...opt,
              orderIndex: idx
            }))
          } : undefined
        },
        include: {
          options: { orderBy: { orderIndex: 'asc' } },
          tags: { include: { tag: true } },
          codingProblem: true
        }
      })
    },

    deleteQuestion: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])
      await ctx.prisma.question.update({ where: { id }, data: { isActive: false } })
      return true
    },

    createTag: async (_: unknown, { name, color }: any, ctx: GraphQLContext) => {
      requireAuth(ctx)
      return ctx.prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name, color: color || '#ff9900' }
      })
    }
  },

  Question: {
    tags: (q: any) => q.tags?.map((qt: any) => qt.tag) || []
  }
}

const orgResolvers = {
  Query: {
    organizations: async (_: unknown, { pagination }: any, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN'])
      return ctx.prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { users: true, exams: true } } }
      })
    },

    organization: async (_: unknown, { id }: any, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN'])
      return ctx.prisma.organization.findUnique({ where: { id } })
    },

    myOrganization: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx)
      if (!ctx.organizationId) return null
      return ctx.prisma.organization.findUnique({ where: { id: ctx.organizationId } })
    }
  },

  Mutation: {
    createOrganization: async (_: unknown, { input }: any, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN'])
      return ctx.prisma.organization.create({ data: input })
    },

    updateOrganization: async (_: unknown, { id, input }: any, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN'])
      return ctx.prisma.organization.update({ where: { id }, data: input })
    }
  }
}

const resultResolvers = {
  Query: {
    myResults: async (_: unknown, { pagination }: any, ctx: GraphQLContext) => {
      requireAuth(ctx)
      const page = pagination?.page || 1
      const pageSize = 20
      const [items, total] = await Promise.all([
        ctx.prisma.result.findMany({
          where: { candidateId: ctx.userId! },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            exam: true,
            certificate: true,
            attempt: { include: { candidate: true } }
          }
        }),
        ctx.prisma.result.count({ where: { candidateId: ctx.userId! } })
      ])
      return { items, total, page, pageSize }
    },

    examResults: async (_: unknown, { examId }: any, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])
      const [items, total] = await Promise.all([
        ctx.prisma.result.findMany({
          where: { examId },
          orderBy: { earnedPoints: 'desc' },
          include: {
            exam: true,
            certificate: true,
            attempt: { include: { candidate: true } }
          }
        }),
        ctx.prisma.result.count({ where: { examId } })
      ])
      return { items, total, page: 1, pageSize: 1000 }
    },

    result: async (_: unknown, { id }: any, ctx: GraphQLContext) => {
      requireAuth(ctx)
      const result = await ctx.prisma.result.findUnique({
        where: { id },
        include: {
          exam: true,
          certificate: true,
          attempt: { include: { candidate: true } }
        }
      })
      if (!result) throw new Error('Result not found')
      // Candidates can only see their own results
      if (ctx.userRole === 'CANDIDATE' && result.candidateId !== ctx.userId) {
        throw new Error('FORBIDDEN')
      }
      return result
    },

    myCertificates: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx)
      return ctx.prisma.certificate.findMany({
        where: { userId: ctx.userId! },
        orderBy: { issuedAt: 'desc' }
      })
    },

    verifyCertificate: async (_: unknown, { code }: any, ctx: GraphQLContext) => {
      return ctx.prisma.certificate.findUnique({ where: { verifyCode: code } })
    }
  },

  Mutation: {
    gradeEssay: async (_: unknown, { answerId, points, feedback }: any, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])
      return ctx.prisma.answer.update({
        where: { id: answerId },
        data: {
          pointsAwarded: points,
          isCorrect: points > 0,
          gradingNotes: feedback
        }
      })
    },

    publishResults: async (_: unknown, { examId }: any, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])
      await ctx.prisma.result.updateMany({
        where: { examId },
        data: { isPublished: true, publishedAt: new Date() }
      })
      return true
    }
  }
}

const notificationResolvers = {
  Query: {
    myNotifications: async (_: unknown, { unreadOnly }: any, ctx: GraphQLContext) => {
      requireAuth(ctx)
      return ctx.prisma.notification.findMany({
        where: {
          userId: ctx.userId!,
          ...(unreadOnly ? { isRead: false } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    },

    unreadCount: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx)
      return ctx.prisma.notification.count({
        where: { userId: ctx.userId!, isRead: false }
      })
    }
  },

  Mutation: {
    markNotificationRead: async (_: unknown, { id }: any, ctx: GraphQLContext) => {
      requireAuth(ctx)
      return ctx.prisma.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() }
      })
    },

    markAllNotificationsRead: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx)
      await ctx.prisma.notification.updateMany({
        where: { userId: ctx.userId!, isRead: false },
        data: { isRead: true, readAt: new Date() }
      })
      return true
    }
  }
}

const dashboardResolvers = {
  Query: {
    dashboardStats: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])

      const orgFilter = ctx.organizationId
        ? { organizationId: ctx.organizationId }
        : {}

      const [examCount, candidateCount, attemptCount, results] = await Promise.all([
        ctx.prisma.exam.count({ where: orgFilter }),
        ctx.prisma.user.count({ where: { ...orgFilter, role: 'CANDIDATE' } }),
        ctx.prisma.examAttempt.count({ where: { exam: orgFilter } }),
        ctx.prisma.result.findMany({ where: { exam: orgFilter }, select: { status: true } })
      ])

      const passRate = results.length > 0
        ? (results.filter(r => r.status === 'PASS').length / results.length) * 100
        : 0

      return {
        totalExams: examCount,
        totalCandidates: candidateCount,
        totalAttempts: attemptCount,
        avgPassRate: passRate,
        recentActivity: []
      }
    }
  }
}

const userResolvers = {
  Query: {
    users: async (_: unknown, { organizationId, pagination }: any, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN'])
      const page = pagination?.page || 1
      const pageSize = 20
      const where: any = {}
      if (organizationId) where.organizationId = organizationId
      else if (ctx.organizationId) where.organizationId = ctx.organizationId

      if (pagination?.search) {
        where.OR = [
          { email: { contains: pagination.search, mode: 'insensitive' } },
          { firstName: { contains: pagination.search, mode: 'insensitive' } },
          { lastName: { contains: pagination.search, mode: 'insensitive' } }
        ]
      }

      const [items, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { organization: true },
          orderBy: { createdAt: 'desc' }
        }),
        ctx.prisma.user.count({ where })
      ])

      return { items, total, page, pageSize }
    }
  },

  Mutation: {
    updateProfile: async (_: unknown, { firstName, lastName, avatarUrl }: any, ctx: GraphQLContext) => {
      requireAuth(ctx)
      return ctx.prisma.user.update({
        where: { id: ctx.userId! },
        data: { firstName, lastName, avatarUrl },
        include: { organization: true }
      })
    },

    updateUserRole: async (_: unknown, { userId, role }: any, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN'])
      return ctx.prisma.user.update({
        where: { id: userId },
        data: { role },
        include: { organization: true }
      })
    },

    updateUserStatus: async (_: unknown, { userId, status }: any, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN'])
      return ctx.prisma.user.update({
        where: { id: userId },
        data: { status },
        include: { organization: true }
      })
    }
  }
}

// Deep merge resolver maps
function mergeResolvers(...resolverMaps: any[]) {
  const merged: any = { Query: {}, Mutation: {} }
  for (const rm of resolverMaps) {
    if (rm.Query) Object.assign(merged.Query, rm.Query)
    if (rm.Mutation) Object.assign(merged.Mutation, rm.Mutation)
    // Copy type resolvers
    for (const key of Object.keys(rm)) {
      if (key !== 'Query' && key !== 'Mutation') {
        merged[key] = rm[key]
      }
    }
  }
  return merged
}

export const resolvers = mergeResolvers(
  authResolvers,
  examResolvers,
  questionResolvers,
  orgResolvers,
  resultResolvers,
  notificationResolvers,
  dashboardResolvers,
  userResolvers
)
