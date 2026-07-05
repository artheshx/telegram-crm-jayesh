export interface Account {
  id: number
  phone_number: string
  name?: string
  username?: string
  status: 'online' | 'offline' | 'flood_wait' | 'unauthorized'
  last_active?: string
  last_login?: string
  is_active: boolean
  hourly_message_limit?: number
  daily_message_limit?: number
  daily_invite_limit?: number
  messages_sent_today?: number
  invites_sent_today?: number
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
  status: 'new' | 'contacted' | 'replied' | 'good_lead' | 'follow_up' | 'failed' | 'closed'
  notes?: string
  import_date: string
}

export interface Campaign {
  id: number
  name: string
  mode: 'direct_add' | 'message' | 'invite_link'
  status: 'queued' | 'running' | 'completed' | 'failed' | 'stopped'
  target_url?: string
  message_template?: string
  lead_status_filter?: string
  source_group_filter?: string
  account_ids?: string
  delay_seconds: number
  follow_up_after_hours: number
  total_recipients: number
  processed_count: number
  success_count: number
  failed_count: number
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface CampaignRecipient {
  id: number
  campaign_id: number
  lead_id: number
  account_id?: number
  status: 'queued' | 'processing' | 'messaged' | 'invited' | 'replied' | 'follow_up' | 'failed' | 'skipped'
  message_text?: string
  error_message?: string
  attempted_at?: string
  completed_at?: string
  reply_detected_at?: string
  lead?: Lead
  account?: Account
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
