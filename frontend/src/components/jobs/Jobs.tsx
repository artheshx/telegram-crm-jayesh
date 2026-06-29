import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Briefcase, Clock, Users } from 'lucide-react'
import { getJobs } from '../../lib/api'
import { ScrapingJob } from '../../types'
import { PageHeader, StatusBadge, ProgressBar, Table, Th, Td, EmptyState, Skeleton } from '../ui'
import { formatDistanceToNow } from 'date-fns'

const STATUS_TABS = ['all', 'running', 'queued', 'completed', 'failed']

export function Jobs() {
  const [tab, setTab] = useState('all')

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs', tab],
    queryFn: () => getJobs(tab === 'all' ? undefined : tab),
    refetchInterval: 5000,
  })

  return (
    <div>
      <PageHeader title="Job Manager" subtitle="Track all background scraping jobs" />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border-subtle">
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-4 py-2 text-sm capitalize transition-colors border-b-2 -mb-px ${
              tab === s ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !jobs?.length ? (
        <div className="card">
          <EmptyState icon={Briefcase} title="No jobs" description="Start scraping a group to create jobs." />
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Job ID</Th>
              <Th>Account</Th>
              <Th>Group</Th>
              <Th>Status</Th>
              <Th>Progress</Th>
              <Th>Members</Th>
              <Th>Duration</Th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job: ScrapingJob) => {
              const duration = job.started_at && job.completed_at
                ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
                : null
              return (
                <tr key={job.id} className="table-row">
                  <Td><span className="font-mono text-xs text-text-muted">#{job.id}</span></Td>
                  <Td><span className="text-sm">{job.account?.name || job.account?.phone_number || '—'}</span></Td>
                  <Td>
                    <div>
                      <p className="text-sm font-medium">{job.group?.name || '—'}</p>
                      {job.current_step && <p className="text-xs text-text-muted">{job.current_step}</p>}
                    </div>
                  </Td>
                  <Td><StatusBadge status={job.status} /></Td>
                  <Td className="w-32">
                    <div className="space-y-1">
                      <ProgressBar value={job.progress} />
                      <span className="text-xs text-text-muted">{job.progress.toFixed(0)}%</span>
                    </div>
                  </Td>
                  <Td>
                    <div className="text-xs space-y-0.5">
                      <p className="text-text-secondary">{job.members_saved} saved</p>
                      <p className="text-text-muted">{job.duplicates_found} dupes</p>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Clock size={11} />
                      {duration ? `${Math.floor(duration / 60)}m ${duration % 60}s` :
                        job.started_at ? formatDistanceToNow(new Date(job.started_at)) : '—'}
                    </span>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </div>
  )
}
