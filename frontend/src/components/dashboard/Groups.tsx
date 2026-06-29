import { useQuery } from '@tanstack/react-query'
import { Globe, Users, Clock } from 'lucide-react'
import { getGroups } from '../../lib/api'
import { Group } from '../../types'
import { PageHeader, Table, Th, Td, EmptyState, Skeleton } from '../ui'
import { formatDistanceToNow } from 'date-fns'

export function Groups() {
  const { data: groups, isLoading } = useQuery({ queryKey: ['groups'], queryFn: getGroups })

  return (
    <div>
      <PageHeader title="Telegram Groups" subtitle="Groups scraped via your accounts" />

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !groups?.length ? (
        <div className="card">
          <EmptyState
            icon={Globe}
            title="No groups yet"
            description="Start a scraping job to add groups here."
          />
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Group</Th>
              <Th>URL</Th>
              <Th>Members</Th>
              <Th>Last Scraped</Th>
              <Th>Added</Th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g: Group) => (
              <tr key={g.id} className="table-row">
                <Td>
                  <div>
                    <p className="font-medium">{g.name}</p>
                    {g.username && <p className="text-xs text-accent-blue">@{g.username}</p>}
                  </div>
                </Td>
                <Td>
                  <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-xs text-text-muted hover:text-accent-blue truncate block max-w-xs">
                    {g.url}
                  </a>
                </Td>
                <Td>
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <Users size={12} />{g.member_count.toLocaleString()}
                  </span>
                </Td>
                <Td>
                  <span className="flex items-center gap-1.5 text-text-muted text-xs">
                    <Clock size={11} />
                    {g.last_scraped ? formatDistanceToNow(new Date(g.last_scraped), { addSuffix: true }) : 'Never'}
                  </span>
                </Td>
                <Td>
                  <span className="text-text-muted text-xs">
                    {formatDistanceToNow(new Date(g.created_at), { addSuffix: true })}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
