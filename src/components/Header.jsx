import { useEffect, useState } from 'react'
import { useNavigate, NavLink, useLocation } from 'react-router-dom'
import { useAuth, ROLES } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import WeatherWidget from '@/components/WeatherWidget'
import ChatWithDev from '@/components/ChatWithDev'
import CommandPalette from '@/components/CommandPalette'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Menu, X, LayoutDashboard, Building2, Settings, Home, Moon, Sun, AlertCircle, ScrollText, Users, UserCheck, FileText, FileCheck, PieChart, ShieldCheck, BarChart3, Cog, MessageCircle, ListTodo, Map, GraduationCap } from 'lucide-react'
import { useTutorialContext, pageKeyFromPath } from '@/contexts/TutorialContext'
import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/LocaleContext'
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

export default function Header() {
  const { currentUser, userProfile, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { enabled: tutorialEnabled, toggle: toggleTutorial, restart: restartTutorial } = useTutorialContext()
  const { t } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()

  function handleTutorialClick() {
    // If off, turn it on (clears seen → every page plays fresh).
    if (!tutorialEnabled) { toggleTutorial(); return }
    // If already on, replay this page's tutorial.
    const key = pageKeyFromPath(location.pathname)
    if (key) restartTutorial(key)
  }
  const [mobileOpen, setMobileOpen] = useState(false)
  const [adminUnread, setAdminUnread] = useState(0)

  const role = userProfile?.role || 'owner'
  const allowed = getSidebarItems(role)
  const adminItems = ADMIN_NAV_ITEMS.filter(item => allowed.includes(item.id))

  // Admin-only: track total unread across all support threads (for mobile nav badge)
  useEffect(() => {
    if (role !== ROLES.ADMIN) return
    const unsub = listenToAllThreads(threads => {
      const total = threads.reduce((s, t) => s + (t.unreadForAdmin || 0), 0)
      setAdminUnread(total)
    })
    return unsub
  }, [role])

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : currentUser?.email?.[0]?.toUpperCase() ?? '?'

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <>
      <header className="sticky top-0 z-40 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between h-full px-4 md:px-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-foreground">
              <Home className="w-3.5 h-3.5 text-background" />
            </div>
            <span className="font-semibold text-sm">Bait to Maintain</span>
          </div>

          {/* Spacer for desktop */}
          <div className="hidden md:block" />

          {/* Right side: search + weather + chat + tutorial + theme toggle + user menu */}
          <div className="flex items-center gap-3">
            <div data-tour="header-cmdk"><CommandPalette /></div>

            <WeatherWidget />

            <ChatWithDev />

            <Button
              data-tour="header-tutorial"
              variant="ghost"
              size="icon"
              onClick={handleTutorialClick}
              className={cn(
                'h-8 w-8 relative',
                tutorialEnabled && 'text-primary'
              )}
              aria-label={tutorialEnabled ? t('tutorial.replay') : t('tutorial.toggleOn')}
              title={tutorialEnabled ? t('tutorial.replay') : t('tutorial.toggleOn')}
            >
              <GraduationCap className="h-4 w-4" />
              {tutorialEnabled && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-primary ring-2 ring-background animate-pulse" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-muted" aria-label="User menu">
                  <span className="text-xs font-semibold">{initials}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser?.displayName || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{currentUser?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <User className="mr-2 h-4 w-4" />
                  {t('nav.settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <nav
            className="absolute start-0 top-14 bottom-0 w-60 bg-sidebar border-e border-sidebar-border p-3 space-y-1 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
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
                  {visibleItems.map(({ to, key, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      onClick={() => setMobileOpen(false)}
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

            {/* Settings - separated */}
            {allowed.includes(SETTINGS_ITEM.id) && (
              <NavLink
                to={SETTINGS_ITEM.to}
                onClick={() => setMobileOpen(false)}
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
                    onClick={() => setMobileOpen(false)}
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
        </div>
      )}
    </>
  )
}
