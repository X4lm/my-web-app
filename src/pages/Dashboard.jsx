import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, limit, collectionGroup } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth, ROLES } from '@/contexts/AuthContext'
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import AppLayout from '@/components/AppLayout'
import AlertsPanel from '@/components/AlertsPanel'
import TenantDashboard from '@/components/TenantDashboard'
import VendorDashboard from '@/components/VendorDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2, DollarSign, CheckCircle, Users, Percent,
  Home, ArrowRight, Receipt,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'
import { hasUnits } from '@/lib/utils'

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth()

  // If user is a tenant, render the tenant-specific dashboard
  if (userProfile?.role === ROLES.TENANT) {
    return <TenantDashboard />
  }

  // If user is a vendor, render the vendor-specific dashboard
  if (userProfile?.role === ROLES.VENDOR) {
    return <VendorDashboard />
  }
  const navigate = useNavigate()
  const { t, formatCurrency, formatDate } = useLocale()
  const { properties, allAlerts, loading } = usePropertyAlerts()
  const [allUnits, setAllUnits] = useState([])
  const [recentExpenses, setRecentExpenses] = useState([])
  const [unitsLoading, setUnitsLoading] = useState(true)

  // Load all units across all properties
  useEffect(() => {
    if (!currentUser || loading) return

    const buildings = properties.filter(p => hasUnits(p.type))
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
    .filter(p => !hasUnits(p.type) && p.status === 'occupied')
    .reduce((s, p) => s + Number(p.rentAmount || 0), 0)
  const unitRent = allUnits
    .filter(u => u.tenantName && u.tenantName.trim())
    .reduce((s, u) => s + Number(u.monthlyRent || 0), 0)
  const monthlyIncome = nonBuildingRent + unitRent

  // Total revenue (expected from all sources)
  const totalExpectedRent = properties
    .filter(p => !hasUnits(p.type))
    .reduce((s, p) => s + Number(p.rentAmount || 0), 0) +
    allUnits.reduce((s, u) => s + Number(u.monthlyRent || 0), 0)

  const statCards = [
    { label: t('dashboard.totalProperties'), value: totalProps, icon: Building2, description: t('dashboard.allProperties') },
    { label: t('dashboard.available'), value: available, icon: CheckCircle, description: t('dashboard.readyToRent') },
    { label: t('dashboard.occupied'), value: occupied, icon: Users, description: t('dashboard.currentlyRented') },
    { label: t('dashboard.monthlyIncome'), value: formatCurrency(monthlyIncome), icon: DollarSign, description: t('dashboard.currentlyRented') },
  ]

  const unitStatCards = [
    { label: t('dashboard.totalUnits'), value: totalUnits, icon: Home, description: t('dashboard.allProperties') },
    { label: t('dashboard.occupied'), value: occupiedUnits, icon: Users, description: `${totalUnits - occupiedUnits} vacant` },
    { label: t('dashboard.occupancy'), value: `${occupancyRate}%`, icon: Percent, description: totalUnits > 0 ? `${occupiedUnits} / ${totalUnits}` : t('dashboard.totalUnits') },
    { label: t('common.rent'), value: formatCurrency(totalExpectedRent), icon: DollarSign, description: t('dashboard.allProperties') },
  ]

  const recent = properties.slice(0, 5)

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('dashboard.welcomeBack')}, {currentUser?.displayName || 'there'}.
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
            <h2 className="text-sm font-medium text-muted-foreground mb-3">{t('dashboard.unitOverview')}</h2>
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
          <AlertsPanel alerts={allAlerts} title={t('dashboard.activeAlerts')} maxItems={8} />
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent properties */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('dashboard.recentProperties')}</CardTitle>
                {properties.length > 5 && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/properties')}>
                    {t('dashboard.viewAll')} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
              ) : recent.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {t('dashboard.noProperties')}
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
                          {p.status === 'available' ? t('common.available') : t('common.occupied')}
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
                <Receipt className="w-4 h-4" /> {t('dashboard.recentExpenses')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
              ) : recentExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {t('dashboard.noExpenses')}
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
