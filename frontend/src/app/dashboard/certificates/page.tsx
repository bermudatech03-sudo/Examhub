'use client'
import { useQuery } from '@apollo/client'
import { Award, Download, ExternalLink, CheckCircle } from 'lucide-react'
import { GET_MY_CERTIFICATES } from '@/lib/queries'
import { format } from 'date-fns'

export default function CertificatesPage() {
  const { data, loading } = useQuery(GET_MY_CERTIFICATES)
  const certs = data?.myCertificates || []

  return (
    <div className="p-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-black">Certificates</h1>
          <p className="text-text-secondary mt-1">{certs.length} certificate{certs.length !== 1 ? 's' : ''} earned</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="skeleton h-48 rounded-xl" />)}
        </div>
      ) : certs.length === 0 ? (
        <div className="text-center py-20">
          <Award size={48} className="text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No certificates yet</h3>
          <p className="text-text-secondary">Pass an exam to earn your first certificate</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {certs.map((cert: any) => (
            <div
              key={cert.id}
              className="card-hover p-6 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #181818 0%, #1a1510 100%)' }}
            >
              {/* Decorative accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-amber-400 to-accent" />
              <div className="absolute top-4 right-4 opacity-10">
                <Award size={64} className="text-accent" />
              </div>

              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
                    <Award size={18} className="text-accent" />
                  </div>
                  <div>
                    <div className="text-xs text-text-muted uppercase tracking-wide">Certificate of</div>
                    <div className="text-sm font-bold text-accent">Achievement</div>
                  </div>
                </div>

                <h3 className="font-black text-lg leading-snug mb-1">{cert.examTitle}</h3>
                <p className="text-text-secondary text-sm mb-4">{cert.candidateName}</p>

                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl font-black text-accent">{cert.score.toFixed(1)}%</div>
                  {cert.grade && (
                    <div className="text-xl font-black border-2 border-accent/50 rounded-lg w-10 h-10 flex items-center justify-center text-accent">
                      {cert.grade}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-text-muted">
                    <CheckCircle size={10} className="inline mr-1 text-accent" />
                    {format(new Date(cert.issuedAt), 'MMM d, yyyy')}
                  </div>
                  <div className="flex gap-2">
                    {cert.pdfUrl && (
                      <a
                        href={cert.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost btn-sm py-1"
                        title="Download PDF"
                      >
                        <Download size={13} />
                      </a>
                    )}
                    <a
                      href={`/verify/${cert.verifyCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost btn-sm py-1"
                      title="Verify certificate"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-bg-border">
                  <p className="text-xs text-text-muted font-mono break-all">{cert.verifyCode}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
