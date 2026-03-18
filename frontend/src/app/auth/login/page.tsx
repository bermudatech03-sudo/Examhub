'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation } from '@apollo/client'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { LOGIN_MUTATION } from '@/lib/queries'
import { useAuthStore } from '@/store'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const [login, { loading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      setAuth(data.login.token, data.login.user)
      toast.success('Welcome back!')
      const role = data.login.user.role
      if (role === 'SUPER_ADMIN') router.push('/admin')
      else if (role === 'CANDIDATE') router.push('/dashboard')
      else router.push('/dashboard')
    },
    onError: (err) => toast.error(err.message)
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Please fill all fields')
    login({ variables: { input: form } })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bg-primary relative">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <span className="text-black font-black text-base">EH</span>
            </div>
            <span className="font-black text-2xl">ExamHub</span>
          </Link>
          <h1 className="text-3xl font-black mb-2">Welcome back</h1>
          <p className="text-text-secondary">Sign in to your account to continue</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-accent hover:text-accent-hover transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <><LogIn size={16} /> Sign In</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-bg-border text-center">
            <p className="text-sm text-text-secondary">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-accent hover:text-accent-hover font-medium transition-colors">
                Create one free
              </Link>
            </p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 card p-4">
          <p className="text-xs text-text-muted font-medium mb-2 uppercase tracking-wide">Demo Credentials</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
            <div>
              <span className="text-accent">Admin:</span> admin@examhub.io<br/>
              <span className="text-accent">Pass:</span> admin123
            </div>
            <div>
              <span className="text-accent">Student:</span> student@examhub.io<br/>
              <span className="text-accent">Pass:</span> student123
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
