import { Worker, Queue } from 'bullmq'
import { Redis } from 'ioredis'
import { prisma } from '../middleware/context'
import { emailService } from '../services/email'
import { certificateService } from '../services/certificate'
import { evaluationEngine } from '../services/evaluation-engine'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
})

// Queues
export const emailQueue = new Queue('email', { connection })
export const evaluationQueue = new Queue('evaluation', { connection })
export const certificateQueue = new Queue('certificate', { connection })
export const notificationQueue = new Queue('notification', { connection })

export async function startWorkers() {
  // Email worker
  new Worker('email', async (job) => {
    const { type, ...payload } = job.data
    switch (type) {
      case 'VERIFICATION':
        await emailService.sendVerificationEmail(payload.email, payload.token)
        break
      case 'PASSWORD_RESET':
        await emailService.sendPasswordResetEmail(payload.email, payload.token)
        break
      case 'EXAM_INVITATION':
        await emailService.sendExamInvitation(payload.email, payload.examTitle, payload.token)
        break
      case 'RESULTS_AVAILABLE':
        await emailService.sendResultsAvailable(payload.email, payload.examTitle, payload.percentage)
        break
    }
  }, { connection, concurrency: 5 })

  // Evaluation worker
  new Worker('evaluation', async (job) => {
    const { attemptId } = job.data
    await evaluationEngine.evaluate(attemptId, prisma)
  }, { connection, concurrency: 3 })

  // Certificate worker
  new Worker('certificate', async (job) => {
    const { resultId } = job.data
    await certificateService.generate(resultId, prisma)
  }, { connection, concurrency: 2 })

  // Notification worker
  new Worker('notification', async (job) => {
    const { userId, organizationId, type, title, body, data } = job.data
    await prisma.notification.create({
      data: { userId, organizationId, type, title, body, data: data || {} }
    })
  }, { connection, concurrency: 10 })

  console.log('Workers started')
}
