'use client'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { Shield, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'

const GET_SECURITY_LOGS = gql`
  query GetSecurityLogs {
    me { id }
  }
`

// Security logs are a direct DB query — using a custom resolver in production
// For the MVP we display a mock + explain integration
const MOCK_LOGS = [
  { id: '1', action: 'LOGIN_SUCCESS', userId: 'usr_1', ipAddress: '192.168.1.1', userAgent: 'Chrome/124', createdAt: new Date().toISOString() },
  { id: '2', action: 'LOGIN_FAILED', userId: 'usr_2', ipAddress: '10.0.0.5', userAgent: 'Firefox/125', createdAt: new Date(Date.now() - 60000).toISOString() },
  { id: '3', action: 'USER_REGISTERED', userId: 'usr_3', ipAddress: '172.16.0.3', userAgent: 'Safari/17', createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: '4', action: 'EXAM_SUBMITTED', userId: 'usr_4', ipAddress: '192.168.0.10', userAgent: 'Chrome/124', createdAt: new Date(Date.now() - 600000).toISOString() },
  { id: '5', action: 'VIOLATION_LOGGED', userId: 'usr_5', ipAddress: '10.10.0.2', userAgent: 'Edge/124', createdAt: new Date(Date.now() - 1200000).toISOString() },
]

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS: 'text-status-success',
  LOGIN_FAILED: 'text-status-error',
  USER_REGISTERED: 'text-status-info',
  EXAM_SUBMITTED: 'text-accent',
  VIOLATION_LOGGED: 'text-status-warning',
}

export default function SecurityLogsPage() {
  const [search, setSearch] = useState('')

  const filtered = MOCK_LOGS.filter(l =>
    !search || l.action.includes(search.toUpperCase()) || l.ipAddress.includes(search)
  )

  return (
    <div className="p-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-black">Security Logs</h1>
          <p className="text-text-secondary mt-1">Audit trail of all security events</p>
        </div>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Filter by action or IP..."
          className="input pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border">
              {['Timestamp', 'Action', 'User', 'IP Address', 'User Agent'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border">
            {filtered.map(log => (
              <tr key={log.id} className="hover:bg-bg-hover transition-colors font-mono text-xs">
                <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                  {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                </td>
                <td className="px-4 py-3">
                  <span className={clsx('font-semibold', ACTION_COLORS[log.action] || 'text-text-secondary')}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{log.userId}</td>
                <td className="px-4 py-3 text-text-secondary">{log.ipAddress}</td>
                <td className="px-4 py-3 text-text-muted truncate max-w-[200px]">{log.userAgent}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 border-t border-bg-border">
          <p className="text-xs text-text-muted">
            ℹ️ Live security logs are streamed from <code className="bg-bg-hover px-1.5 py-0.5 rounded">security_logs</code> table.
            Connect a real-time polling query or GraphQL subscription for production use.
          </p>
        </div>
      </div>
    </div>
  )
}
