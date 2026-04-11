import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollText, User, Pencil, Plus, Wrench, DollarSign, ArrowRight } from 'lucide-react'

const ACTION_CONFIG = {
  property_created: { label: 'Property Created', icon: Plus, variant: 'default' },
  property_updated: { label: 'Property Updated', icon: Pencil, variant: 'secondary' },
  maintenance_updated: { label: 'Maintenance Updated', icon: Wrench, variant: 'secondary' },
  expense_added: { label: 'Expense Added', icon: DollarSign, variant: 'default' },
  expense_updated: { label: 'Expense Updated', icon: Pencil, variant: 'secondary' },
  expense_deleted: { label: 'Expense Deleted', icon: Pencil, variant: 'destructive' },
}

export default function LogsTab({ propertyId }) {
  const { currentUser } = useAuth()
  const { formatDateTime } = useLocale()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser || !propertyId) return

    const q = query(
      collection(db, 'users', currentUser.uid, 'properties', propertyId, 'logs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    )

    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      console.error('[Firestore] Logs listen error:', err)
      setLoading(false)
    })

    return unsub
  }, [currentUser, propertyId])

  if (loading) {
    return <p className="text-sm text-muted-foreground py-12 text-center">Loading logs...</p>
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ScrollText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No activity logs yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Logs will appear here when changes are made.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ScrollText className="h-4 w-4" /> Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {logs.map((log) => {
            const config = ACTION_CONFIG[log.action] || { label: log.action, icon: Pencil, variant: 'secondary' }
            const Icon = config.icon

            return (
              <div key={log.id} className="flex items-start gap-3 py-2.5 border-b last:border-0">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={config.variant} className="text-[10px]">{config.label}</Badge>
                    {log.details && (
                      <span className="text-xs text-muted-foreground">{log.details}</span>
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
                    <User className="w-3 h-3" />
                    <span>{log.author}</span>
                    <span>&middot;</span>
                    <span>{formatDateTime(log.timestamp)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
