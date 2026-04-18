import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Building2, MapPin, AlertTriangle, ExternalLink } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import TutorialBubble from '@/components/TutorialBubble'
import { Card, CardContent } from '@/components/ui/card'
import { useLocale } from '@/contexts/LocaleContext'
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import { useTutorial } from '@/hooks/useTutorial'
import { getSteps } from '@/lib/tutorialSteps'
import { emirateOf, EMIRATE_LABELS, EMIRATE_LABELS_AR, computeHealthScore } from '@/utils/visibility'
import { usePortfolioAggregates } from '@/hooks/usePortfolioAggregates'
import { cn } from '@/lib/utils'

const EMIRATE_ORDER = ['dubai', 'abu_dhabi', 'sharjah', 'ajman', 'rak', 'fujairah', 'uaq', 'other']

function StatusPin({ tone }) {
  const colors = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    gray: 'bg-muted-foreground',
  }
  return (
    <span className={cn('inline-block w-2.5 h-2.5 rounded-full ring-2 ring-background', colors[tone] || colors.gray)} />
  )
}

export default function AtlasPage() {
  const { t, tPlural, isRTL } = useLocale()
  const { properties, alertsByProperty, loading: alertsLoading } = usePropertyAlerts()
  const { units, cheques, documents, loading: aggLoading } = usePortfolioAggregates(properties)
  const steps = useMemo(() => getSteps(t).atlas, [t])
  const tutorial = useTutorial('atlas', steps)

  const labels = isRTL ? EMIRATE_LABELS_AR : EMIRATE_LABELS

  const grouped = useMemo(() => {
    const g = {}
    for (const p of properties) {
      const e = emirateOf(p)
      if (!g[e]) g[e] = []
      const propUnits = units.filter(u => u.propertyId === p.id)
      const propCheques = cheques.filter(c => c.propertyId === p.id)
      const propDocs = documents.filter(d => d.propertyId === p.id)
      const propAlerts = alertsByProperty[p.id] || []
      const health = computeHealthScore({
        property: p,
        units: propUnits,
        alerts: propAlerts,
        cheques: propCheques,
        documents: propDocs,
      })
      g[e].push({ ...p, health, alertCount: propAlerts.length, unitCount: propUnits.length })
    }
    return g
  }, [properties, units, cheques, documents, alertsByProperty])

  const loading = alertsLoading || aggLoading

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('atlas.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('atlas.subtitle')}</p>
        </div>

        {loading && (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
        )}

        {!loading && properties.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t('atlas.empty')}</p>
            </CardContent>
          </Card>
        )}

        {!loading && EMIRATE_ORDER.filter(e => grouped[e]?.length).map(emirate => {
          const list = grouped[emirate]
          const totalAlerts = list.reduce((s, p) => s + p.alertCount, 0)
          return (
            <section key={emirate} data-tour="atlas-groups">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="w-4 h-4 text-primary" />
                <h2 className="text-base font-semibold">{labels[emirate]}</h2>
                <span className="text-xs text-muted-foreground">
                  · {list.length} {t('atlas.properties')}
                </span>
                {totalAlerts > 0 && (
                  <span className="text-xs text-amber-500 inline-flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {totalAlerts} {t('atlas.alerts')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map(p => {
                  const mapsUrl = p.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}` : null
                  return (
                    <Card key={p.id} data-tour="atlas-card" className="group hover:border-primary/40 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <StatusPin tone={p.health.tone} />
                            <Link to={`/properties/${p.id}`} className="font-semibold text-sm truncate hover:underline">
                              {p.name}
                            </Link>
                          </div>
                          <span className={cn(
                            'text-[11px] font-bold px-1.5 py-0.5 rounded',
                            p.health.tone === 'green' && 'bg-green-500/15 text-green-500',
                            p.health.tone === 'amber' && 'bg-amber-500/15 text-amber-500',
                            p.health.tone === 'red' && 'bg-red-500/15 text-red-500',
                          )}>
                            {p.health.score}
                          </span>
                        </div>
                        {p.address && (
                          <p className="text-xs text-muted-foreground truncate mb-3">{p.address}</p>
                        )}
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-3 text-muted-foreground">
                            {p.unitCount > 0 && <span>{tPlural(p.unitCount, 'plural.unit.one', 'plural.unit.other')}</span>}
                            {p.alertCount > 0 && <span className="text-amber-500">{tPlural(p.alertCount, 'plural.alert.one', 'plural.alert.other')}</span>}
                          </div>
                          {mapsUrl && (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {t('atlas.viewMap')} <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
      {tutorial.active && <TutorialBubble {...tutorial} />}
    </AppLayout>
  )
}
