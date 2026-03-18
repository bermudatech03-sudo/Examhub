'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation } from '@apollo/client'
import toast from 'react-hot-toast'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { REGISTER_MUTATION } from '@/lib/queries'
import { useAuthStore } from '@/store'

export default function RegisterPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: ''
  })

  const [register, { loading }] = useMutation(REGISTER_MUTATION, {
    onCompleted: (data) => {
      setAuth(data.register.token, data.register.user)
      toast.success('Account created! Please check your email to verify.')
      router.push('/dashboard')
    },
    onError: (err) => toast.error(err.message)
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      return toast.error('Please fill all fields')
    }
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match')
    }
    if (form.password.length < 8) {
      return toast.error('Password must be at least 8 characters')
    }
    register({
      variables: {
        input: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password
        }
      }
    })
  }

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-bg-primary relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <span className="text-black font-black text-base">EH</span>
            </div>
            <span className="font-black text-2xl">ExamHub</span>
          </Link>
          <h1 className="text-3xl font-black mb-2">Create account</h1>
          <p className="text-text-secondary">Start conducting exams in minutes</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First name</label>
                <input type="text" className="input" placeholder="John" value={form.firstName} onChange={f('firstName')} />
              </div>
              <div>
                <label className="label">Last name</label>
                <input type="text" className="input" placeholder="Doe" value={form.lastName} onChange={f('lastName')} />
              </div>
            </div>

            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={f('email')} />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={f('password')}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm password</label>
              <input
                type="password" className="input" placeholder="Repeat password"
                value={form.confirmPassword} onChange={f('confirmPassword')}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : <><UserPlus size={16} /> Create Account</>
              }
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-bg-border text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-accent hover:text-accent-hover font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-text-muted mt-4">
          By creating an account you agree to our{' '}
          <Link href="#" className="text-accent hover:underline">Terms of Service</Link>{' '}
          and{' '}
          <Link href="#" className="text-accent hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
