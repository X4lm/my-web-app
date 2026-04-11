import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useLocale } from '@/contexts/LocaleContext'
import AppLayout from '@/components/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingUp, Users, Building2, Activity, BarChart3, Eye } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const CHART_STYLE = {
  backgroundColor: 'hsl(var(--background))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS_LABELS = ['12a', '2a', '4a', '6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p']

export default function AdminAnalyticsPage() {
  const { t } = useLocale()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    userGrowth: [],
    activeUsers: [],
    propertyGrowth: [],
    loginHeatmap: [],
    topUsers: [],
    pageViews: [],
  })

  useEffect(() => {
    loadAnalytics()
  }, [])

  async function loadAnalytics() {
    try {
      // 1. Fetch all users
      const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // 2. Fetch analytics events (page views)
      let analyticsEvents = []
      try {
        const analyticsSnap = await getDocs(query(collection(db, 'analytics'), orderBy('timestamp', 'desc')))
        analyticsEvents = analyticsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      } catch { /* collection may not exist yet */ }

      // 3. Fetch login events
      let loginEvents = []
      try {
        const loginSnap = await getDocs(query(collection(db, 'loginEvents'), orderBy('timestamp', 'desc')))
        loginEvents = loginSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      } catch { /* collection may not exist yet */ }

      const now = new Date()

      // ─── User Growth (cumulative, last 12 months) ─────────────────────
      const userGrowth = []
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        const count = allUsers.filter(u => {
          const d = u.createdAt?.toDate ? u.createdAt.toDate() : (u.createdAt ? new Date(u.createdAt) : null)
          return d && d <= new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        }).length
        userGrowth.push({ month: label, users: count })
      }

      // ─── Active Users (daily, last 30 days) ───────────────────────────
      const activeUsers = []
      for (let i = 29; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dayStr = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

        // Count unique users who logged in on this day
        const uniqueUsers = new Set()
        loginEvents.forEach(ev => {
          const ts = ev.timestamp?.toDate ? ev.timestamp.toDate() : (ev.timestamp ? new Date(ev.timestamp) : null)
          if (ts && ts >= dayStart && ts < dayEnd) uniqueUsers.add(ev.userId)
        })
        // Also check lastLogin from users
        if (uniqueUsers.size === 0) {
          allUsers.forEach(u => {
            const ll = u.lastLogin?.toDate ? u.lastLogin.toDate() : (u.lastLogin ? new Date(u.lastLogin) : null)
            if (ll && ll >= dayStart && ll < dayEnd) uniqueUsers.add(u.id)
          })
        }
        activeUsers.push({ day: dayStr, active: uniqueUsers.size })
      }

      // ─── Property Growth (cumulative, last 12 months) ─────────────────
      // Count properties per owner
      let allProperties = []
      const owners = allUsers.filter(u => u.role === 'owner' || u.role === 'admin')
      for (const owner of owners) {
        try {
          const propsSnap = await getDocs(collection(db, 'users', owner.id, 'properties'))
          propsSnap.docs.forEach(d => {
            const pData = d.data()
            allProperties.push({
              id: d.id,
              createdAt: pData.createdAt,
            })
          })
        } catch { /* skip */ }
      }

      const propertyGrowth = []
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        const count = allProperties.filter(p => {
          const d = p.createdAt?.toDate ? p.createdAt.toDate() : (p.createdAt ? new Date(p.createdAt) : null)
          return d && d <= new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        }).length
        propertyGrowth.push({ month: label, properties: count })
      }

      // ─── Login Heatmap (day of week × hour buckets) ────────────────────
      const heatGrid = Array.from({ length: 7 }, () => Array(12).fill(0))
      const heatSources = loginEvents.length > 0 ? loginEvents : allUsers.map(u => ({ timestamp: u.lastLogin }))
      heatSources.forEach(ev => {
        const ts = ev.timestamp?.toDate ? ev.timestamp.toDate() : (ev.timestamp ? new Date(ev.timestamp) : null)
        if (!ts) return
        const dayIdx = ts.getDay()
        const hourBucket = Math.floor(ts.getHours() / 2)
        heatGrid[dayIdx][hourBucket]++
      })
      const maxHeat = Math.max(1, ...heatGrid.flat())
      const loginHeatmap = []
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 12; h++) {
          loginHeatmap.push({ day: DAYS[d], hour: HOURS_LABELS[h], count: heatGrid[d][h], intensity: heatGrid[d][h] / maxHeat })
        }
      }

      // ─── Top Active Users ──────────────────────────────────────────────
      const userActivity = {}
      analyticsEvents.forEach(ev => {
        if (ev.userId) userActivity[ev.userId] = (userActivity[ev.userId] || 0) + 1
      })
      // Fallback: if no analytics events, use login-based ranking
      if (Object.keys(userActivity).length === 0) {
        loginEvents.forEach(ev => {
          if (ev.userId) userActivity[ev.userId] = (userActivity[ev.userId] || 0) + 1
        })
      }
      const topUsers = Object.entries(userActivity)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([uid, count]) => {
          const user = allUsers.find(u => u.id === uid)
          return {
            id: uid,
            name: user?.displayName || user?.email || uid,
            email: user?.email || '',
            role: user?.role || 'owner',
            actions: count,
          }
        })

      // ─── Page Views (top pages) ────────────────────────────────────────
      const pageCounts = {}
      analyticsEvents.forEach(ev => {
        const page = ev.page || 'unknown'
        const label = page.replace(/^\//, '').split('/')[0] || 'home'
        pageCounts[label] = (pageCounts[label] || 0) + 1
      })
      const pageViews = Object.entries(pageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page, views]) => ({ page, views }))

      setData({ userGrowth, activeUsers, propertyGrowth, loginHeatmap, topUsers, pageViews })
    } catch (err) {
      console.error('[AdminAnalytics] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const ROLE_VARIANT = {
    admin: 'destructive', owner: 'default', property_manager: 'secondary',
    staff: 'secondary', vendor: 'outline', tenant: 'outline',
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('admin.analyticsTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.analyticsSubtitle')}</p>
        </div>

        {/* User Growth + Property Growth */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> {t('admin.userGrowth')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={CHART_STYLE} />
                    <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" /> {t('admin.propertyGrowth')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.propertyGrowth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={CHART_STYLE} />
                    <Area type="monotone" dataKey="properties" stroke="hsl(var(--chart-2, 142 71% 45%))" fill="hsl(var(--chart-2, 142 71% 45%))" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" /> {t('admin.activeUsersChart')} — 30 {t('admin.days')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.activeUsers}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={2} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Bar dataKey="active" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Login Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> {t('admin.loginActivity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Hour labels */}
                <div className="flex ms-12 mb-1">
                  {HOURS_LABELS.map(h => (
                    <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">{h}</div>
                  ))}
                </div>
                {/* Grid rows */}
                {DAYS.map((day, dayIdx) => (
                  <div key={day} className="flex items-center gap-1 mb-1">
                    <span className="w-10 text-end text-[10px] text-muted-foreground shrink-0">{day}</span>
                    <div className="flex flex-1 gap-0.5">
                      {HOURS_LABELS.map((_, hourIdx) => {
                        const cell = data.loginHeatmap.find(c => c.day === day && c.hour === HOURS_LABELS[hourIdx])
                        const intensity = cell?.intensity || 0
                        return (
                          <div
                            key={hourIdx}
                            className="flex-1 aspect-square rounded-sm border border-transparent transition-colors"
                            style={{
                              backgroundColor: intensity > 0
                                ? `hsl(var(--primary) / ${0.1 + intensity * 0.8})`
                                : 'hsl(var(--muted))',
                            }}
                            title={`${day} ${HOURS_LABELS[hourIdx]}: ${cell?.count || 0} logins`}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Users + Page Views */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top Active Users */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" /> {t('admin.topActiveUsers')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t('admin.noUsers')}</p>
              ) : (
                <div className="space-y-2">
                  {data.topUsers.map((u, i) => (
                    <div key={u.id} className="flex items-center justify-between py-1.5 hover:bg-muted/50 rounded px-2 -mx-2 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-5 text-end shrink-0">#{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={ROLE_VARIANT[u.role]} className="text-[9px]">{t(`role.${u.role}`)}</Badge>
                        <span className="text-xs font-semibold">{u.actions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Page Views */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" /> {t('admin.pageViews')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.pageViews.length === 0 ? (
                <div className="text-center py-8">
                  <Eye className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('admin.noPageViews')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('admin.pageViewsDesc')}</p>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.pageViews} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="page" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip contentStyle={CHART_STYLE} />
                      <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
