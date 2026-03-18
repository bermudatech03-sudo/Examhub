import { PrismaClient } from '@prisma/client'
import { certificateService } from './certificate'

export const evaluationEngine = {
  async evaluate(attemptId: string, prisma: PrismaClient) {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            questions: {
              include: {
                question: {
                  include: { options: true }
                }
              }
            }
          }
        },
        answers: {
          include: {
            codeSubmission: true
          }
        },
        candidate: true
      }
    })

    if (!attempt) throw new Error('Attempt not found')

    let earnedPoints = 0
    const totalPoints = attempt.exam.totalPoints || 1

    // Evaluate each answer
    for (const examQuestion of attempt.exam.questions) {
      const q = examQuestion.question
      const answer = attempt.answers.find(a => a.questionId === q.id)
      const qPoints = examQuestion.points || q.points

      if (!answer) continue

      if (['MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(q.type)) {
        // Already evaluated in submitAnswer
        earnedPoints += answer.pointsAwarded
      } else if (q.type === 'CODING') {
        // Check latest code submission
        if (answer.codeSubmission?.status === 'ACCEPTED') {
          // Award full points based on test case pass rate
          const testResults = answer.codeSubmission.testResults as Array<{ passed: boolean }>
          const passedTests = testResults.filter(t => t.passed).length
          const passRate = testResults.length > 0 ? passedTests / testResults.length : 0
          const codingPoints = qPoints * passRate
          earnedPoints += codingPoints

          await prisma.answer.update({
            where: { id: answer.id },
            data: { pointsAwarded: codingPoints, isCorrect: passRate === 1 }
          })
        }
      } else if (q.type === 'SHORT_ANSWER') {
        // Basic keyword matching
        if (answer.textAnswer && q.explanation) {
          const keywords = q.explanation.toLowerCase().split(',').map(k => k.trim())
          const answerText = answer.textAnswer.toLowerCase()
          const matchCount = keywords.filter(k => answerText.includes(k)).length
          const matchRate = matchCount / Math.max(keywords.length, 1)
          if (matchRate >= 0.7) {
            earnedPoints += qPoints
            await prisma.answer.update({
              where: { id: answer.id },
              data: { pointsAwarded: qPoints, isCorrect: true }
            })
          }
        }
        // ESSAY requires manual grading — skip for now
      }
    }

    const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
    const passingScore = attempt.exam.passingScore || 60
    const status = percentage >= passingScore ? 'PASS' : 'FAIL'
    const timeTaken = attempt.timeSpent

    // Compute rank among all attempts for this exam
    const allResults = await prisma.result.findMany({
      where: { examId: attempt.examId },
      orderBy: { earnedPoints: 'desc' }
    })

    // Create or update result
    const result = await prisma.result.upsert({
      where: { attemptId },
      update: {
        earnedPoints,
        percentage,
        status: status as any,
        timeTaken,
        gradedAt: new Date()
      },
      create: {
        examId: attempt.examId,
        attemptId,
        candidateId: attempt.candidateId,
        totalPoints,
        earnedPoints,
        percentage,
        status: status as any,
        timeTaken,
        gradedAt: new Date()
      }
    })

    // Update ranks for all results in this exam
    await updateRanks(attempt.examId, prisma)

    // Mark attempt as evaluated
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { status: 'EVALUATED' }
    })

    // Generate certificate if passed
    if (status === 'PASS' && attempt.exam.showResults) {
      await certificateService.generate(result.id, prisma)
    }

    return prisma.result.findUnique({
      where: { id: result.id },
      include: {
        exam: true,
        certificate: true,
        attempt: { include: { candidate: true } }
      }
    })
  }
}

async function updateRanks(examId: string, prisma: PrismaClient) {
  const results = await prisma.result.findMany({
    where: { examId },
    orderBy: { earnedPoints: 'desc' }
  })

  const total = results.length

  await Promise.all(
    results.map((r, idx) =>
      prisma.result.update({
        where: { id: r.id },
        data: {
          rank: idx + 1,
          percentile: total > 1
            ? Math.round(((total - idx - 1) / (total - 1)) * 100)
            : 100
        }
      })
    )
  )
}
