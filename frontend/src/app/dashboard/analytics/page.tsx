'use client'
import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { GET_EXAMS, GET_EXAM_STATS } from '@/lib/queries'
import { BarChart3 } from 'lucide-react'

const CHART_COLORS = ['#ff9900', '#ffad33', '#ffcc66', '#ffe099', '#cc7a00']
const TOOLTIP_STYLE = {
  contentStyle: { background: '#181818', border: '1px solid #2a2a2a', borderRadius: 8 },
  labelStyle: { color: '#fff' },
  itemStyle: { color: '#aaa' }
}

export default function AnalyticsPage() {
  const [selectedExamId, setSelectedExamId] = useState('')

  const { data: examsData } = useQuery(GET_EXAMS, {
    variables: { pagination: { pageSize: 50 } }
  })

  const { data: statsData } = useQuery(GET_EXAM_STATS, {
    variables: { examId: selectedExamId },
    skip: !selectedExamId
  })

  const exams = examsData?.exams?.items || []
  const stats = statsData?.examStats

  const scoreDistData = stats?.scoreDistribution
    ? Object.entries(stats.scoreDistribution).map(([range, count]) => ({ range, count }))
    : []

  const pieData = stats
    ? [
        { name: 'Pass', value: Math.round(stats.passRate), color: '#00cc44' },
        { name: 'Fail', value: Math.round(100 - stats.passRate), color: '#ff3333' },
      ]
    : []

  return (
    <div className="p-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-black">Analytics</h1>
          <p className="text-text-secondary mt-1">Performance insights and statistics</p>
        </div>
      </div>

      {/* Exam selector */}
      <div className="card p-5 mb-6">
        <label className="label">Select Exam</label>
        <select
          className="input max-w-sm"
          value={selectedExamId}
          onChange={e => setSelectedExamId(e.target.value)}
        >
          <option value="">Choose an exam to analyze...</option>
          {exams.map((exam: any) => (
            <option key={exam.id} value={exam.id}>{exam.title}</option>
          ))}
        </select>
      </div>

      {!selectedExamId ? (
        <div className="text-center py-20">
          <BarChart3 size={48} className="text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Select an exam to view analytics</h3>
        </div>
      ) : !stats ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Attempts', value: stats.totalAttempts },
              { label: 'Avg Score', value: `${stats.avgScore.toFixed(1)}%` },
              { label: 'Pass Rate', value: `${stats.passRate.toFixed(1)}%` },
              { label: 'Avg Time', value: `${Math.round(stats.avgTimeTaken / 60)}m` },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <span className="text-xs text-text-secondary">{s.label}</span>
                <div className="text-3xl font-black text-accent">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score distribution */}
            <div className="card p-6">
              <h3 className="font-bold mb-4">Score Distribution</h3>
              {scoreDistData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scoreDistData}>
                    <XAxis dataKey="range" stroke="#666" fontSize={11} />
                    <YAxis stroke="#666" fontSize={11} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#ff9900" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">
                  No data yet
                </div>
              )}
            </div>

            {/* Pass/Fail pie */}
            <div className="card p-6">
              <h3 className="font-bold mb-4">Pass / Fail Rate</h3>
              {pieData.length > 0 && stats.totalAttempts > 0 ? (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" strokeWidth={0}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3 shrink-0">
                    {pieData.map(item => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                        <span className="text-sm text-text-secondary">{item.name}</span>
                        <span className="text-sm font-bold ml-auto">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">
                  No attempts yet
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
