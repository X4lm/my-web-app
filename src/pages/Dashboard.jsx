import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, limit, collectionGroup } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import AppLayout from '@/components/AppLayout'
import AlertsPanel from '@/components/AlertsPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2, DollarSign, CheckCircle, Users, Percent,
  Home, ArrowRight, Receipt, UserPlus, Pencil, Trash2, Plus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'

export default function Dashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const { formatCurrency, formatDate } = useLocale()
  const { properties, allAlerts, loading } = usePropertyAlerts()
  const [allUnits, setAllUnits] = useState([])
  const [recentExpenses, setRecentExpenses] = useState([])
  const [unitsLoading, setUnitsLoading] = useState(true)

  // Load all units across all properties
  useEffect(() => {
    if (!currentUser || loading) return

    const buildings = properties.filter(p => p.type === 'residential_building')
    if (buildings.length === 0) {
      setAllUnits([])
      setUnitsLoading(false)
      return
    }

    const unsubscribes = []
    const unitsByProp = {}

    buildings.forEach(p => {
      const q = query(collection(db, 'users', currentUser.uid, 'properties', p.id, 'units'))
      const unsub = onSnapshot(q, (snap) => {
        unitsByProp[p.id] = snap.docs.map(d => ({ id: d.id, propertyId: p.id, propertyName: p.name, ...d.data() }))
        const all = Object.values(unitsByProp).flat()
        setAllUnits(all)
        setUnitsLoading(false)
      })
      unsubscribes.push(unsub)
    })

    return () => unsubscribes.forEach(u => u())
  }, [currentUser, properties, loading])

  // Load recent expenses across all properties
  useEffect(() => {
    if (!currentUser || loading || properties.length === 0) return

    const unsubscribes = []
    const expensesByProp = {}

    properties.forEach(p => {
      const q = query(
        collection(db, 'users', currentUser.uid, 'properties', p.id, 'expenses'),
        orderBy('date', 'desc'),
        limit(5)
      )
      const unsub = onSnapshot(q, (snap) => {
        expensesByProp[p.id] = snap.docs.map(d => ({
          id: d.id, propertyId: p.id, propertyName: p.name, ...d.data(),
        }))
        const all = Object.values(expensesByProp).flat()
        all.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        setRecentExpenses(all.slice(0, 10))
      })
      unsubscribes.push(unsub)
    })

    return () => unsubscribes.forEach(u => u())
  }, [currentUser, properties, loading])

  // ── Stats ──
  const totalProps = properties.length
  const available = properties.filter(p => p.status === 'available').length
  const occupied = properties.filter(p => p.status === 'occupied').length

  // Unit stats
  const totalUnits = allUnits.length
  const occupiedUnits = allUnits.filter(u => u.tenantName && u.tenantName.trim()).length
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

  // Monthly income: property-level rent for non-buildings + unit rent for buildings
  const nonBuildingRent = properties
    .filter(p => p.type !== 'residential_building' && p.status === 'occupied')
    .reduce((s, p) => s + Number(p.rentAmount || 0), 0)
  const unitRent = allUnits
    .filter(u => u.tenantName && u.tenantName.trim())
    .reduce((s, u) => s + Number(u.monthlyRent || 0), 0)
  const monthlyIncome = nonBuildingRent + unitRent

  // Total revenue (expected from all sources)
  const totalExpectedRent = properties
    .filter(p => p.type !== 'residential_building')
    .reduce((s, p) => s + Number(p.rentAmount || 0), 0) +
    allUnits.reduce((s, u) => s + Number(u.monthlyRent || 0), 0)

  const statCards = [
    { label: 'Total Properties', value: totalProps, icon: Building2, description: 'All listed properties' },
    { label: 'Available', value: available, icon: CheckCircle, description: 'Ready to rent' },
    { label: 'Occupied', value: occupied, icon: Users, description: 'Currently rented' },
    { label: 'Monthly Income', value: formatCurrency(monthlyIncome), icon: DollarSign, description: 'From occupied units & properties' },
  ]

  const unitStatCards = [
    { label: 'Total Units', value: totalUnits, icon: Home, description: 'Across all buildings' },
    { label: 'Occupied Units', value: occupiedUnits, icon: Users, description: `${totalUnits - occupiedUnits} vacant` },
    { label: 'Occupancy Rate', value: `${occupancyRate}%`, icon: Percent, description: totalUnits > 0 ? `${occupiedUnits} of ${totalUnits}` : 'No units' },
    { label: 'Expected Rent', value: formatCurrency(totalExpectedRent), icon: DollarSign, description: 'From all units & properties' },
  ]

  const recent = properties.slice(0, 5)

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Welcome back, {currentUser?.displayName || 'there'}.
          </p>
        </div>

        {/* Property stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, description }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{loading ? '—' : value}</div>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Unit stats (only if there are buildings with units) */}
        {!loading && !unitsLoading && totalUnits > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Unit Overview</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {unitStatCards.map(({ label, value, icon: Icon, description }) => (
                <Card key={label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Global alerts panel */}
        {!loading && allAlerts.length > 0 && (
          <AlertsPanel alerts={allAlerts} title="Active Alerts Across All Properties" maxItems={8} />
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent properties */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Properties</CardTitle>
                {properties.length > 5 && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/properties')}>
                    View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
              ) : recent.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No properties yet. Go to Properties to add one.
                </p>
              ) : (
                <div className="space-y-3">
                  {recent.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2 transition-colors"
                      onClick={() => navigate(`/properties/${p.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.address}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(p.rentAmount)}</p>
                        <p className={`text-xs ${p.status === 'available' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {p.status === 'available' ? 'Available' : 'Occupied'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent expenses / activity feed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Recent Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
              ) : recentExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No expenses recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentExpenses.map(exp => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2 transition-colors"
                      onClick={() => navigate(`/properties/${exp.propertyId}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0">
                          <Receipt className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{exp.description}</p>
                          <p className="text-xs text-muted-foreground">{exp.propertyName} &middot; {formatDate(exp.date)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-medium text-destructive">-{formatCurrency(exp.cost)}</p>
                        <Badge variant="secondary" className="text-[10px]">{exp.category}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
