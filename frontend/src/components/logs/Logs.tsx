import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { getLogs } from '../../lib/api'
import { ActivityLog } from '../../types'
import { PageHeader, StatusBadge, Table, Th, Td, EmptyState, Skeleton } from '../ui'
import { formatDistanceToNow, format } from 'date-fns'

const LEVELS = ['all', 'info', 'warning', 'error']

export function Logs() {
  const [level, setLevel] = useState('')

  const { data: logs, isLoading } = useQuery({
    queryKey: ['logs', level],
    queryFn: () => getLogs(level || undefined),
    refetchInterval: 10000,
  })

  return (
    <div>
      <PageHeader title="Activity Logs" subtitle="Complete audit trail of all platform actions" />

      <div className="flex gap-1 mb-5 border-b border-border-subtle">
        {LEVELS.map(l => (
          <button
            key={l}
            onClick={() => setLevel(l === 'all' ? '' : l)}
            className={`px-4 py-2 text-sm capitalize transition-colors border-b-2 -mb-px ${
              (level || 'all') === l ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : !logs?.length ? (
        <div className="card">
          <EmptyState icon={ScrollText} title="No logs" description="Activity will appear here as you use the platform." />
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Time</Th>
              <Th>Level</Th>
              <Th>Action</Th>
              <Th>Description</Th>
              <Th>User</Th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log: ActivityLog) => (
              <tr key={log.id} className="table-row">
                <Td>
                  <div>
                    <p className="text-xs font-mono text-text-secondary">
                      {format(new Date(log.created_at), 'HH:mm:ss')}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </Td>
                <Td><StatusBadge status={log.level} /></Td>
                <Td><span className="font-mono text-xs text-text-primary">{log.action}</span></Td>
                <Td><span className="text-text-secondary text-xs">{log.description || '—'}</span></Td>
                <Td><span className="text-text-muted text-xs">{log.user}</span></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
