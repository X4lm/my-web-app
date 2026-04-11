import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import AppLayout from '@/components/AppLayout'
import { useLocale } from '@/contexts/LocaleContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { ScrollText, User, Pencil, Plus, Wrench, DollarSign, Building2, ArrowRight } from 'lucide-react'

const ACTION_CONFIG = {
  property_created: { label: 'Property Created', icon: Plus, variant: 'default' },
  property_updated: { label: 'Property Updated', icon: Pencil, variant: 'secondary' },
  maintenance_updated: { label: 'Maintenance Updated', icon: Wrench, variant: 'secondary' },
  expense_added: { label: 'Expense Added', icon: DollarSign, variant: 'default' },
  expense_updated: { label: 'Expense Updated', icon: Pencil, variant: 'secondary' },
  expense_deleted: { label: 'Expense Deleted', icon: Pencil, variant: 'destructive' },
}

export default function LogsPage() {
  const { currentUser } = useAuth()
  const { formatDateTime } = useLocale()
  const { properties, loading: propsLoading } = usePropertyAlerts()
  const navigate = useNavigate()
  const [allLogs, setAllLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser || propsLoading || properties.length === 0) {
      if (!propsLoading) setLoading(false)
      return
    }

    const unsubscribes = []
    const logsByProp = {}

    properties.forEach(p => {
      const q = query(
        collection(db, 'users', currentUser.uid, 'properties', p.id, 'logs'),
        orderBy('timestamp', 'desc'),
        limit(20)
      )
      const unsub = onSnapshot(q, (snap) => {
        logsByProp[p.id] = snap.docs.map(d => ({
          id: d.id, propertyId: p.id, propertyName: p.name, ...d.data(),
        }))
        const merged = Object.values(logsByProp).flat()
        merged.sort((a, b) => {
          const ta = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0
          const tb = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0
          return tb - ta
        })
        setAllLogs(merged.slice(0, 50))
        setLoading(false)
      })
      unsubscribes.push(unsub)
    })

    return () => unsubscribes.forEach(u => u())
  }, [currentUser, properties, propsLoading])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity Logs</h1>
          <p className="text-muted-foreground text-sm">
            Recent changes across all your properties.
          </p>
        </div>

        {loading || propsLoading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading logs...</p>
        ) : allLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ScrollText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No activity logs yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Logs will appear here when changes are made to your properties.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ScrollText className="h-4 w-4" /> All Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {allLogs.map((log) => {
                  const config = ACTION_CONFIG[log.action] || { label: log.action, icon: Pencil, variant: 'secondary' }
                  const Icon = config.icon

                  return (
                    <div
                      key={`${log.propertyId}-${log.id}`}
                      className="flex items-start gap-3 py-2.5 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2 transition-colors"
                      onClick={() => navigate(`/properties/${log.propertyId}?tab=logs`)}
                    >
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={config.variant} className="text-[10px]">{config.label}</Badge>
                          {log.details && (
                            <span className="text-xs text-muted-foreground truncate">{log.details}</span>
                          )}
                        </div>
                        {log.changes && log.changes.length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            {log.changes.map((c, j) => (
                              <div key={j} className="flex items-center gap-1.5 text-xs">
                                <span className="font-medium text-muted-foreground">{c.section ? `${c.section} › ` : ''}{c.field}:</span>
                                <span className="text-destructive line-through">{c.from}</span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-emerald-600">{c.to}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Building2 className="w-3 h-3" />
                          <span className="truncate">{log.propertyName}</span>
                          <span>&middot;</span>
                          <User className="w-3 h-3" />
                          <span>{log.author}</span>
                          <span>&middot;</span>
                          <span className="whitespace-nowrap">{formatDateTime(log.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
