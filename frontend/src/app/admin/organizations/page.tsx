'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Building2, PlusCircle, Users, FileText, CheckCircle, XCircle } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { gql } from '@apollo/client'
import { formatDistanceToNow } from 'date-fns'

const GET_ORGANIZATIONS = gql`
  query GetOrgs {
    organizations {
      id name slug domain logoUrl isActive subscriptionTier
      maxCandidates maxExams createdAt
      userCount examCount
    }
  }
`

const CREATE_ORG = gql`
  mutation CreateOrg($input: CreateOrganizationInput!) {
    createOrganization(input: $input) {
      id name slug
    }
  }
`

export default function OrganizationsPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', domain: '', maxCandidates: 100, maxExams: 10, subscriptionTier: 'FREE' })

  const { data, loading, refetch } = useQuery(GET_ORGANIZATIONS)
  const [createOrg, { loading: creating }] = useMutation(CREATE_ORG, {
    onCompleted: () => { toast.success('Organization created'); setShowForm(false); refetch() },
    onError: e => toast.error(e.message)
  })

  const orgs = data?.organizations || []

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="p-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-black">Organizations</h1>
          <p className="text-text-secondary mt-1">{orgs.length} registered organizations</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary btn-sm">
          <PlusCircle size={15} /> New Organization
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-6 mb-6 animate-slide-up">
          <h3 className="font-bold mb-4">Create Organization</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Name *</label>
              <input type="text" className="input" placeholder="Acme Corp" value={form.name}
                onChange={e => {
                  const name = e.target.value
                  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
                  setForm(p => ({ ...p, name, slug }))
                }} />
            </div>
            <div>
              <label className="label">Slug *</label>
              <input type="text" className="input" placeholder="acme-corp" value={form.slug} onChange={f('slug')} />
            </div>
            <div>
              <label className="label">Domain</label>
              <input type="text" className="input" placeholder="acme.com" value={form.domain} onChange={f('domain')} />
            </div>
            <div>
              <label className="label">Max Candidates</label>
              <input type="number" className="input" value={form.maxCandidates} onChange={f('maxCandidates')} />
            </div>
            <div>
              <label className="label">Max Exams</label>
              <input type="number" className="input" value={form.maxExams} onChange={f('maxExams')} />
            </div>
            <div>
              <label className="label">Plan</label>
              <select className="input" value={form.subscriptionTier} onChange={f('subscriptionTier')}>
                <option value="FREE">Free</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="btn-secondary btn-sm">Cancel</button>
            <button
              disabled={creating}
              onClick={() => createOrg({ variables: { input: { ...form, maxCandidates: Number(form.maxCandidates), maxExams: Number(form.maxExams) } } })}
              className="btn-primary btn-sm"
            >
              {creating ? <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Organizations grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-20">
          <Building2 size={48} className="text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No organizations yet</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {orgs.map((org: any) => (
            <div key={org.id} className="card-hover p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-sm font-black text-accent">
                    {org.name[0]}
                  </div>
                  <div>
                    <div className="font-bold">{org.name}</div>
                    <div className="text-xs text-text-muted">/{org.slug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {org.isActive
                    ? <CheckCircle size={14} className="text-status-success" />
                    : <XCircle size={14} className="text-status-error" />
                  }
                  <span className={clsx('badge-orange text-xs', org.subscriptionTier === 'ENTERPRISE' && 'bg-purple-500/10 text-purple-400 border-purple-500/20')}>
                    {org.subscriptionTier}
                  </span>
                </div>
              </div>

              {org.domain && (
                <div className="text-xs text-text-muted mb-3">🌐 {org.domain}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-hover rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-text-secondary mb-0.5">
                    <Users size={11} /> <span className="text-xs">Candidates</span>
                  </div>
                  <div className="font-bold text-sm">{org.userCount ?? '—'} / {org.maxCandidates}</div>
                </div>
                <div className="bg-bg-hover rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-text-secondary mb-0.5">
                    <FileText size={11} /> <span className="text-xs">Exams</span>
                  </div>
                  <div className="font-bold text-sm">{org.examCount ?? '—'} / {org.maxExams}</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-bg-border">
                <p className="text-xs text-text-muted">
                  Created {org.createdAt ? formatDistanceToNow(new Date(org.createdAt), { addSuffix: true }) : '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
