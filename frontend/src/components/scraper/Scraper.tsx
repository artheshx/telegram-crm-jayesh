import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Zap, Square, Clock, Users, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { getAccounts, getJobs, startScraping, stopScraping, getScrapeHistory } from '../../lib/api'
import { Account, ScrapingJob, ScrapeHistory } from '../../types'
import { PageHeader, StatusBadge, ProgressBar, Table, Th, Td, EmptyState } from '../ui'
import { useToast } from '../../lib/toast'
import { formatDistanceToNow, formatDuration, intervalToDuration } from 'date-fns'

export function Scraper() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [groupUrl, setGroupUrl] = useState('')
  const [accountId, setAccountId] = useState<number | ''>('')

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: getAccounts })
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs', 'running'],
    queryFn: () => getJobs(),
    refetchInterval: 3000,
  })
  const { data: history } = useQuery({ queryKey: ['scrape-history'], queryFn: getScrapeHistory })

  const startMutation = useMutation({
    mutationFn: startScraping,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      setGroupUrl('')
      toast('Scraping job started', 'success')
    },
    onError: (e: any) => toast(e.response?.data?.detail || 'Failed to start', 'error'),
  })

  const stopMutation = useMutation({
    mutationFn: stopScraping,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); toast('Stop signal sent', 'info') },
  })

  const activeJobs = jobs?.filter((j: ScrapingJob) => ['running', 'queued'].includes(j.status)) || []

  return (
    <div>
      <PageHeader title="Group Scraper" subtitle="Scrape members from public Telegram groups" />

      {/* Start Scraping */}
      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Start New Scrape</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              className="input"
              placeholder="https://t.me/groupname"
              value={groupUrl}
              onChange={e => setGroupUrl(e.target.value)}
            />
          </div>
          <select
            className="input w-48"
            value={accountId}
            onChange={e => setAccountId(Number(e.target.value))}
          >
            <option value="">Select Account</option>
            {accounts?.map((acc: Account) => (
              <option key={acc.id} value={acc.id}>
                {acc.name || acc.phone_number}
              </option>
            ))}
          </select>
          <button
            onClick={() => startMutation.mutate({ account_id: accountId as number, group_url: groupUrl })}
            disabled={!groupUrl || !accountId || startMutation.isPending}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Zap size={14} />
            {startMutation.isPending ? 'Starting...' : 'Start Scrape'}
          </button>
        </div>
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Active Jobs</h2>
          <div className="space-y-3">
            {activeJobs.map((job: ScrapingJob) => (
              <div key={job.id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={job.status} />
                      <span className="text-sm font-medium text-text-primary">
                        {job.group?.name || job.group?.url || `Job #${job.id}`}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      via {job.account?.name || job.account?.phone_number} · {job.current_step}
                    </p>
                  </div>
                  <button
                    onClick={() => stopMutation.mutate(job.id)}
                    className="btn-danger flex items-center gap-1.5 text-xs"
                  >
                    <Square size={11} /> Stop
                  </button>
                </div>
                <ProgressBar value={job.progress} className="mb-2" />
                <div className="flex gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><Users size={11} />{job.members_processed} processed</span>
                  <span className="flex items-center gap-1"><CheckCircle size={11} className="text-green-500" />{job.members_saved} saved</span>
                  <span className="flex items-center gap-1"><Copy size={11} className="text-yellow-500" />{job.duplicates_found} duplicates</span>
                  {job.started_at && (
                    <span className="flex items-center gap-1 ml-auto"><Clock size={11} />
                      {formatDistanceToNow(new Date(job.started_at))} ago
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scrape History */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">Scrape History</h2>
        {!history?.length ? (
          <div className="card">
            <EmptyState
              icon={Zap}
              title="No scrapes yet"
              description="Start scraping a group to see results here."
            />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Group</Th>
                <Th>Total Members</Th>
                <Th>Imported</Th>
                <Th>Duplicates</Th>
                <Th>Duration</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {history.map((h: ScrapeHistory) => (
                <tr key={h.id} className="table-row">
                  <Td><span className="font-medium">{h.group_name || '—'}</span></Td>
                  <Td><span className="text-text-secondary">{h.total_members.toLocaleString()}</span></Td>
                  <Td><span className="text-accent-green">{h.imported_members.toLocaleString()}</span></Td>
                  <Td><span className="text-accent-yellow">{h.duplicates.toLocaleString()}</span></Td>
                  <Td>
                    <span className="font-mono text-xs text-text-secondary">
                      {h.duration_seconds ? `${Math.floor(h.duration_seconds / 60)}m ${h.duration_seconds % 60}s` : '—'}
                    </span>
                  </Td>
                  <Td><StatusBadge status={h.status} /></Td>
                  <Td>
                    <span className="text-text-muted text-xs">
                      {h.completed_at ? formatDistanceToNow(new Date(h.completed_at), { addSuffix: true }) : '—'}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  )
}
