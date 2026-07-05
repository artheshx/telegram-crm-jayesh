import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus, Square, Users, Send, Link as LinkIcon } from 'lucide-react'
import { createCampaign, getAccounts, getCampaignRecipients, getCampaigns, getGroups, stopCampaign } from '../../lib/api'
import { Account, Campaign, CampaignRecipient, Group } from '../../types'
import { EmptyState, PageHeader, ProgressBar, Skeleton, StatusBadge, Table, Td, Th } from '../ui'
import { useToast } from '../../lib/toast'
import { formatDistanceToNow } from 'date-fns'

const LEAD_STATUSES = ['', 'new', 'contacted', 'follow_up', 'good_lead', 'failed', 'closed']

export function Campaigns() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [name, setName] = useState('Direct add leads')
  const [mode, setMode] = useState<'direct_add' | 'message' | 'invite_link'>('direct_add')
  const [targetUrl, setTargetUrl] = useState('')
  const [message, setMessage] = useState('Hi {name}, joining this community may be useful for you: {target_url}')
  const [leadStatus, setLeadStatus] = useState('new')
  const [sourceGroup, setSourceGroup] = useState('')
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([])
  const [delay, setDelay] = useState(20)
  const [followUpHours, setFollowUpHours] = useState(24)
  const [limit, setLimit] = useState('')
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null)

  const { data: accounts = [] } = useQuery<Account[]>({ queryKey: ['accounts'], queryFn: getAccounts })
  const { data: groups = [] } = useQuery<Group[]>({ queryKey: ['groups'], queryFn: getGroups })
  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: getCampaigns,
    refetchInterval: 5000,
  })
  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) || campaigns[0],
    [campaigns, selectedCampaignId]
  )
  const { data: recipients = [] } = useQuery<CampaignRecipient[]>({
    queryKey: ['campaign-recipients', activeCampaign?.id],
    queryFn: () => getCampaignRecipients(activeCampaign!.id, { limit: 50 }),
    enabled: !!activeCampaign?.id,
    refetchInterval: 5000,
  })

  const createMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: (campaign: Campaign) => {
      setSelectedCampaignId(campaign.id)
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      toast('Campaign started', 'success')
    },
    onError: (error: any) => toast(error?.response?.data?.detail || 'Campaign failed to start', 'error'),
  })

  const stopMutation = useMutation({
    mutationFn: stopCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      toast('Campaign stopped', 'success')
    },
    onError: () => toast('Failed to stop campaign', 'error'),
  })

  const toggleAccount = (id: number) => {
    setSelectedAccounts((current) =>
      current.includes(id) ? current.filter((accountId) => accountId !== id) : [...current, id]
    )
  }

  const handleCreate = () => {
    createMutation.mutate({
      name: name.trim() || 'Campaign',
      mode,
      target_url: targetUrl || undefined,
      message_template: message || undefined,
      lead_status_filter: leadStatus || undefined,
      source_group_filter: sourceGroup || undefined,
      account_ids: selectedAccounts,
      delay_seconds: delay,
      follow_up_after_hours: followUpHours,
      limit: limit ? Number(limit) : undefined,
    })
  }

  return (
    <div>
      <PageHeader title="Campaigns" subtitle="Direct-add, messaging, follow-up, and account rotation" />

      <div className="grid gap-5 xl:grid-cols-[420px,1fr]">
        <section className="card p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Create Campaign</h2>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs text-text-muted">Name</span>
              <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <div className="grid grid-cols-3 gap-2">
              {[
                ['direct_add', Users, 'Direct Add'],
                ['message', Send, 'Message'],
                ['invite_link', LinkIcon, 'Invite Link'],
              ].map(([value, Icon, label]) => (
                <button
                  key={value as string}
                  onClick={() => setMode(value as typeof mode)}
                  className={`btn-secondary flex min-h-16 flex-col items-center justify-center gap-1 px-2 ${mode === value ? 'border-accent-blue text-accent-blue' : ''}`}
                >
                  <Icon size={16} />
                  <span className="text-[11px] leading-tight">{label as string}</span>
                </button>
              ))}
            </div>

            <label className="block">
              <span className="text-xs text-text-muted">Target channel/group URL</span>
              <input
                className="input mt-1"
                placeholder="https://t.me/yourchannel"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
            </label>

            {mode !== 'direct_add' && (
              <label className="block">
                <span className="text-xs text-text-muted">Message</span>
                <textarea
                  className="input mt-1 min-h-28 resize-y"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-text-muted">Lead status</span>
                <select className="input mt-1" value={leadStatus} onChange={(e) => setLeadStatus(e.target.value)}>
                  {LEAD_STATUSES.map((status) => (
                    <option key={status || 'all'} value={status}>{status ? status.replace('_', ' ') : 'All'}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-text-muted">Source group</span>
                <select className="input mt-1" value={sourceGroup} onChange={(e) => setSourceGroup(e.target.value)}>
                  <option value="">All</option>
                  {groups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
                </select>
              </label>
            </div>

            <div>
              <span className="text-xs text-text-muted">Accounts</span>
              <div className="mt-2 grid gap-2">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => toggleAccount(account.id)}
                    className={`flex items-center justify-between rounded border px-3 py-2 text-left text-sm ${
                      selectedAccounts.includes(account.id)
                        ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                        : 'border-border-default bg-bg-tertiary text-text-secondary'
                    }`}
                  >
                    <span>{account.name || account.phone_number}</span>
                    <StatusBadge status={account.status} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs text-text-muted">Delay sec</span>
                <input className="input mt-1" type="number" min={0} value={delay} onChange={(e) => setDelay(Number(e.target.value))} />
              </label>
              <label className="block">
                <span className="text-xs text-text-muted">Follow-up hrs</span>
                <input className="input mt-1" type="number" min={1} value={followUpHours} onChange={(e) => setFollowUpHours(Number(e.target.value))} />
              </label>
              <label className="block">
                <span className="text-xs text-text-muted">Limit</span>
                <input className="input mt-1" type="number" min={1} placeholder="All" value={limit} onChange={(e) => setLimit(e.target.value)} />
              </label>
            </div>

            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="btn-primary flex w-full items-center justify-center gap-2"
            >
              <Plus size={14} /> Start Campaign
            </button>
          </div>
        </section>

        <section className="space-y-5">
          {isLoading ? (
            <Skeleton className="h-40" />
          ) : !campaigns.length ? (
            <div className="card">
              <EmptyState icon={Megaphone} title="No campaigns yet" description="Start with direct-add or message leads from here." />
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {campaigns.slice(0, 6).map((campaign) => {
                  const progress = campaign.total_recipients
                    ? (campaign.processed_count / campaign.total_recipients) * 100
                    : 0
                  return (
                    <button
                      key={campaign.id}
                      onClick={() => setSelectedCampaignId(campaign.id)}
                      className={`card p-4 text-left transition-colors ${activeCampaign?.id === campaign.id ? 'border-accent-blue' : 'hover:bg-bg-tertiary/50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">{campaign.name}</p>
                          <p className="text-xs text-text-muted">{campaign.mode.replace('_', ' ')}</p>
                        </div>
                        <StatusBadge status={campaign.status} />
                      </div>
                      <ProgressBar value={progress} className="mt-4" />
                      <p className="mt-2 text-xs text-text-secondary">
                        {campaign.processed_count}/{campaign.total_recipients} processed, {campaign.success_count} success, {campaign.failed_count} failed
                      </p>
                    </button>
                  )
                })}
              </div>

              {activeCampaign && (
                <div className="card p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-text-primary">{activeCampaign.name}</h2>
                      <p className="text-xs text-text-muted">
                        Created {formatDistanceToNow(new Date(activeCampaign.created_at), { addSuffix: true })}
                      </p>
                      {activeCampaign.error_message && <p className="mt-2 text-xs text-accent-red">{activeCampaign.error_message}</p>}
                    </div>
                    {(activeCampaign.status === 'running' || activeCampaign.status === 'queued') && (
                      <button onClick={() => stopMutation.mutate(activeCampaign.id)} className="btn-danger flex items-center gap-2">
                        <Square size={13} /> Stop
                      </button>
                    )}
                  </div>

                  <div className="mt-5">
                    <Table>
                      <thead>
                        <tr>
                          <Th>Lead</Th>
                          <Th>Status</Th>
                          <Th>Account</Th>
                          <Th>Error</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipients.map((recipient) => (
                          <tr key={recipient.id} className="table-row">
                            <Td>
                              <div>
                                <p className="font-medium">{recipient.lead?.name || 'Unknown'}</p>
                                <p className="text-xs text-text-muted">{recipient.lead?.username ? `@${recipient.lead.username}` : recipient.lead?.telegram_user_id}</p>
                              </div>
                            </Td>
                            <Td><StatusBadge status={recipient.status} /></Td>
                            <Td><span className="text-xs text-text-secondary">{recipient.account?.phone_number || '-'}</span></Td>
                            <Td><span className="line-clamp-2 text-xs text-accent-red">{recipient.error_message || '-'}</span></Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
