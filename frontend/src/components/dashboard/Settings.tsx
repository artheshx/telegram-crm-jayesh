import { Settings as SettingsIcon, Info, Shield, Database } from 'lucide-react'
import { PageHeader } from '../ui'

export function Settings() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Platform configuration and information" />
      <div className="space-y-4 max-w-2xl">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Info size={15} className="text-accent-blue" />
            <h2 className="text-sm font-semibold">Platform Info</h2>
          </div>
          <div className="space-y-2 text-sm">
            {[['Version', '1.0.0'], ['Build', 'Production'], ['Database', 'PostgreSQL'], ['Backend', 'FastAPI + Telethon']].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-border-subtle last:border-0">
                <span className="text-text-muted">{k}</span>
                <span className="text-text-primary font-mono text-xs">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Shield size={15} className="text-accent-green" />
            <h2 className="text-sm font-semibold">Security</h2>
          </div>
          <p className="text-sm text-text-secondary">
            Session strings are stored in the database. Configure <code className="bg-bg-elevated px-1.5 py-0.5 rounded text-xs font-mono">SECRET_KEY</code> and{' '}
            <code className="bg-bg-elevated px-1.5 py-0.5 rounded text-xs font-mono">SESSION_ENCRYPTION_KEY</code> in your <code className="bg-bg-elevated px-1.5 py-0.5 rounded text-xs font-mono">.env</code> file before production deployment.
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Database size={15} className="text-accent-purple" />
            <h2 className="text-sm font-semibold">API Documentation</h2>
          </div>
          <p className="text-sm text-text-secondary mb-3">Interactive API docs are available at:</p>
          <div className="space-y-2">
            <a href="/api/v1/docs" target="_blank" className="block bg-bg-elevated hover:bg-border-subtle rounded px-3 py-2 text-xs font-mono text-accent-blue transition-colors">
              /api/v1/docs → Swagger UI
            </a>
            <a href="/api/v1/redoc" target="_blank" className="block bg-bg-elevated hover:bg-border-subtle rounded px-3 py-2 text-xs font-mono text-accent-blue transition-colors">
              /api/v1/redoc → ReDoc
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
