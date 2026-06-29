import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Database, Search, Download, X, Edit2, Check } from 'lucide-react'
import { getLeads, updateLead, exportLeadsCSV } from '../../lib/api'
import { Lead } from '../../types'
import { PageHeader, StatusBadge, Table, Th, Td, EmptyState, Skeleton } from '../ui'
import { useToast } from '../../lib/toast'
import { formatDistanceToNow } from 'date-fns'

const STATUSES = ['new', 'contacted', 'replied', 'closed']

export function Leads() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads', debouncedSearch, statusFilter],
    queryFn: () => getLeads({ search: debouncedSearch || undefined, status: statusFilter || undefined, limit: 100 }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateLead(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); setEditingId(null) },
    onError: () => toast('Failed to update lead', 'error'),
  })

  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout((window as any)._searchTimeout)
    ;(window as any)._searchTimeout = setTimeout(() => setDebouncedSearch(val), 300)
  }

  const handleExport = async () => {
    try {
      const blob = await exportLeadsCSV()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'leads.csv'; a.click()
      URL.revokeObjectURL(url)
      toast('CSV exported', 'success')
    } catch { toast('Export failed', 'error') }
  }

  return (
    <div>
      <PageHeader
        title="Lead Database"
        subtitle={`${leads?.length || 0} leads`}
        actions={
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download size={14} /> Export CSV
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-8"
            placeholder="Search name, username, phone..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => { setSearch(''); setDebouncedSearch('') }} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X size={13} />
            </button>
          )}
        </div>
        <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !leads?.length ? (
        <div className="card">
          <EmptyState
            icon={Database}
            title="No leads found"
            description="Scrape a Telegram group to populate leads here."
          />
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Lead</Th>
              <Th>Username</Th>
              <Th>Source Group</Th>
              <Th>Status</Th>
              <Th>Notes</Th>
              <Th>Imported</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead: Lead) => (
              <tr key={lead.id} className="table-row">
                <Td>
                  <div>
                    <p className="font-medium">{lead.name || 'Unknown'}</p>
                    <p className="text-xs text-text-muted font-mono">{lead.telegram_user_id}</p>
                  </div>
                </Td>
                <Td>
                  {lead.username ? (
                    <span className="text-accent-blue text-xs">@{lead.username}</span>
                  ) : <span className="text-text-muted">—</span>}
                </Td>
                <Td><span className="text-text-secondary text-xs">{lead.source_group_name || '—'}</span></Td>
                <Td>
                  <select
                    className="bg-transparent text-xs border-none outline-none cursor-pointer"
                    value={lead.status}
                    onChange={e => updateMutation.mutate({ id: lead.id, data: { status: e.target.value } })}
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </Td>
                <Td className="max-w-xs">
                  {editingId === lead.id ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        className="input text-xs py-1"
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') updateMutation.mutate({ id: lead.id, data: { notes: editNotes } })
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <button onClick={() => updateMutation.mutate({ id: lead.id, data: { notes: editNotes } })} className="text-accent-green hover:text-green-400">
                        <Check size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-text-secondary text-xs truncate block max-w-[150px]">
                      {lead.notes || <span className="text-text-muted italic">—</span>}
                    </span>
                  )}
                </Td>
                <Td>
                  <span className="text-text-muted text-xs">
                    {formatDistanceToNow(new Date(lead.import_date), { addSuffix: true })}
                  </span>
                </Td>
                <Td>
                  <button
                    onClick={() => { setEditingId(lead.id); setEditNotes(lead.notes || '') }}
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded"
                  >
                    <Edit2 size={12} />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
