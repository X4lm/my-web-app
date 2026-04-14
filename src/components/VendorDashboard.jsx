import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, orderBy, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { lookupPropertyOwner } from '@/services/propertyIndex'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import AppLayout from '@/components/AppLayout'
import PlatformAnnouncement from '@/components/PlatformAnnouncement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Wrench, ClipboardList, Clock, CheckCircle2, AlertTriangle,
  Loader2, Building2, ChevronDown,
} from 'lucide-react'

const STATUS_OPTIONS = ['open', 'in_progress', 'on_hold', 'completed', 'cancelled']
const STATUS_VARIANT = {
  open: 'secondary',
  in_progress: 'warning',
  on_hold: 'outline',
  completed: 'success',
  cancelled: 'destructive',
}
const PRIORITY_VARIANT = {
  low: 'secondary',
  medium: 'warning',
  high: 'destructive',
  urgent: 'destructive',
}

export default function VendorDashboard() {
  const { currentUser, userProfile } = useAuth()
  const { t, formatDate } = useLocale()
  const [loading, setLoading] = useState(true)
  const [workOrders, setWorkOrders] = useState([])
  const [propertyMap, setPropertyMap] = useState({})
  const [updatingId, setUpdatingId] = useState(null)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [filter, setFilter] = useState('active') // 'active' | 'all' | 'completed'

  const linkedPropertyIds = userProfile?.linkedProperties || []

  useEffect(() => {
    if (linkedPropertyIds.length === 0) { setLoading(false); return }
    loadVendorWorkOrders()
  }, [linkedPropertyIds.length])

  async function loadVendorWorkOrders() {
    try {
      const allOrders = []
      const propMap = {}

      for (const propId of linkedPropertyIds) {
        try {
          const ownerInfo = await lookupPropertyOwner(propId)
          if (!ownerInfo) continue

          const propRef = doc(db, 'users', ownerInfo.ownerUid, 'properties', propId)
          const propSnap = await getDoc(propRef)
          if (!propSnap.exists()) continue

          propMap[propId] = { name: propSnap.data().name, ownerUid: ownerInfo.ownerUid }

          const woSnap = await getDocs(
            query(
              collection(db, 'users', ownerInfo.ownerUid, 'properties', propId, 'workOrders'),
              orderBy('createdAt', 'desc')
            )
          )
          woSnap.docs.forEach(d => {
            const data = d.data()
            if (data.assignedVendorUid === currentUser.uid) {
              allOrders.push({
                id: d.id,
                propertyId: propId,
                ownerUid: ownerInfo.ownerUid,
                ...data,
              })
            }
          })
        } catch { /* skip */ }
      }

      setPropertyMap(propMap)
      setWorkOrders(allOrders)
    } catch (err) {
      logError('[VendorDashboard] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(wo, newStatus) {
    setUpdatingId(wo.id)
    setOpenDropdown(null)
    try {
      const woRef = doc(db, 'users', wo.ownerUid, 'properties', wo.propertyId, 'workOrders', wo.id)
      await updateDoc(woRef, { status: newStatus, updatedAt: serverTimestamp() })
      setWorkOrders(prev =>
        prev.map(o => o.id === wo.id ? { ...o, status: newStatus } : o)
      )
    } catch (err) {
      logError('[VendorDashboard] Status update error:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  // Filter work orders
  const filtered = workOrders.filter(wo => {
    if (filter === 'active') return !['completed', 'cancelled'].includes(wo.status)
    if (filter === 'completed') return wo.status === 'completed'
    return true
  })

  // Stats
  const totalAssigned = workOrders.length
  const openCount = workOrders.filter(wo => wo.status === 'open').length
  const inProgressCount = workOrders.filter(wo => wo.status === 'in_progress').length
  const completedCount = workOrders.filter(wo => wo.status === 'completed').length

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

  if (linkedPropertyIds.length === 0) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <Wrench className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <h2 className="text-lg font-semibold">{t('vendor.noProperties')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('vendor.noPropertiesDesc')}</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('dashboard.welcomeBack')}, {currentUser?.displayName || 'there'}.
          </p>
        </div>

        <PlatformAnnouncement />

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('vendor.totalAssigned')}</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{totalAssigned}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('vendor.workOrders')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('vendor.open')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{openCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('vendor.needsAttention')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('vendor.inProgress')}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{inProgressCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('vendor.currentlyWorking')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('vendor.completed')}</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{completedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('vendor.finishedJobs')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Work Orders List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="w-4 h-4" /> {t('vendor.myWorkOrders')}
              </CardTitle>
              <div className="flex gap-1">
                {['active', 'completed', 'all'].map(f => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? 'default' : 'outline'}
                    onClick={() => setFilter(f)}
                    className="text-xs"
                  >
                    {t(`vendor.filter_${f}`)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">{t('vendor.noWorkOrders')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(wo => (
                  <div
                    key={wo.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{wo.title}</p>
                        {wo.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{wo.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={PRIORITY_VARIANT[wo.priority] || 'secondary'} className="text-[10px]">
                          {wo.priority}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {propertyMap[wo.propertyId]?.name || wo.propertyId}
                        </span>
                        {wo.unitNumber && (
                          <span>{t('vendor.unit')}: {wo.unitNumber}</span>
                        )}
                        {wo.dueDate && (
                          <span>{t('vendor.due')}: {formatDate(wo.dueDate)}</span>
                        )}
                      </div>

                      {/* Status dropdown */}
                      <div className="relative">
                        {updatingId === wo.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setOpenDropdown(openDropdown === wo.id ? null : wo.id)}
                            >
                              <Badge variant={STATUS_VARIANT[wo.status] || 'secondary'} className="text-[10px]">
                                {wo.status?.replace('_', ' ')}
                              </Badge>
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                            {openDropdown === wo.id && (
                              <div className="absolute end-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-lg py-1 min-w-[140px]">
                                {STATUS_OPTIONS.map(s => (
                                  <button
                                    key={s}
                                    className="w-full text-start px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2"
                                    onClick={() => handleStatusChange(wo, s)}
                                  >
                                    <Badge variant={STATUS_VARIANT[s] || 'secondary'} className="text-[9px]">
                                      {s.replace('_', ' ')}
                                    </Badge>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
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
