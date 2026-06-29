import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats').then(r => r.data)
export const getRecentActivity = () => api.get('/dashboard/recent-activity').then(r => r.data)

// Accounts
export const getAccounts = () => api.get('/accounts/').then(r => r.data)
export const sendOTP = (data: { phone_number: string; api_id: string; api_hash: string }) =>
  api.post('/accounts/send-otp', data).then(r => r.data)
export const verifyOTP = (data: { phone_number: string; code: string; phone_code_hash: string; password?: string }) =>
  api.post('/accounts/verify-otp', data).then(r => r.data)
export const deleteAccount = (id: number) => api.delete(`/accounts/${id}`).then(r => r.data)
export const reconnectAccount = (id: number) => api.post(`/accounts/${id}/reconnect`).then(r => r.data)

// Groups
export const getGroups = () => api.get('/groups/').then(r => r.data)

// Scraper
export const startScraping = (data: { account_id: number; group_url: string }) =>
  api.post('/scraper/start', data).then(r => r.data)
export const stopScraping = (jobId: number) => api.post(`/scraper/stop/${jobId}`).then(r => r.data)
export const getScrapeHistory = () => api.get('/scraper/history').then(r => r.data)

// Jobs
export const getJobs = (status?: string) =>
  api.get('/jobs/', { params: status ? { status } : {} }).then(r => r.data)
export const getJob = (id: number) => api.get(`/jobs/${id}`).then(r => r.data)

// Leads
export const getLeads = (params?: { search?: string; status?: string; skip?: number; limit?: number }) =>
  api.get('/leads/', { params }).then(r => r.data)
export const updateLead = (id: number, data: { status?: string; notes?: string }) =>
  api.patch(`/leads/${id}`, data).then(r => r.data)
export const exportLeadsCSV = () =>
  api.get('/leads/export/csv', { responseType: 'blob' }).then(r => r.data)

// Logs
export const getLogs = (level?: string) =>
  api.get('/logs/', { params: level ? { level } : {} }).then(r => r.data)
