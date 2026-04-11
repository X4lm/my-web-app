import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, Settings, Home, AlertCircle, ScrollText, Wrench, FileText, FileCheck, PieChart, ShieldCheck, Users, BarChart3, Cog } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/LocaleContext'
import { useAuth } from '@/contexts/AuthContext'
import { getSidebarItems } from '@/utils/permissions'

const ALL_NAV_ITEMS = [
  { id: 'dashboard',   to: '/dashboard',   key: 'nav.dashboard',   icon: LayoutDashboard },
  { id: 'properties',  to: '/properties',  key: 'nav.properties',  icon: Building2 },
  { id: 'alerts',      to: '/alerts',      key: 'nav.alerts',      icon: AlertCircle },
  { id: 'logs',        to: '/logs',        key: 'nav.logs',        icon: ScrollText },
  { id: 'vendors',     to: '/vendors',     key: 'nav.vendors',     icon: Wrench },
  { id: 'messages',    to: '/messages',    key: 'nav.messages',    icon: FileText },
  { id: 'cheques',     to: '/cheques',     key: 'nav.cheques',     icon: FileCheck },
  { id: 'portfolio',   to: '/portfolio',   key: 'nav.portfolio',   icon: PieChart },
  { id: 'settings',    to: '/settings',    key: 'nav.settings',    icon: Settings },
]

const ADMIN_NAV_ITEMS = [
  { id: 'admin',           to: '/admin',           key: 'nav.admin',          icon: ShieldCheck },
  { id: 'admin_users',     to: '/admin/users',     key: 'nav.adminUsers',     icon: Users },
  { id: 'admin_analytics', to: '/admin/analytics', key: 'nav.adminAnalytics', icon: BarChart3 },
  { id: 'admin_settings',  to: '/admin/settings',  key: 'nav.adminSettings',  icon: Cog },
]

export default function Sidebar() {
  const { t } = useLocale()
  const { userProfile } = useAuth()
  const role = userProfile?.role || 'owner'
  const allowed = getSidebarItems(role)

  const mainItems = ALL_NAV_ITEMS.filter(item => allowed.includes(item.id))
  const adminItems = ADMIN_NAV_ITEMS.filter(item => allowed.includes(item.id))

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
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainItems.map(({ to, key, icon: Icon }) => (
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

        {adminItems.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('nav.adminSection')}</p>
            </div>
            {adminItems.map(({ to, key, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
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
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">PropManager v1.0</p>
      </div>
    </aside>
  )
}
