import { useQuery } from '@tanstack/react-query'
import { Users, Globe, Database, Briefcase, CheckCircle, TrendingUp, Activity } from 'lucide-react'
import { getDashboardStats, getRecentActivity } from '../../lib/api'
import { StatCard, PageHeader, Skeleton } from '../ui'
import { StatusBadge } from '../ui'
import { formatDistanceToNow } from 'date-fns'

export function Dashboard() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats, refetchInterval: 10000 })
  const { data: activity } = useQuery({ queryKey: ['recent-activity'], queryFn: getRecentActivity, refetchInterval: 15000 })

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your Telegram CRM platform"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <StatCard label="Accounts" value={stats?.total_accounts ?? 0} icon={Users} accent="bg-accent-blue/10 text-accent-blue" />
            <StatCard label="Groups" value={stats?.total_groups ?? 0} icon={Globe} accent="bg-purple-500/10 text-purple-400" />
            <StatCard label="Total Leads" value={stats?.total_leads ?? 0} icon={Database} accent="bg-cyan-500/10 text-cyan-400" />
            <StatCard label="Running Jobs" value={stats?.running_jobs ?? 0} icon={Activity} accent="bg-yellow-500/10 text-yellow-400" />
            <StatCard label="Completed" value={stats?.completed_jobs ?? 0} icon={CheckCircle} accent="bg-green-500/10 text-green-400" />
            <StatCard label="Today's Imports" value={stats?.today_imports ?? 0} icon={TrendingUp} accent="bg-orange-500/10 text-orange-400" sub="new leads today" />
          </>
        )}
      </div>

      {/* Activity Feed */}
      <div className="card">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Recent Activity</h2>
          <span className="text-xs text-text-muted">Last 10 events</span>
        </div>
        <div className="divide-y divide-border-subtle">
          {!activity || activity.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-text-muted">No activity yet</div>
          ) : (
            activity.map((log: any) => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-bg-tertiary/40 transition-colors">
                <StatusBadge status={log.level} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary font-medium">{log.action.replace(/_/g, ' ')}</p>
                  {log.description && <p className="text-xs text-text-secondary mt-0.5 truncate">{log.description}</p>}
                </div>
                <span className="text-xs text-text-muted whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
