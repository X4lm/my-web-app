import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, Bell } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

function getRelativeTime(alert, tPlural) {
  const now = Date.now()
  const d = new Date(alert.date + 'T00:00:00').getTime()
  const days = Math.abs(Math.floor((now - d) / 86400000))
  if (alert.level === 'overdue') {
    if (days >= 30) {
      const months = Math.floor(days / 30)
      return tPlural(months, 'plural.monthsOverdue.one', 'plural.monthsOverdue.other')
    }
    return tPlural(days, 'plural.daysOverdue.one', 'plural.daysOverdue.other')
  }
  if (days >= 30) {
    const months = Math.floor(days / 30)
    return tPlural(months, 'plural.dueInMonths.one', 'plural.dueInMonths.other')
  }
  return tPlural(days, 'plural.dueInDays.one', 'plural.dueInDays.other')
}

function getAlertUrl(alert) {
  if (alert.section === 'Property') {
    return `/properties/${alert.propertyId}?tab=overview`
  }
  return `/properties/${alert.propertyId}?tab=maintenance${alert.sectionKey ? `&section=${alert.sectionKey}` : ''}`
}

export default function AlertsPanel({ alerts, title, maxItems = 10 }) {
  const navigate = useNavigate()
  const { t, tPlural, formatDate } = useLocale()
  const [expanded, setExpanded] = useState(false)
  const displayTitle = title || t('alerts.allAlerts')

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">{t('alerts.noAlerts')}</p>
        </CardContent>
      </Card>
    )
  }

  const overdue = alerts.filter(a => a.level === 'overdue')
  const upcoming = alerts.filter(a => a.level === 'upcoming')
  const ordered = [...overdue, ...upcoming]
  const visibleCount = expanded ? ordered.length : maxItems
  const sorted = ordered.slice(0, visibleCount)
  const hiddenCount = Math.max(0, ordered.length - maxItems)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> {displayTitle}
          </CardTitle>
          <div className="flex gap-2">
            {overdue.length > 0 && (
              <Badge variant="destructive" className="text-xs">{overdue.length} {t('common.overdue').toLowerCase()}</Badge>
            )}
            {upcoming.length > 0 && (
              <Badge variant="warning" className="text-xs">{upcoming.length} {t('common.dueSoon').toLowerCase()}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {sorted.map((alert, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-2.5 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(getAlertUrl(alert))}
            >
              {alert.level === 'overdue' ? (
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={alert.propertyName}>{alert.propertyName}</p>
                <p className="text-xs text-muted-foreground">
                  {alert.section} &middot; {alert.field}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getRelativeTime(alert, tPlural)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <Badge
                  variant={alert.level === 'overdue' ? 'destructive' : 'warning'}
                  className="text-xs"
                >
                  {alert.level === 'overdue' ? t('common.overdue') : t('common.dueSoon')}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(alert.date)}</p>
              </div>
            </div>
          ))}
        </div>
        {hiddenCount > 0 && (
          <div className="mt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setExpanded(e => !e)}
            >
              {expanded
                ? t('alerts.showLess')
                : t('alerts.showMore', { n: hiddenCount })}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
