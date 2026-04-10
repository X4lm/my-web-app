import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, AlertTriangle, Bell } from 'lucide-react'
import { formatDate } from '@/lib/utils'

function getRelativeTime(alert) {
  const now = Date.now()
  const d = new Date(alert.date + 'T00:00:00').getTime()
  const days = Math.abs(Math.floor((now - d) / 86400000))
  if (alert.level === 'overdue') {
    if (days >= 365) return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m overdue`
    if (days >= 30) return `${Math.floor(days / 30)} months overdue`
    return `${days} day${days !== 1 ? 's' : ''} overdue`
  }
  if (days >= 30) return `Due in ${Math.floor(days / 30)} months`
  return `Due in ${days} day${days !== 1 ? 's' : ''}`
}

function getAlertTab(alert) {
  return alert.section === 'Property' ? 'overview' : 'maintenance'
}

export default function AlertsPanel({ alerts, title = 'Active Alerts', maxItems = 10 }) {
  const navigate = useNavigate()

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No active alerts.</p>
        </CardContent>
      </Card>
    )
  }

  const overdue = alerts.filter(a => a.level === 'overdue')
  const upcoming = alerts.filter(a => a.level === 'upcoming')
  const sorted = [...overdue, ...upcoming].slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> {title}
          </CardTitle>
          <div className="flex gap-2">
            {overdue.length > 0 && (
              <Badge variant="destructive" className="text-xs">{overdue.length} overdue</Badge>
            )}
            {upcoming.length > 0 && (
              <Badge variant="warning" className="text-xs">{upcoming.length} upcoming</Badge>
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
              onClick={() => navigate(`/properties/${alert.propertyId}?tab=${getAlertTab(alert)}`)}
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
                  {getRelativeTime(alert)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <Badge
                  variant={alert.level === 'overdue' ? 'destructive' : 'warning'}
                  className="text-xs"
                >
                  {alert.level === 'overdue' ? 'Overdue' : 'Due Soon'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(alert.date)}</p>
              </div>
            </div>
          ))}
        </div>
        {alerts.length > maxItems && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            + {alerts.length - maxItems} more alerts
          </p>
        )}
      </CardContent>
    </Card>
  )
}
