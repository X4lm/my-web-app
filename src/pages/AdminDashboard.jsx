import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useLocale } from '@/contexts/LocaleContext'
import AppLayout from '@/components/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Building2, Home, Percent, UserPlus, Activity, Clock, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    roleCounts: {},
    totalProperties: 0,
    totalUnits: 0,
    occupancyRate: 0,
    recentSignups: [],
    recentLogins: [],
    signupChart: [],
    activeThisWeek: 0,
  })

  useEffect(() => {
    loadAdminData()
  }, [])

  async function loadAdminData() {
    try {
      // Fetch all users
      const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Role breakdown
      const roleCounts = {}
      allUsers.forEach(u => {
        const r = u.role || 'owner'
        roleCounts[r] = (roleCounts[r] || 0) + 1
      })

      // Signup chart data — last 12 weeks
      const now = new Date()
      const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000)
      const weeklySignups = {}
      for (let i = 0; i < 12; i++) {
        const weekStart = new Date(twelveWeeksAgo.getTime() + i * 7 * 24 * 60 * 60 * 1000)
        const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
        weeklySignups[label] = 0
      }

      // Active this week
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      let activeThisWeek = 0

      allUsers.forEach(u => {
        const createdAt = u.createdAt?.toDate ? u.createdAt.toDate() : (u.createdAt ? new Date(u.createdAt) : null)
        if (createdAt && createdAt >= twelveWeeksAgo) {
          const weekIdx = Math.floor((createdAt - twelveWeeksAgo) / (7 * 24 * 60 * 60 * 1000))
          const keys = Object.keys(weeklySignups)
          if (weekIdx >= 0 && weekIdx < keys.length) {
            weeklySignups[keys[weekIdx]]++
          }
        }
        const lastLogin = u.lastLogin?.toDate ? u.lastLogin.toDate() : (u.lastLogin ? new Date(u.lastLogin) : null)
        if (lastLogin && lastLogin >= oneWeekAgo) {
          activeThisWeek++
        }
      })

      const signupChart = Object.entries(weeklySignups).map(([week, count]) => ({ week, signups: count }))

      // Count properties and units across all users (owners)
      let totalProperties = 0
      let totalUnits = 0
      let occupiedUnits = 0

      const owners = allUsers.filter(u => u.role === 'owner' || u.role === 'admin')
      for (const owner of owners) {
        try {
          const propsSnap = await getDocs(collection(db, 'users', owner.id, 'properties'))
          totalProperties += propsSnap.size
          for (const propDoc of propsSnap.docs) {
            const prop = propDoc.data()
            if (['residential_building', 'commercial_building'].includes(prop.type)) {
              const unitsSnap = await getDocs(collection(db, 'users', owner.id, 'properties', propDoc.id, 'units'))
              totalUnits += unitsSnap.size
              unitsSnap.docs.forEach(uDoc => {
                if (uDoc.data().tenantName?.trim()) occupiedUnits++
              })
            } else {
              totalUnits++
              if (prop.status === 'occupied') occupiedUnits++
            }
          }
        } catch (e) {
          // Skip if permission denied
        }
      }

      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

      // Recent signups (last 10)
      const recentSignups = allUsers.slice(0, 10)

      // Recent logins (sorted by lastLogin)
      const recentLogins = [...allUsers]
        .filter(u => u.lastLogin)
        .sort((a, b) => {
          const aT = a.lastLogin?.toDate ? a.lastLogin.toDate() : new Date(a.lastLogin)
          const bT = b.lastLogin?.toDate ? b.lastLogin.toDate() : new Date(b.lastLogin)
          return bT - aT
        })
        .slice(0, 10)

      setStats({
        totalUsers: allUsers.length,
        roleCounts,
        totalProperties,
        totalUnits,
        occupancyRate,
        recentSignups,
        recentLogins,
        signupChart,
        activeThisWeek,
      })
    } catch (err) {
      logError('[AdminDashboard] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  function formatTimestamp(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const ROLE_COLORS = {
    admin: 'destructive',
    owner: 'default',
    property_manager: 'secondary',
    staff: 'secondary',
    vendor: 'outline',
    tenant: 'outline',
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('nav.admin')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.subtitle')}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('admin.totalUsers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? '—' : stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.registeredUsers')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('admin.totalProperties')}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? '—' : stats.totalProperties}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.acrossPlatform')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('admin.totalUnits')}</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? '—' : stats.totalUnits}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.occupancyRate}% {t('admin.occupancy')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('admin.activeThisWeek')}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? '—' : stats.activeThisWeek}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.loggedInLast7')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Role Breakdown */}
        {!loading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('admin.usersByRole')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.roleCounts).map(([role, count]) => (
                  <div key={role} className="flex items-center gap-2 px-3 py-2 rounded-lg border">
                    <Badge variant={ROLE_COLORS[role] || 'secondary'}>{t(`role.${role}`)}</Badge>
                    <span className="text-lg font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signup Chart */}
        {!loading && stats.signupChart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('admin.signupsOverTime')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.signupChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="week" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} className="text-xs" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="signups"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent signups + Recent logins */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent Signups */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> {t('admin.recentSignups')}
                </CardTitle>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {t('dashboard.viewAll')} <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t('common.loading')}</p>
              ) : stats.recentSignups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t('admin.noUsers')}</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentSignups.map(u => (
                    <div key={u.id} className="flex items-center justify-between py-1 hover:bg-muted/50 rounded px-2 -mx-2 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.displayName || u.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={ROLE_COLORS[u.role] || 'secondary'} className="text-[10px]">
                          {t(`role.${u.role || 'owner'}`)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(u.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Logins */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" /> {t('admin.recentLogins')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t('common.loading')}</p>
              ) : stats.recentLogins.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t('admin.noLogins')}</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentLogins.map(u => (
                    <div key={u.id} className="flex items-center justify-between py-1 hover:bg-muted/50 rounded px-2 -mx-2 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.displayName || u.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {formatTimestamp(u.lastLogin)}
                      </span>
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
