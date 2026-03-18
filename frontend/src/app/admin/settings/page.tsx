'use client'

import { useState } from 'react'
import { Save, Shield, Bell, Globe, Database } from 'lucide-react'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    // TODO: connect to API / GraphQL mutation
    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-black">Settings</h1>
          <p className="text-text-secondary mt-1">
            Manage platform configurations and preferences
          </p>
        </div>

        <button onClick={handleSave} className="btn-primary btn-sm">
          <Save size={15} />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* General Settings */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-accent" />
            <h3 className="font-bold">General</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary">Platform Name</label>
              <input className="input mt-1" defaultValue="ExamHub" />
            </div>

            <div>
              <label className="text-sm text-text-secondary">Support Email</label>
              <input className="input mt-1" defaultValue="support@examhub.com" />
            </div>

            <div>
              <label className="text-sm text-text-secondary">Timezone</label>
              <select className="input mt-1">
                <option>Asia/Kolkata</option>
                <option>UTC</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-accent" />
            <h3 className="font-bold">Security</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable 2FA</span>
              <input type="checkbox" className="toggle" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Force Strong Passwords</span>
              <input type="checkbox" className="toggle" defaultChecked />
            </div>

            <div>
              <label className="text-sm text-text-secondary">
                Session Timeout (minutes)
              </label>
              <input type="number" className="input mt-1" defaultValue={30} />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-accent" />
            <h3 className="font-bold">Notifications</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Email Alerts</span>
              <input type="checkbox" className="toggle" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">SMS Alerts</span>
              <input type="checkbox" className="toggle" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">System Notifications</span>
              <input type="checkbox" className="toggle" defaultChecked />
            </div>
          </div>
        </div>

        {/* System / Database */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database size={18} className="text-accent" />
            <h3 className="font-bold">System</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary">
                Backup Frequency
              </label>
              <select className="input mt-1">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-text-secondary">
                Log Retention (days)
              </label>
              <input type="number" className="input mt-1" defaultValue={30} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Maintenance Mode</span>
              <input type="checkbox" className="toggle" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}