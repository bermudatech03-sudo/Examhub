// Email Service
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

const FROM = process.env.EMAIL_FROM || 'noreply@examhub.io'
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

export const emailService = {
  async sendVerificationEmail(email: string, token: string) {
    await transporter.sendMail({
      from: `ExamHub <${FROM}>`,
      to: email,
      subject: 'Verify your ExamHub account',
      html: `
        <div style="background:#0b0b0b;color:#fff;padding:40px;font-family:sans-serif;">
          <h1 style="color:#ff9900">ExamHub</h1>
          <p>Click the button below to verify your email address.</p>
          <a href="${BASE_URL}/auth/verify?token=${token}"
             style="background:#ff9900;color:#000;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0">
            Verify Email
          </a>
          <p style="color:#888">This link expires in 24 hours.</p>
        </div>
      `
    })
  },

  async sendPasswordResetEmail(email: string, token: string) {
    await transporter.sendMail({
      from: `ExamHub <${FROM}>`,
      to: email,
      subject: 'Reset your ExamHub password',
      html: `
        <div style="background:#0b0b0b;color:#fff;padding:40px;font-family:sans-serif;">
          <h1 style="color:#ff9900">ExamHub</h1>
          <p>You requested a password reset. Click the button below.</p>
          <a href="${BASE_URL}/auth/reset-password?token=${token}"
             style="background:#ff9900;color:#000;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0">
            Reset Password
          </a>
          <p style="color:#888">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
      `
    })
  },

  async sendExamInvitation(email: string, examTitle: string, token: string) {
    await transporter.sendMail({
      from: `ExamHub <${FROM}>`,
      to: email,
      subject: `You've been invited to: ${examTitle}`,
      html: `
        <div style="background:#0b0b0b;color:#fff;padding:40px;font-family:sans-serif;">
          <h1 style="color:#ff9900">ExamHub</h1>
          <p>You've been invited to take the exam: <strong>${examTitle}</strong></p>
          <a href="${BASE_URL}/exam/join?token=${token}"
             style="background:#ff9900;color:#000;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0">
            Accept Invitation
          </a>
        </div>
      `
    })
  },

  async sendResultsAvailable(email: string, examTitle: string, percentage: number) {
    const passed = percentage >= 60
    await transporter.sendMail({
      from: `ExamHub <${FROM}>`,
      to: email,
      subject: `Your results for ${examTitle} are ready`,
      html: `
        <div style="background:#0b0b0b;color:#fff;padding:40px;font-family:sans-serif;">
          <h1 style="color:#ff9900">ExamHub</h1>
          <p>Your exam results for <strong>${examTitle}</strong> are now available.</p>
          <p style="font-size:24px;color:${passed ? '#00cc44' : '#ff4444'}">
            Score: ${percentage.toFixed(1)}% — ${passed ? 'PASSED ✓' : 'FAILED ✗'}
          </p>
          <a href="${BASE_URL}/results"
             style="background:#ff9900;color:#000;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0">
            View Full Results
          </a>
        </div>
      `
    })
  }
}
