import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './components/dashboard/Dashboard'
import { Accounts } from './components/accounts/Accounts'
import { Groups } from './components/dashboard/Groups'
import { Scraper } from './components/scraper/Scraper'
import { Leads } from './components/leads/Leads'
import { Jobs } from './components/jobs/Jobs'
import { Logs } from './components/logs/Logs'
import { Settings } from './components/dashboard/Settings'
import { ToastProvider } from './lib/toast'

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/scraper" element={<Scraper />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
