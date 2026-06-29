import React from 'react'
import clsx from 'clsx'

// Status badge
type StatusVariant = 'online' | 'offline' | 'flood_wait' | 'unauthorized' |
  'running' | 'queued' | 'completed' | 'failed' | 'stopped' |
  'new' | 'contacted' | 'replied' | 'closed' | 'info' | 'error' | 'warning'

const statusConfig: Record<StatusVariant, { label: string; cls: string; dot?: string }> = {
  online: { label: 'Online', cls: 'bg-green-950 text-green-400 border border-green-800/40', dot: 'bg-green-400' },
  offline: { label: 'Offline', cls: 'bg-bg-elevated text-text-muted border border-border-default', dot: 'bg-text-muted' },
  flood_wait: { label: 'Flood Wait', cls: 'bg-yellow-950 text-yellow-400 border border-yellow-800/40', dot: 'bg-yellow-400' },
  unauthorized: { label: 'Unauthorized', cls: 'bg-red-950 text-red-400 border border-red-800/40', dot: 'bg-red-400' },
  running: { label: 'Running', cls: 'bg-blue-950 text-blue-400 border border-blue-800/40', dot: 'bg-blue-400' },
  queued: { label: 'Queued', cls: 'bg-purple-950 text-purple-400 border border-purple-800/40', dot: 'bg-purple-400' },
  completed: { label: 'Completed', cls: 'bg-green-950 text-green-400 border border-green-800/40', dot: 'bg-green-400' },
  failed: { label: 'Failed', cls: 'bg-red-950 text-red-400 border border-red-800/40', dot: 'bg-red-400' },
  stopped: { label: 'Stopped', cls: 'bg-bg-elevated text-text-muted border border-border-default', dot: 'bg-text-muted' },
  new: { label: 'New', cls: 'bg-blue-950 text-blue-400 border border-blue-800/40' },
  contacted: { label: 'Contacted', cls: 'bg-purple-950 text-purple-400 border border-purple-800/40' },
  replied: { label: 'Replied', cls: 'bg-green-950 text-green-400 border border-green-800/40' },
  closed: { label: 'Closed', cls: 'bg-bg-elevated text-text-muted border border-border-default' },
  info: { label: 'Info', cls: 'bg-blue-950/40 text-blue-400' },
  error: { label: 'Error', cls: 'bg-red-950/40 text-red-400' },
  warning: { label: 'Warning', cls: 'bg-yellow-950/40 text-yellow-400' },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status as StatusVariant] || { label: status, cls: 'bg-bg-elevated text-text-muted' }
  return (
    <span className={clsx('badge', cfg.cls)}>
      {cfg.dot && <span className={clsx('w-1.5 h-1.5 rounded-full animate-pulse', cfg.dot)} />}
      {cfg.label}
    </span>
  )
}

// Progress bar
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={clsx('h-1.5 bg-border-subtle rounded-full overflow-hidden', className)}>
      <div
        className="h-full bg-accent-blue rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

// Page header
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// Stat card
export function StatCard({
  label, value, sub, icon: Icon, accent
}: { label: string; value: string | number; sub?: string; icon?: React.ElementType; accent?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider font-medium">{label}</p>
          <p className="text-2xl font-semibold text-text-primary mt-1">{value}</p>
          {sub && <p className="text-xs text-text-secondary mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', accent || 'bg-accent-blue/10')}>
            <Icon size={16} className={accent ? 'text-current' : 'text-accent-blue'} />
          </div>
        )}
      </div>
    </div>
  )
}

// Empty state
export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType; title: string; description: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-center mb-4">
        <Icon size={20} className="text-text-muted" />
      </div>
      <h3 className="text-sm font-medium text-text-primary">{title}</h3>
      <p className="text-sm text-text-muted mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Loading skeleton
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('bg-bg-elevated rounded animate-pulse', className)} />
}

// Modal
export function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border-default rounded-xl shadow-elevated w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">{title}</h2>
        {children}
      </div>
    </div>
  )
}

// Table components
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('card overflow-hidden', className)}>
      <table className="w-full">{children}</table>
    </div>
  )
}

export function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-wider border-b border-border-subtle">
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx('px-4 py-3 text-sm text-text-primary', className)}>{children}</td>
}
