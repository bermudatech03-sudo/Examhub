import { PrismaClient } from '@prisma/client'
import { FastifyRequest } from 'fastify'
import { evaluationEngine } from './evaluation-engine'
import { emailService } from './email'

export const examEngine = {
  async startAttempt(
    examId: string,
    candidateId: string,
    accessCode: string | undefined,
    prisma: PrismaClient,
    request: FastifyRequest
  ) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: {
            question: {
              include: {
                options: { orderBy: { orderIndex: 'asc' } },
                codingProblem: true,
                tags: { include: { tag: true } }
              }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      }
    })

    if (!exam) throw new Error('Exam not found')
    if (exam.status !== 'PUBLISHED' && exam.status !== 'ACTIVE') {
      throw new Error('Exam is not available')
    }

    // Check dates
    const now = new Date()
    if (exam.startsAt && now < exam.startsAt) {
      throw new Error('Exam has not started yet')
    }
    if (exam.endsAt && now > exam.endsAt) {
      throw new Error('Exam has ended')
    }

    // Access code check
    if (exam.accessCode && exam.accessCode !== accessCode) {
      throw new Error('Invalid access code')
    }

    // Check max attempts
    const existingAttempts = await prisma.examAttempt.count({
      where: {
        examId,
        candidateId,
        status: { in: ['SUBMITTED', 'EVALUATED'] }
      }
    })

    if (existingAttempts >= exam.maxAttempts) {
      throw new Error('Maximum attempts reached')
    }

    // Check for in-progress attempt
    const existing = await prisma.examAttempt.findFirst({
  where: { examId, candidateId, status: 'IN_PROGRESS' },
  include: {
    exam: {
      include: {
        createdBy: true,        // ADD THIS
        organization: true,     // ✅ if schema expects it
        questions: {
          include: {
            question: {
              include: {
                options: true,
                codingProblem: true
              }
            }
          }
        }
      }
    },
    candidate: true,
    answers: true
  }
})

    if (existing) return existing

    // Shuffle if needed
    let questions = exam.questions
    if (exam.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5)
    }

    const attempt = await prisma.examAttempt.create({
      data: {
        examId,
        candidateId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null
      },
      include: {
        exam: {
          include: {
            createdBy: true,        // ← ADD THIS
              organization: true,
            questions: {
              include: {
                question: {
                  include: {
                    options: { orderBy: { orderIndex: 'asc' } },
                    codingProblem: true,
                    tags: { include: { tag: true } }
                  }
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

    return attempt
  },

  async submitAnswer(
    input: {
      attemptId: string
      questionId: string
      selectedOptions?: string[]
      textAnswer?: string
      timeSpent?: number
      flagged?: boolean
    },
    prisma: PrismaClient
  ) {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: input.attemptId }
    })
    if (!attempt) throw new Error('Attempt not found')
    if (attempt.status !== 'IN_PROGRESS') throw new Error('Attempt is not active')

    // Auto-evaluate MCQ/True-False
    let isCorrect: boolean | null = null
    let pointsAwarded = 0

    const question = await prisma.question.findUnique({
      where: { id: input.questionId },
      include: { options: true }
    })

    if (question && ['MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(question.type)) {
      const correctOptionIds = question.options
        .filter(o => o.isCorrect)
        .map(o => o.id)
        .sort()

      const selectedSorted = (input.selectedOptions || []).sort()
      isCorrect =
        JSON.stringify(correctOptionIds) === JSON.stringify(selectedSorted)
      pointsAwarded = isCorrect ? question.points : 0
    }

    return prisma.answer.upsert({
      where: {
        attemptId_questionId: {
          attemptId: input.attemptId,
          questionId: input.questionId
        }
      },
      update: {
        selectedOptions: input.selectedOptions || [],
        textAnswer: input.textAnswer,
        timeSpent: input.timeSpent,
        flagged: input.flagged || false,
        isCorrect,
        pointsAwarded
      },
      create: {
        attemptId: input.attemptId,
        questionId: input.questionId,
        selectedOptions: input.selectedOptions || [],
        textAnswer: input.textAnswer,
        timeSpent: input.timeSpent,
        flagged: input.flagged || false,
        isCorrect,
        pointsAwarded
      }
    })
  },

  async submitAttempt(
    attemptId: string,
    candidateId: string,
    prisma: PrismaClient
  ) {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: true,
        answers: true,
        candidate: true
      }
    })

    if (!attempt) throw new Error('Attempt not found')
    if (attempt.candidateId !== candidateId) throw new Error('FORBIDDEN')
    if (attempt.status !== 'IN_PROGRESS') throw new Error('Attempt is not active')

    const timeSpent = attempt.startedAt
      ? Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)
      : 0

    // Mark as submitted
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        timeSpent
      }
    })

    // Auto-evaluate
    const result = await evaluationEngine.evaluate(attemptId, prisma)

    // Send result notification
    await emailService.sendResultsAvailable(
      attempt.candidate.email,
      attempt.exam.title,
      result.percentage
    )

    return result
  },

  async logViolation(
    input: {
      attemptId: string
      type: string
      description?: string
      metadata?: Record<string, unknown>
    },
    userId: string,
    prisma: PrismaClient
  ) {
    const log = await prisma.cheatingLog.create({
      data: {
        attemptId: input.attemptId,
        userId,
        type: input.type as any,
        description: input.description,
        metadata: (input.metadata as any) || {}
      }
    })

    // Increment violation count
    const attempt = await prisma.examAttempt.update({
      where: { id: input.attemptId },
      data: { violationCount: { increment: 1 } }
    })

    // Auto-submit after 3 violations
    if (attempt.violationCount >= 3 && attempt.status === 'IN_PROGRESS') {
      await prisma.examAttempt.update({
        where: { id: input.attemptId },
        data: {
          status: 'DISQUALIFIED',
          isDisqualified: true,
          disqualifiedAt: new Date(),
          disqualifyReason: 'Exceeded maximum violations (3)'
        }
      })

      await evaluationEngine.evaluate(input.attemptId, prisma)
    }

    return log
  },

  async getExamStats(examId: string, prisma: PrismaClient) {
    const results = await prisma.result.findMany({
      where: { examId }
    })

    if (!results.length) {
      return {
        totalAttempts: 0,
        avgScore: 0,
        passRate: 0,
        avgTimeTaken: 0,
        scoreDistribution: {}
      }
    }

    const totalAttempts = results.length
    const avgScore = results.reduce((s, r) => s + r.percentage, 0) / totalAttempts
    const passRate = (results.filter(r => r.status === 'PASS').length / totalAttempts) * 100
    const avgTimeTaken = results.reduce((s, r) => s + (r.timeTaken || 0), 0) / totalAttempts

    // Score distribution by decile
    const scoreDistribution: Record<string, number> = {}
    for (let i = 0; i <= 9; i++) {
      const key = `${i * 10}-${i * 10 + 10}`
      scoreDistribution[key] = results.filter(
        r => r.percentage >= i * 10 && r.percentage < (i + 1) * 10
      ).length
    }

    return { totalAttempts, avgScore, passRate, avgTimeTaken, scoreDistribution }
  }
}
