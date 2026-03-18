'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useMutation } from '@apollo/client'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft } from 'lucide-react'
import { FORGOT_PASSWORD_MUTATION } from '@/lib/queries'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const [forgotPassword, { loading }] = useMutation(FORGOT_PASSWORD_MUTATION, {
    onCompleted: () => setSent(true),
    onError: (e) => toast.error(e.message)
  })

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-bg-primary">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-status-success/10 border-2 border-status-success/30 flex items-center justify-center mx-auto mb-6">
            <Mail size={28} className="text-status-success" />
          </div>
          <h1 className="text-2xl font-black mb-3">Check your email</h1>
          <p className="text-text-secondary mb-6">
            If an account exists for <strong className="text-text-primary">{email}</strong>,
            we've sent password reset instructions.
          </p>
          <Link href="/auth/login" className="btn-primary">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bg-primary">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <span className="text-black font-black text-base">EH</span>
            </div>
            <span className="font-black text-2xl">ExamHub</span>
          </Link>
          <h1 className="text-3xl font-black mb-2">Reset password</h1>
          <p className="text-text-secondary">Enter your email and we'll send reset instructions</p>
        </div>

        <div className="card p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!email) return toast.error('Enter your email address')
              forgotPassword({ variables: { email } })
            }}
            className="space-y-4"
          >
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading
                ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : <><Mail size={16} /> Send Reset Link</>
              }
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-bg-border text-center">
            <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
