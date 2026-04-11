import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import AppLayout from '@/components/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileCheck, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

export default function ChequeCalendarPage() {
  const { currentUser } = useAuth()
  const { formatCurrency, formatDate } = useLocale()
  const { properties, loading: propsLoading } = usePropertyAlerts()
  const [allCheques, setAllCheques] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(new Date())

  // Load cheques from all properties
  useEffect(() => {
    if (!currentUser || propsLoading || properties.length === 0) {
      if (!propsLoading) setLoading(false)
      return
    }

    const unsubs = []
    const chequesByProp = {}

    properties.forEach(p => {
      const q = query(
        collection(db, 'users', currentUser.uid, 'properties', p.id, 'cheques'),
        orderBy('date', 'asc')
      )
      const unsub = onSnapshot(q, (snap) => {
        chequesByProp[p.id] = snap.docs.map(d => ({
          id: d.id, propertyId: p.id, propertyName: p.name, ...d.data(),
        }))
        setAllCheques(Object.values(chequesByProp).flat())
        setLoading(false)
      })
      unsubs.push(unsub)
    })

    return () => unsubs.forEach(u => u())
  }, [currentUser, properties, propsLoading])

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // Today's cheques
  const todayCheques = allCheques.filter(c => c.date === todayStr && c.status === 'pending')

  // Overdue (past date, still pending)
  const overdue = allCheques.filter(c => c.status === 'pending' && c.date && c.date < todayStr)

  // Upcoming 7 days
  const next7 = new Date(today)
  next7.setDate(next7.getDate() + 7)
  const next7Str = next7.toISOString().slice(0, 10)
  const upcoming = allCheques.filter(c => c.status === 'pending' && c.date > todayStr && c.date <= next7Str)

  // Month view
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthCheques = allCheques.filter(c => c.date?.startsWith(monthPrefix))

  // Group by date
  const byDate = {}
  monthCheques.forEach(c => {
    if (!byDate[c.date]) byDate[c.date] = []
    byDate[c.date].push(c)
  })

  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  const STATUS_COLORS = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    deposited: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    cleared: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    bounced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    cancelled: 'bg-gray-100 text-gray-600',
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cheque Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Daily cheque deposit view across all properties.</p>
        </div>

        {/* Today's action */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className={todayCheques.length > 0 ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Deposit Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? '—' : todayCheques.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {todayCheques.length > 0
                  ? `${formatCurrency(todayCheques.reduce((s, c) => s + Number(c.amount || 0), 0))} total`
                  : 'No cheques due today'}
              </p>
            </CardContent>
          </Card>

          <Card className={overdue.length > 0 ? 'border-destructive/50 bg-destructive/5' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                {overdue.length > 0 && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? '—' : overdue.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {overdue.length > 0
                  ? `${formatCurrency(overdue.reduce((s, c) => s + Number(c.amount || 0), 0))} pending`
                  : 'All caught up'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Next 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? '—' : upcoming.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {upcoming.length > 0
                  ? `${formatCurrency(upcoming.reduce((s, c) => s + Number(c.amount || 0), 0))} coming`
                  : 'No cheques upcoming'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Today's list */}
        {todayCheques.length > 0 && (
          <Card className="border-amber-300">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="w-4 h-4" /> Cheques to Deposit Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {todayCheques.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded border bg-background">
                    <div>
                      <p className="text-sm font-medium">{c.payerName || 'Unknown'} — #{c.chequeNumber}</p>
                      <p className="text-xs text-muted-foreground">{c.propertyName} · {c.bankName}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(c.amount)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overdue list */}
        {overdue.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" /> Overdue Cheques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {overdue.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded border bg-destructive/5">
                    <div>
                      <p className="text-sm font-medium">{c.payerName || 'Unknown'} — #{c.chequeNumber}</p>
                      <p className="text-xs text-muted-foreground">{c.propertyName} · Due: {formatDate(c.date)}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(c.amount)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly calendar view */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{monthName}</CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8"
                  onClick={() => setViewDate(new Date(year, month - 1, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8"
                  onClick={() => setViewDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8"
                  onClick={() => setViewDate(new Date(year, month + 1, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {Object.keys(byDate).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No cheques this month.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, cheques]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${date === todayStr ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {formatDate(date)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {cheques.length} cheque{cheques.length > 1 ? 's' : ''} · {formatCurrency(cheques.reduce((s, c) => s + Number(c.amount || 0), 0))}
                      </span>
                    </div>
                    <div className="space-y-1 ml-2">
                      {cheques.map(c => (
                        <div key={c.id} className="flex items-center justify-between text-sm py-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${c.status === 'pending' ? 'bg-amber-500' : c.status === 'cleared' ? 'bg-emerald-500' : c.status === 'bounced' ? 'bg-red-500' : 'bg-blue-500'}`} />
                            <span>{c.payerName || 'Unknown'}</span>
                            <span className="text-muted-foreground">#{c.chequeNumber}</span>
                            <Badge variant="secondary" className="text-[9px]">{c.propertyName}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[c.status] || ''}`}>
                              {c.status}
                            </span>
                            <span className="font-medium">{formatCurrency(c.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
