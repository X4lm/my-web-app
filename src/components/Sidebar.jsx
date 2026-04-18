import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, Settings, Home, AlertCircle, ScrollText, Users, UserCheck, FileText, FileCheck, PieChart, ShieldCheck, BarChart3, Cog, MessageCircle, ListTodo, Map } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/LocaleContext'
import { useAuth, ROLES } from '@/contexts/AuthContext'
import { getSidebarItems } from '@/utils/permissions'
import { listenToAllThreads } from '@/services/supportChat'

const NAV_GROUPS = [
  {
    // Main - no header needed
    items: [
      { id: 'dashboard',   to: '/dashboard',   key: 'nav.dashboard',   icon: LayoutDashboard },
      { id: 'priority',    to: '/today',       key: 'nav.priority',    icon: ListTodo },
      { id: 'properties',  to: '/properties',  key: 'nav.properties',  icon: Building2 },
      { id: 'atlas',       to: '/atlas',       key: 'nav.atlas',       icon: Map },
      { id: 'alerts',      to: '/alerts',      key: 'nav.alerts',      icon: AlertCircle },
      { id: 'doc_expiry',  to: '/documents',   key: 'nav.docExpiry',   icon: FileText },
    ],
  },
  {
    header: 'nav.management',
    items: [
      { id: 'team',        to: '/team',        key: 'nav.team',        icon: Users },
      { id: 'tenants',     to: '/tenants',     key: 'nav.tenants',     icon: UserCheck },
      { id: 'messages',    to: '/templates',   key: 'nav.templates',   icon: FileText },
      { id: 'cheques',     to: '/cheques',     key: 'nav.cheques',     icon: FileCheck },
    ],
  },
  {
    header: 'nav.reports',
    items: [
      { id: 'logs',        to: '/logs',        key: 'nav.logs',        icon: ScrollText },
      { id: 'portfolio',   to: '/portfolio',   key: 'nav.portfolio',   icon: PieChart },
    ],
  },
]

const SETTINGS_ITEM = { id: 'settings', to: '/settings', key: 'nav.settings', icon: Settings }

const ALL_NAV_ITEMS = [
  ...NAV_GROUPS.flatMap(g => g.items),
  SETTINGS_ITEM,
]

const ADMIN_NAV_ITEMS = [
  { id: 'admin',              to: '/admin',              key: 'nav.admin',             icon: ShieldCheck },
  { id: 'admin_users',        to: '/admin/users',        key: 'nav.adminUsers',        icon: Users },
  { id: 'admin_analytics',    to: '/admin/analytics',    key: 'nav.adminAnalytics',    icon: BarChart3 },
  { id: 'admin_support_chat', to: '/admin/support-chat', key: 'nav.adminSupportChat',  icon: MessageCircle },
  { id: 'admin_settings',     to: '/admin/settings',     key: 'nav.adminSettings',     icon: Cog },
]

export default function Sidebar() {
  const { t } = useLocale()
  const { userProfile } = useAuth()
  const role = userProfile?.role || 'owner'
  const allowed = getSidebarItems(role)
  const [adminUnread, setAdminUnread] = useState(0)

  const adminItems = ADMIN_NAV_ITEMS.filter(item => allowed.includes(item.id))

  // Admin-only: track total unread across all support threads
  useEffect(() => {
    if (role !== ROLES.ADMIN) return
    const unsub = listenToAllThreads(threads => {
      const total = threads.reduce((s, t) => s + (t.unreadForAdmin || 0), 0)
      setAdminUnread(total)
    })
    return unsub
  }, [role])

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-e border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 h-14 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-foreground">
          <Home className="w-4 h-4 text-background" />
        </div>
        <span className="font-semibold text-sm tracking-tight">Bait to Maintain</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(item => allowed.includes(item.id))
          if (visibleItems.length === 0) return null
          return (
            <div key={gi}>
              {group.header && (
                <div className="pt-4 pb-1 px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t(group.header)}</p>
                </div>
              )}
              {visibleItems.map(({ id, to, key, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  data-tour={`sidebar-${id}`}
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
            </div>
          )
        })}

        {/* Settings - separated at bottom of nav groups */}
        {allowed.includes(SETTINGS_ITEM.id) && (
          <NavLink
            to={SETTINGS_ITEM.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
              )
            }
          >
            <Settings className="w-4 h-4" />
            {t(SETTINGS_ITEM.key)}
          </NavLink>
        )}

        {adminItems.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('nav.adminSection')}</p>
            </div>
            {adminItems.map(({ id, to, key, icon: Icon }) => (
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
                <span className="flex-1">{t(key)}</span>
                {id === 'admin_support_chat' && adminUnread > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white flex items-center justify-center">
                    {adminUnread > 99 ? '99+' : adminUnread}
                  </span>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">Bait to Maintain v1.0</p>
      </div>
    </aside>
  )
}
