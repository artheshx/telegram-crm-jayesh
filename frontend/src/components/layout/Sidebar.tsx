import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Globe, Zap, Database,
  Briefcase, ScrollText, Settings, Send, Megaphone, Menu, X
} from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/accounts', icon: Users, label: 'Accounts' },
  { to: '/groups', icon: Globe, label: 'Groups' },
  { to: '/scraper', icon: Zap, label: 'Scraper' },
  { to: '/leads', icon: Database, label: 'Leads' },
  { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/logs', icon: ScrollText, label: 'Activity' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border-subtle bg-bg-secondary px-4 lg:hidden">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center">
          <Send size={14} className="text-accent-blue" />
        </div>
        <span className="text-sm font-semibold text-text-primary">TelegramCRM</span>
      </div>
      <button onClick={() => setOpen(!open)} className="btn-secondary p-2" aria-label="Toggle navigation">
        {open ? <X size={16} /> : <Menu size={16} />}
      </button>
    </header>

    {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={close} />}

    <aside className={clsx(
      'fixed left-0 top-0 z-40 h-screen w-56 flex-col bg-bg-secondary border-r border-border-subtle transition-transform lg:flex lg:translate-x-0',
      open ? 'flex translate-x-0' : 'hidden -translate-x-full'
    )}>
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
            onClick={close}
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
    </>
  )
}
