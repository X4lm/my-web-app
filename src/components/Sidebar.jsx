import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, Settings, Home, AlertCircle, ScrollText, Wrench, FileText, FileCheck, PieChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/LocaleContext'

const NAV_ITEMS = [
  { to: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/properties', key: 'nav.properties', icon: Building2 },
  { to: '/alerts', key: 'nav.alerts', icon: AlertCircle },
  { to: '/logs', key: 'nav.logs', icon: ScrollText },
  { to: '/vendors', key: 'nav.vendors', icon: Wrench },
  { to: '/messages', key: 'nav.messages', icon: FileText },
  { to: '/cheques', key: 'nav.cheques', icon: FileCheck },
  { to: '/portfolio', key: 'nav.portfolio', icon: PieChart },
  { to: '/settings', key: 'nav.settings', icon: Settings },
]

export default function Sidebar() {
  const { t } = useLocale()

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-e border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 h-14 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-foreground">
          <Home className="w-4 h-4 text-background" />
        </div>
        <span className="font-semibold text-sm tracking-tight">PropManager</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
              )
            }
          >
            <Icon className="w-4 h-4" />
            {t(key)}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">PropManager v1.0</p>
      </div>
    </aside>
  )
}
