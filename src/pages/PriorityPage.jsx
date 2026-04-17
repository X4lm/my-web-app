import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, FileText, Wrench, CreditCard, Users, ShieldCheck, Building2 } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/contexts/LocaleContext'
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import { usePortfolioAggregates } from '@/hooks/usePortfolioAggregates'
import { buildPriorityQueue } from '@/utils/visibility'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const KIND_ICONS = {
  insurance: ShieldCheck,
  permit: FileText,
  cheque: CreditCard,
  work_order: Wrench,
  document: FileText,
  lease: Users,
  maintenance: Wrench,
}

const FILTER_KINDS = [
  { id: 'all', key: 'priority.filter.all' },
  { id: 'cheque', key: 'priority.filter.cheque' },
  { id: 'maintenance', key: 'priority.filter.maintenance' },
  { id: 'lease', key: 'priority.filter.lease' },
  { id: 'document', key: 'priority.filter.document' },
  { id: 'work_order', key: 'priority.filter.work_order' },
]

const LEVEL_META = {
  overdue:  { label: 'priority.overdue',  tint: 'border-red-500/30 bg-red-500/[0.06]',   dot: 'bg-red-500',   text: 'text-red-400'   },
  critical: { label: 'priority.critical', tint: 'border-orange-500/30 bg-orange-500/[0.04]', dot: 'bg-orange-500', text: 'text-orange-400' },
  upcoming: { label: 'priority.upcoming', tint: 'border-amber-500/25 bg-amber-500/[0.03]', dot: 'bg-amber-500', text: 'text-amber-400' },
  later:    { label: 'priority.later',    tint: 'border-blue-500/20 bg-blue-500/[0.03]',   dot: 'bg-blue-400',   text: 'text-blue-300'   },
}

export default function PriorityPage() {
  const { t } = useLocale()
  const { properties, allAlerts, loading: alertsLoading } = usePropertyAlerts()
  const { cheques, workOrders, documents, loading: aggLoading } = usePortfolioAggregates(properties)
  const [filter, setFilter] = useState('all')

  const items = useMemo(() => {
    return buildPriorityQueue({
      properties,
      cheques,
      workOrders,
      documents,
      alerts: allAlerts,
    })
  }, [properties, cheques, workOrders, documents, allAlerts])

  const filtered = filter === 'all' ? items : items.filter(i => i.kind === filter)

  const grouped = useMemo(() => {
    const g = { overdue: [], critical: [], upcoming: [], later: [] }
    for (const i of filtered) {
      if (g[i.level]) g[i.level].push(i)
    }
    return g
  }, [filtered])

  const loading = alertsLoading || aggLoading
  const totalCount = filtered.length

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('priority.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('priority.subtitle')}</p>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          {FILTER_KINDS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'cursor-pointer px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {t(f.key)}
            </button>
          ))}
          <span className="ms-auto text-xs text-muted-foreground self-center">
            {t('priority.count').replace('{n}', totalCount)}
          </span>
        </div>

        {loading && (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{t('priority.loading')}</CardContent></Card>
        )}

        {!loading && totalCount === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-base font-medium">{t('priority.empty')}</p>
            </CardContent>
          </Card>
        )}

        {!loading && (
          <div className="space-y-6">
            {['overdue', 'critical', 'upcoming', 'later'].map(level => {
              const list = grouped[level]
              if (!list.length) return null
              const meta = LEVEL_META[level]
              return (
                <Card key={level}>
                  <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', meta.dot)} />
                      <span className={meta.text}>{t(meta.label)}</span>
                      <span className="text-muted-foreground font-normal">· {list.length}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y border-t">
                      {list.map(it => {
                        const Icon = KIND_ICONS[it.kind] || AlertCircle
                        const daysLabel =
                          it.days === 0 ? t('priority.today')
                          : it.days < 0 ? `${Math.abs(it.days)}${t('priority.daysOverdue')}`
                          : `${it.days}${t('priority.daysLeft')}`
                        return (
                          <li key={it.id}>
                            <Link
                              to={it.href}
                              className={cn(
                                'flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors',
                                meta.tint
                              )}
                            >
                              <div className="w-8 h-8 rounded-md bg-background border flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{it.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{it.subtitle}</p>
                              </div>
                              <div className="text-end shrink-0">
                                <p className="text-xs font-medium">{daysLabel}</p>
                                {it.date && <p className="text-[11px] text-muted-foreground">{formatDate(it.date)}</p>}
                              </div>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
