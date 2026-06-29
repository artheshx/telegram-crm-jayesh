import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Globe, Zap, Database,
  Briefcase, ScrollText, BarChart3, Settings, Send
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/accounts', icon: Users, label: 'Accounts' },
  { to: '/groups', icon: Globe, label: 'Groups' },
  { to: '/scraper', icon: Zap, label: 'Scraper' },
  { to: '/leads', icon: Database, label: 'Leads' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/logs', icon: ScrollText, label: 'Activity' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="w-56 h-screen flex flex-col bg-bg-secondary border-r border-border-subtle fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center">
            <Send size={14} className="text-accent-blue" />
          </div>
          <div>
            <span className="text-sm font-semibold text-text-primary">TelegramCRM</span>
            <span className="block text-[10px] text-text-muted">v1.0</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded text-sm transition-all',
                isActive
                  ? 'bg-accent-blue/10 text-accent-blue font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              )
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border-subtle">
        <p className="text-[11px] text-text-muted">Telegram Community CRM</p>
      </div>
    </aside>
  )
}
