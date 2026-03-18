import { GraphQLContext, requireAuth, requireRole } from '../../middleware/context'
import { examEngine } from '../../services/exam-engine'
import { evaluationEngine } from '../../services/evaluation-engine'

export const examResolvers = {
  Query: {
    exams: async (
      _: unknown,
      { filter, pagination }: any,
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx)

      const page = pagination?.page || 1
      const pageSize = Math.min(pagination?.pageSize || 20, 100)
      const skip = (page - 1) * pageSize

      const where: any = {}

      if (ctx.userRole === 'CANDIDATE') {
        where.status = 'PUBLISHED'
        where.OR = [
          { startsAt: null },
          { startsAt: { lte: new Date() } }
        ]
      } else if (ctx.userRole === 'EXAMINER') {
        where.createdById = ctx.userId
      } else if (ctx.userRole === 'ORG_ADMIN') {
        where.organizationId = ctx.organizationId
      }

      if (filter?.status) where.status = filter.status
      if (filter?.category) where.category = filter.category

      if (pagination?.search) {
        where.OR = [
          { title: { contains: pagination.search, mode: 'insensitive' } },
          { description: { contains: pagination.search, mode: 'insensitive' } }
        ]
      }

      const [items, total] = await Promise.all([
        ctx.prisma.exam.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: true,
            organization: true,
            questions: {
              include: {
                question: {
                  include: { options: true, tags: { include: { tag: true } }, codingProblem: true }
                }
              },
              orderBy: { orderIndex: 'asc' }
            }
          }
        }),
        ctx.prisma.exam.count({ where })
      ])

      return { items, total, page, pageSize }
    },

    exam: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx)
      return ctx.prisma.exam.findUnique({
        where: { id },
        include: {
          createdBy: true,
          organization: true,
          questions: {
            include: {
              question: {
                include: { options: true, tags: { include: { tag: true } }, codingProblem: true }
              }
            },
            orderBy: { orderIndex: 'asc' }
          }
        }
      })
    },

    availableExams: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx)
      const now = new Date()
      return ctx.prisma.exam.findMany({
        where: {
          status: 'PUBLISHED',
          organizationId: ctx.organizationId || undefined,
          OR: [
            { startsAt: null },
            { startsAt: { lte: now } }
          ],
          AND: [
            {
              OR: [
                { endsAt: null },
                { endsAt: { gte: now } }
              ]
            }
          ]
        },
        include: {
          createdBy: true,
          organization: true,
          questions: { select: { id: true } }
        }
      })
    },

    activeAttempt: async (
      _: unknown,
      { examId }: { examId: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx)
      return ctx.prisma.examAttempt.findFirst({
        where: {
          examId,
          candidateId: ctx.userId!,
          status: 'IN_PROGRESS'
        },
        include: {
          exam: {
            include: {
              questions: {
                include: {
                  question: {
                    include: { options: true, codingProblem: true }
                  }
                },
                orderBy: { orderIndex: 'asc' }
              }
            }
          },
          candidate: true,
          answers: true
        }
      })
    },

    examAttempts: async (
      _: unknown,
      { examId }: { examId: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])
      return ctx.prisma.examAttempt.findMany({
        where: { examId },
        include: {
          candidate: true,
          cheatingLogs: true,
          result: true
        },
        orderBy: { createdAt: 'desc' }
      })
    },

    examStats: async (
      _: unknown,
      { examId }: { examId: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])
      return examEngine.getExamStats(examId, ctx.prisma)
    }
  },

  Mutation: {
    createExam: async (
      _: unknown,
      { input }: any,
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])

      const { questionIds, ...examData } = input

      // Calculate total points
      let totalPoints = 0
      if (questionIds?.length) {
        const questions = await ctx.prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, points: true }
        })
        totalPoints = questions.reduce((sum: number, q: any) => sum + q.points, 0)
      }

      const exam = await ctx.prisma.exam.create({
        data: {
          ...examData,
          createdById: ctx.userId!,
          organizationId: ctx.organizationId || '',
          totalPoints,
          questions: questionIds?.length ? {
            create: questionIds.map((qId: string, idx: number) => ({
              questionId: qId,
              orderIndex: idx
            }))
          } : undefined
        },
        include: {
          createdBy: true,
          organization: true,
          questions: {
            include: {
              question: { include: { options: true, tags: { include: { tag: true } } } }
            }
          }
        }
      })

      return exam
    },

    updateExam: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])

      const exam = await ctx.prisma.exam.findUnique({ where: { id } })
      if (!exam) throw new Error('Exam not found')

      // Examiners can only edit their own exams
      if (ctx.userRole === 'EXAMINER' && exam.createdById !== ctx.userId) {
        throw new Error('FORBIDDEN')
      }

      return ctx.prisma.exam.update({
        where: { id },
        data: input,
        include: {
          createdBy: true,
          organization: true,
          questions: {
            include: {
              question: { include: { options: true, tags: { include: { tag: true } } } }
            }
          }
        }
      })
    },

    publishExam: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])

      const exam = await ctx.prisma.exam.findUnique({
        where: { id },
        include: { questions: true }
      })
      if (!exam) throw new Error('Exam not found')
      if (exam.questions.length === 0) throw new Error('Cannot publish exam with no questions')

      return ctx.prisma.exam.update({
        where: { id },
        data: { status: 'PUBLISHED' },
        include: { createdBy: true, organization: true, questions: true }
      })
    },

    addQuestionsToExam: async (
      _: unknown,
      { examId, questionIds }: { examId: string; questionIds: string[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])

      const existing = await ctx.prisma.examQuestion.findMany({
        where: { examId },
        select: { orderIndex: true }
      })
      const maxIdx = existing.length > 0
        ? Math.max(...existing.map((e: any) => e.orderIndex))
        : -1

      await ctx.prisma.examQuestion.createMany({
        data: questionIds.map((qId, idx) => ({
          examId,
          questionId: qId,
          orderIndex: maxIdx + idx + 1
        })),
        skipDuplicates: true
      })

      // Recalculate total points
      const allQuestions = await ctx.prisma.examQuestion.findMany({
        where: { examId },
        include: { question: { select: { points: true } } }
      })
      const totalPoints = allQuestions.reduce(
        (sum: number, eq: any) => sum + (eq.points || eq.question.points),
        0
      )

      return ctx.prisma.exam.update({
        where: { id: examId },
        data: { totalPoints },
        include: {
          createdBy: true,
          organization: true,
          questions: {
            include: {
              question: { include: { options: true, tags: { include: { tag: true } } } }
            },
            orderBy: { orderIndex: 'asc' }
          }
        }
      })
    },

    // ============================================================
    // EXAM TAKING
    // ============================================================
    startAttempt: async (
      _: unknown,
      { examId, accessCode }: { examId: string; accessCode?: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ['CANDIDATE'])
      return examEngine.startAttempt(examId, ctx.userId!, accessCode, ctx.prisma, ctx.request)
    },

    submitAnswer: async (
      _: unknown,
      { input }: any,
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx)
      return examEngine.submitAnswer(input, ctx.prisma)
    },

    flagQuestion: async (
      _: unknown,
      { attemptId, questionId }: any,
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx)
      await ctx.prisma.answer.upsert({
        where: { attemptId_questionId: { attemptId, questionId } },
        update: { flagged: true },
        create: {
          attemptId,
          questionId,
          selectedOptions: [],
          pointsAwarded: 0,
          flagged: true
        }
      })
      return true
    },

    submitAttempt: async (
      _: unknown,
      { attemptId }: { attemptId: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx)
      return examEngine.submitAttempt(attemptId, ctx.userId!, ctx.prisma)
    },

    executeCode: async (
      _: unknown,
      { input }: any,
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx)
      const { codeExecutionService } = await import('../../services/code-execution')
      return codeExecutionService.execute(input, ctx.prisma)
    },

    logViolation: async (
      _: unknown,
      { input }: any,
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx)
      return examEngine.logViolation(input, ctx.userId!, ctx.prisma)
    },

    inviteCandidates: async (
      _: unknown,
      { examId, emails }: { examId: string; emails: string[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ['SUPER_ADMIN', 'ORG_ADMIN', 'EXAMINER'])
      const { nanoid } = await import('nanoid')
      const exam = await ctx.prisma.exam.findUnique({ where: { id: examId } })
      if (!exam) throw new Error('Exam not found')

      const invitations = await Promise.all(
        emails.map(email =>
          ctx.prisma.examInvitation.create({
            data: {
              examId,
              email,
              token: nanoid(32),
              expiresAt: exam.endsAt || new Date(Date.now() + 7 * 86400000)
            }
          })
        )
      )

      // Send invitation emails
      const { emailService } = await import('../../services/email')
      await Promise.all(
        invitations.map(inv =>
          emailService.sendExamInvitation(inv.email, exam.title, inv.token)
        )
      )

      return true
    }
  },

  Exam: {
    attemptCount: async (exam: any, _: unknown, ctx: GraphQLContext) => {
      return ctx.prisma.examAttempt.count({ where: { examId: exam.id } })
    }
  }
}
