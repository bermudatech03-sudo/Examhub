'use client'
import { useParams } from 'next/navigation'
import { useQuery } from '@apollo/client'
import { VERIFY_CERTIFICATE } from '@/lib/queries'
import { CheckCircle, XCircle, Award, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function VerifyCertificatePage() {
  const params = useParams()
  const code = params.code as string

  const { data, loading } = useQuery(VERIFY_CERTIFICATE, {
    variables: { code }
  })

  const cert = data?.verifyCertificate

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-6">
      <Link href="/" className="flex items-center gap-2 mb-12">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <span className="text-black font-black text-sm">EH</span>
        </div>
        <span className="font-black text-xl">ExamHub</span>
      </Link>

      {loading ? (
        <div className="card p-12 max-w-lg w-full text-center">
          <span className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto block" />
          <p className="text-text-secondary mt-4">Verifying certificate...</p>
        </div>
      ) : !cert ? (
        <div className="card p-12 max-w-lg w-full text-center border-status-error/30">
          <div className="w-16 h-16 rounded-full bg-status-error/10 flex items-center justify-center mx-auto mb-6">
            <XCircle size={32} className="text-status-error" />
          </div>
          <h2 className="text-2xl font-black mb-3 text-status-error">Certificate Not Found</h2>
          <p className="text-text-secondary">
            The certificate with code <code className="font-mono text-sm bg-bg-hover px-2 py-0.5 rounded">{code}</code> does not exist or has been revoked.
          </p>
        </div>
      ) : (
        <div className="card p-12 max-w-xl w-full border-status-success/30 relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #181818 0%, #1a1a10 100%)' }}>
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-amber-400 to-accent" />
          <div className="absolute top-6 right-6 opacity-8">
            <Award size={80} className="text-accent" />
          </div>

          {/* Verified badge */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-status-success/10 border-2 border-status-success flex items-center justify-center">
              <CheckCircle size={24} className="text-status-success" />
            </div>
            <div>
              <div className="font-black text-status-success">VERIFIED</div>
              <div className="text-xs text-text-muted">Authentic ExamHub Certificate</div>
            </div>
          </div>

          <p className="text-text-secondary text-sm mb-2">This certifies that</p>
          <h1 className="text-3xl font-black mb-1">{cert.candidateName}</h1>
          <p className="text-text-secondary mb-2">successfully completed</p>
          <h2 className="text-xl font-bold text-accent mb-6">{cert.examTitle}</h2>

          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-bg-hover/50 rounded-xl">
            <div className="text-center">
              <div className="text-2xl font-black text-accent">{cert.score.toFixed(1)}%</div>
              <div className="text-xs text-text-muted">Score</div>
            </div>
            {cert.grade && (
              <div className="text-center">
                <div className="text-2xl font-black border-2 border-accent/40 rounded-lg w-10 h-10 flex items-center justify-center mx-auto text-accent">
                  {cert.grade}
                </div>
                <div className="text-xs text-text-muted mt-1">Grade</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-sm font-bold">{format(new Date(cert.issuedAt), 'MMM d, yyyy')}</div>
              <div className="text-xs text-text-muted">Issued</div>
            </div>
          </div>

          <div className="border-t border-bg-border pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Certificate ID</p>
              <p className="text-xs font-mono text-text-secondary">{cert.verifyCode}</p>
            </div>
            <Link href="/" className="btn-ghost btn-sm">
              <ExternalLink size={13} /> examhub.io
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
