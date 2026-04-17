import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale } from '@/contexts/LocaleContext'
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import { usePortfolioAggregates } from '@/hooks/usePortfolioAggregates'
import { daysUntil } from '@/utils/visibility'
import { formatDate, cn } from '@/lib/utils'

const FILTERS = [
  { id: 'all',     key: 'docExpiry.filter.all',     test: () => true },
  { id: 'overdue', key: 'docExpiry.filter.overdue', test: (d) => d !== null && d < 0 },
  { id: '30',      key: 'docExpiry.filter.30',      test: (d) => d !== null && d >= 0 && d <= 30 },
  { id: '60',      key: 'docExpiry.filter.60',      test: (d) => d !== null && d >= 0 && d <= 60 },
  { id: '90',      key: 'docExpiry.filter.90',      test: (d) => d !== null && d >= 0 && d <= 90 },
]

const CATEGORY_LABELS = {
  title_deed: 'Title Deed',
  lease_agreement: 'Lease Agreement',
  ejari: 'Ejari',
  insurance: 'Insurance',
  municipality_permit: 'Municipality Permit',
  noc: 'NOC',
  dewa: 'DEWA',
  chiller: 'Chiller',
  tenant_id: 'Tenant ID',
  tenant_visa: 'Tenant Visa',
  trade_license: 'Trade License',
  salary_certificate: 'Salary Certificate',
  maintenance_invoice: 'Maintenance Invoice',
  inspection_report: 'Inspection Report',
  receipt: 'Receipt',
  other: 'Other',
}

function daysBadge(d, t) {
  if (d === null || d === undefined) return <span className="text-xs text-muted-foreground">—</span>
  if (d < 0) return <span className="inline-block px-2 py-0.5 rounded-md bg-red-500/15 text-red-500 text-xs font-semibold">{Math.abs(d)}d overdue</span>
  if (d === 0) return <span className="inline-block px-2 py-0.5 rounded-md bg-red-500/15 text-red-500 text-xs font-semibold">Today</span>
  if (d <= 7)  return <span className="inline-block px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-500 text-xs font-semibold">{d}d</span>
  if (d <= 30) return <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 text-xs font-semibold">{d}d</span>
  if (d <= 60) return <span className="inline-block px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-500 text-xs font-semibold">{d}d</span>
  return <span className="text-xs text-muted-foreground">{d}d</span>
}

export default function DocumentsExpiryPage() {
  const { t } = useLocale()
  const { properties, loading: alertsLoading } = usePropertyAlerts()
  const { documents, loading: aggLoading } = usePortfolioAggregates(properties)
  const [filter, setFilter] = useState('all')

  const enriched = useMemo(() => {
    return documents
      .map(d => ({ ...d, days: daysUntil(d.expiryDate) }))
      .filter(d => d.expiryDate) // only docs with expiry
      .sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999))
  }, [documents])

  const active = FILTERS.find(f => f.id === filter)
  const visible = enriched.filter(d => active.test(d.days))

  const overdueCount = enriched.filter(d => d.days !== null && d.days < 0).length
  const soonCount = enriched.filter(d => d.days !== null && d.days >= 0 && d.days <= 30).length
  const loading = alertsLoading || aggLoading

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('docExpiry.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('docExpiry.subtitle')}</p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Tracked</p><p className="text-2xl font-bold">{enriched.length}</p></CardContent></Card>
          <Card className="border-red-500/30"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Expired</p><p className="text-2xl font-bold text-red-500">{overdueCount}</p></CardContent></Card>
          <Card className="border-amber-500/30"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Expiring ≤ 30d</p><p className="text-2xl font-bold text-amber-500">{soonCount}</p></CardContent></Card>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'cursor-pointer px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filter === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {t(f.key)}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{visible.length} {t('atlas.properties').toLowerCase() === 'properties' ? 'documents' : 'وثائق'}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
            ) : visible.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t('docExpiry.empty')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('docExpiry.column.doc')}</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('docExpiry.column.category')}</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('docExpiry.column.property')}</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('docExpiry.column.expiry')}</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-end">{t('docExpiry.column.days')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visible.map(d => (
                      <tr key={`${d.propertyId}-${d.id}`} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{d.name || '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{CATEGORY_LABELS[d.category] || d.category || '—'}</td>
                        <td className="px-4 py-3">
                          <Link to={`/properties/${d.propertyId}`} className="text-xs text-primary hover:underline">
                            {d.propertyName || '—'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs">{formatDate(d.expiryDate)}</td>
                        <td className="px-4 py-3 text-end">{daysBadge(d.days, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
