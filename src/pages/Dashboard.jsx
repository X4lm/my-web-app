import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, DollarSign, CheckCircle, Users } from 'lucide-react'

export default function Dashboard() {
  const { currentUser } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, 'users', currentUser.uid, 'properties'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      console.log('[Firestore] Properties loaded:', snap.docs.length)
      setProperties(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      console.error('[Firestore] Listen error:', err.code, err.message)
      setLoading(false)
    })
    return unsub
  }, [currentUser.uid])

  const stats = {
    total: properties.length,
    available: properties.filter(p => p.status === 'available').length,
    occupied: properties.filter(p => p.status === 'occupied').length,
    revenue: properties.filter(p => p.status === 'occupied').reduce((s, p) => s + Number(p.rentAmount || 0), 0),
  }

  const statCards = [
    { label: 'Total Properties', value: stats.total, icon: Building2, description: 'All listed properties' },
    { label: 'Available', value: stats.available, icon: CheckCircle, description: 'Ready to rent' },
    { label: 'Occupied', value: stats.occupied, icon: Users, description: 'Currently rented' },
    { label: 'Monthly Revenue', value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, description: 'From occupied units' },
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

        {/* Stats grid */}
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

        {/* Recent properties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Properties</CardTitle>
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
                  <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
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
                      <p className="text-sm font-medium">${Number(p.rentAmount || 0).toLocaleString()}</p>
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
      </div>
    </AppLayout>
  )
}
