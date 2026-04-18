import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowUpRight, LayoutDashboard, Building2, AlertCircle, Users, CreditCard, PieChart, FileText, Map, ListTodo, Settings, ScrollText, MessageSquare, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import { getSidebarItems } from '@/utils/permissions'
import { cn } from '@/lib/utils'

const ROUTES = [
  { id: 'dashboard',  to: '/dashboard',  key: 'nav.dashboard',  icon: LayoutDashboard,  sidebarKey: 'dashboard' },
  { id: 'priority',   to: '/today',      key: 'nav.priority',   icon: ListTodo,         sidebarKey: 'priority' },
  { id: 'properties', to: '/properties', key: 'nav.properties', icon: Building2,        sidebarKey: 'properties' },
  { id: 'atlas',      to: '/atlas',      key: 'nav.atlas',      icon: Map,              sidebarKey: 'atlas' },
  { id: 'alerts',     to: '/alerts',     key: 'nav.alerts',     icon: AlertCircle,      sidebarKey: 'alerts' },
  { id: 'doc_expiry', to: '/documents',  key: 'nav.docExpiry',  icon: FileText,         sidebarKey: 'doc_expiry' },
  { id: 'team',       to: '/team',       key: 'nav.team',       icon: Users,            sidebarKey: 'team' },
  { id: 'tenants',    to: '/tenants',    key: 'nav.tenants',    icon: Users,            sidebarKey: 'tenants' },
  { id: 'cheques',    to: '/cheques',    key: 'nav.cheques',    icon: CreditCard,       sidebarKey: 'cheques' },
  { id: 'portfolio',  to: '/portfolio',  key: 'nav.portfolio',  icon: PieChart,         sidebarKey: 'portfolio' },
  { id: 'templates',  to: '/templates',  key: 'nav.templates',  icon: MessageSquare,    sidebarKey: 'messages' },
  { id: 'logs',       to: '/logs',       key: 'nav.logs',       icon: ScrollText,       sidebarKey: 'logs' },
  { id: 'settings',   to: '/settings',   key: 'nav.settings',   icon: Settings,         sidebarKey: 'settings' },
]

export default function CommandPalette() {
  const { currentUser, userProfile } = useAuth()
  const { t } = useLocale()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef(null)
  const { properties } = usePropertyAlerts()

  const role = userProfile?.role || 'owner'
  const allowed = useMemo(() => new Set(getSidebarItems(role)), [role])

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
        setQ('')
        setCursor(0)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40)
  }, [open])

  const results = useMemo(() => {
    const query = q.trim().toLowerCase()
    const pageHits = ROUTES
      .filter(r => allowed.has(r.sidebarKey))
      .filter(r => !query || t(r.key).toLowerCase().includes(query) || r.id.includes(query))
      .map(r => ({ kind: 'page', id: r.id, label: t(r.key), Icon: r.icon, onSelect: () => navigate(r.to) }))

    const actions = [
      {
        kind: 'action', id: 'new-property',
        label: t('cmdk.action.newProperty'),
        Icon: Plus,
        onSelect: () => navigate('/properties?new=1'),
      },
    ]
    const actionHits = actions.filter(a => !query
      || a.label.toLowerCase().includes(query)
      || a.id.includes(query))

    const propHits = !query ? [] : (properties || [])
      .filter(p =>
        (p.name || '').toLowerCase().includes(query) ||
        (p.address || '').toLowerCase().includes(query)
      )
      .slice(0, 6)
      .map(p => ({
        kind: 'property', id: p.id,
        label: p.name || 'Property',
        sublabel: p.address,
        Icon: Building2,
        onSelect: () => navigate(`/properties/${p.id}`),
      }))

    return [...pageHits.slice(0, 8), ...actionHits, ...propHits]
  }, [q, properties, allowed, t, navigate])

  useEffect(() => {
    if (cursor >= results.length) setCursor(Math.max(0, results.length - 1))
  }, [results.length, cursor])

  function onKeyDownInput(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[cursor]
      if (item) { item.onSelect(); setOpen(false) }
    }
  }

  if (!currentUser) return null

  return (
    <>
      {/* Launcher pill — only visible on md+ to avoid mobile clutter */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 px-3 h-8 rounded-md border border-border bg-muted/50 text-xs text-muted-foreground hover:bg-muted transition-colors"
        aria-label={t('cmdk.open')}
      >
        <Search className="w-3.5 h-3.5" />
        <span>{t('cmdk.open')}</span>
        <kbd className="ms-3 px-1.5 py-0.5 text-[10px] font-mono bg-background border rounded">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xl bg-popover text-popover-foreground border rounded-xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 border-b">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => { setQ(e.target.value); setCursor(0) }}
                onKeyDown={onKeyDownInput}
                placeholder={t('cmdk.placeholder')}
                className="flex-1 h-12 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border text-muted-foreground">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {results.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">{t('cmdk.empty')}</div>
              ) : (
                <ul className="py-2">
                  {results.map((r, i) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <button
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => { r.onSelect(); setOpen(false) }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-start transition-colors',
                          cursor === i ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/40'
                        )}
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-md flex items-center justify-center border',
                          r.kind === 'page' ? 'bg-muted' : 'bg-primary/10 border-primary/20'
                        )}>
                          <r.Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.label}</p>
                          {r.sublabel && <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>}
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {r.kind === 'page' ? t('cmdk.hint.pages')
                            : r.kind === 'property' ? t('cmdk.hint.properties')
                            : t('cmdk.hint.actions')}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
