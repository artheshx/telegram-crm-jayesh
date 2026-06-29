export interface Account {
  id: number
  phone_number: string
  name?: string
  username?: string
  status: 'online' | 'offline' | 'flood_wait' | 'unauthorized'
  last_active?: string
  last_login?: string
  is_active: boolean
  created_at: string
}

export interface Group {
  id: number
  telegram_id?: string
  name: string
  username?: string
  url: string
  member_count: number
  last_scraped?: string
  created_at: string
}

export interface ScrapingJob {
  id: number
  account_id: number
  group_id?: number
  status: 'queued' | 'running' | 'completed' | 'failed' | 'stopped'
  progress: number
  current_step?: string
  members_processed: number
  members_saved: number
  duplicates_found: number
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at: string
  account?: Account
  group?: Group
}

export interface Lead {
  id: number
  telegram_user_id: string
  name?: string
  username?: string
  phone?: string
  source_group_name?: string
  status: 'new' | 'contacted' | 'replied' | 'closed'
  notes?: string
  import_date: string
}

export interface ActivityLog {
  id: number
  action: string
  description?: string
  entity_type?: string
  user: string
  level: string
  created_at: string
}

export interface DashboardStats {
  total_accounts: number
  total_groups: number
  total_leads: number
  running_jobs: number
  completed_jobs: number
  today_imports: number
}

export interface ScrapeHistory {
  id: number
  group_name?: string
  total_members: number
  imported_members: number
  duplicates: number
  duration_seconds?: number
  status: string
  started_at?: string
  completed_at?: string
}
