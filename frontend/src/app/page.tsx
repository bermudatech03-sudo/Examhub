'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Shield, Zap, BarChart3, Code2, Users, Globe,
  ChevronRight, CheckCircle, Lock, Eye, Award
} from 'lucide-react'

const features = [
  { icon: Shield, title: 'Anti-Cheat Engine', desc: 'Real-time violation detection — tab switching, fullscreen exit, clipboard monitoring.' },
  { icon: Code2, title: 'Live Code Execution', desc: 'Docker-sandboxed code runner supporting Python, Java, C++, and JavaScript.' },
  { icon: Eye, title: 'Live Proctoring', desc: 'Monitor all candidates in real-time. Get instant violation alerts via WebSocket.' },
  { icon: BarChart3, title: 'Deep Analytics', desc: 'Score distributions, pass rates, percentiles, and per-question analytics.' },
  { icon: Award, title: 'Auto Certificates', desc: 'Branded PDF certificates generated and emailed automatically on pass.' },
  { icon: Zap, title: 'Instant Evaluation', desc: 'MCQ and coding questions auto-graded. Essays queued for manual review.' },
]

const stats = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '< 2s', label: 'Exam Load Time' },
  { value: '50k+', label: 'Exams Conducted' },
  { value: '3', label: 'Violations to Disqualify' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' }
  })
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-bg-border bg-bg-primary/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-black font-black text-sm">EH</span>
            </div>
            <span className="font-black text-xl tracking-tight">ExamHub</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-text-secondary">
            <Link href="#features" className="hover:text-text-primary transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-text-primary transition-colors">Pricing</Link>
            <Link href="/auth/login" className="hover:text-text-primary transition-colors">Sign In</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn-secondary btn-sm hidden md:inline-flex">Sign In</Link>
            <Link href="/auth/register" className="btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-accent/3 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/5 text-accent text-sm font-medium mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Enterprise-grade examination infrastructure
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            CONDUCT SECURE EXAMS
            <span className="block text-accent">AT SCALE.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-text-secondary max-w-2xl mx-auto mb-10"
          >
            ExamHub gives organizations the tools to create, conduct, and analyze
            online exams — with built-in anti-cheat, live proctoring, and automated evaluation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/auth/register" className="btn-primary btn-lg w-full sm:w-auto">
              Start for Free <ChevronRight size={18} />
            </Link>
            <Link href="/auth/login" className="btn-secondary btn-lg w-full sm:w-auto">
              Sign In to Dashboard
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-bg-border bg-bg-secondary">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="text-center"
            >
              <div className="text-3xl font-black text-accent" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{s.value}</div>
              <div className="text-sm text-text-secondary mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              EVERYTHING YOU NEED
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              From question banks to certificates — ExamHub handles the complete examination lifecycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="card-hover p-6 group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <f.icon size={22} className="text-accent" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles section */}
      <section className="py-24 px-6 bg-bg-secondary border-y border-bg-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              BUILT FOR EVERY ROLE
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { role: 'Super Admin', icon: Lock, perks: ['Manage all organizations', 'System settings', 'Security logs', 'Platform analytics'] },
              { role: 'Org Admin', icon: Globe, perks: ['Manage users', 'Manage exams', 'View all results', 'Billing & settings'] },
              { role: 'Examiner', icon: Eye, perks: ['Create questions', 'Build exams', 'Live proctoring', 'Grade essays'] },
              { role: 'Candidate', icon: Users, perks: ['Take exams', 'View results', 'Download certificates', 'Practice mode'] },
            ].map((r, i) => (
              <motion.div
                key={r.role}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="card p-6"
              >
                <r.icon size={20} className="text-accent mb-3" />
                <h3 className="font-bold mb-3">{r.role}</h3>
                <ul className="space-y-2">
                  {r.perks.map(p => (
                    <li key={p} className="flex items-start gap-2 text-sm text-text-secondary">
                      <CheckCircle size={13} className="text-accent mt-0.5 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl font-black mb-6" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            READY TO START?
          </h2>
          <p className="text-text-secondary mb-10 text-lg">
            Set up your first exam in minutes. No credit card required.
          </p>
          <Link href="/auth/register" className="btn-primary btn-lg">
            Create Free Account <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-bg-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
              <span className="text-black font-black text-xs">EH</span>
            </div>
            <span className="font-bold">ExamHub</span>
          </div>
          <p className="text-text-muted text-sm">© 2025 ExamHub. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-text-secondary">
            <Link href="#" className="hover:text-text-primary transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-text-primary transition-colors">Terms</Link>
            <Link href="#" className="hover:text-text-primary transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
