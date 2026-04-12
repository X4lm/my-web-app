import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, orderBy, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { lookupPropertyOwner } from '@/services/propertyIndex'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import AppLayout from '@/components/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Home, DollarSign, Calendar, Wrench, Megaphone, Zap,
  Loader2, Send, CheckCircle2,
} from 'lucide-react'

export default function TenantDashboard() {
  const { currentUser, userProfile } = useAuth()
  const { t, formatCurrency, formatDate } = useLocale()
  const [loading, setLoading] = useState(true)
  const [unit, setUnit] = useState(null)
  const [property, setProperty] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [utilities, setUtilities] = useState([])

  // Maintenance request
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [reqTitle, setReqTitle] = useState('')
  const [reqDesc, setReqDesc] = useState('')
  const [reqSending, setReqSending] = useState(false)
  const [reqSent, setReqSent] = useState(false)

  const linkedPropertyId = userProfile?.linkedProperties?.[0]
  const linkedUnitId = userProfile?.linkedUnitId

  useEffect(() => {
    if (!linkedPropertyId) { setLoading(false); return }
    loadTenantData()
  }, [linkedPropertyId, linkedUnitId])

  async function loadTenantData() {
    try {
      let ownerUid = null
      let propertyData = null
      let unitData = null

      const ownerInfo = await lookupPropertyOwner(linkedPropertyId)
      if (ownerInfo) {
        ownerUid = ownerInfo.ownerUid
        const propRef = doc(db, 'users', ownerUid, 'properties', linkedPropertyId)
        const propSnap = await getDoc(propRef)
        if (propSnap.exists()) {
          propertyData = { id: propSnap.id, ...propSnap.data() }
        }
      }

      if (!ownerUid || !propertyData) { setLoading(false); return }
      setProperty(propertyData)

      // Load unit data
      if (linkedUnitId) {
        try {
          const unitRef = doc(db, 'users', ownerUid, 'properties', linkedPropertyId, 'units', linkedUnitId)
          const unitSnap = await getDoc(unitRef)
          if (unitSnap.exists()) {
            unitData = { id: unitSnap.id, ...unitSnap.data() }
            setUnit(unitData)
          }
        } catch { /* skip */ }
      }

      // Load announcements
      try {
        const annSnap = await getDocs(
          query(
            collection(db, 'users', ownerUid, 'properties', linkedPropertyId, 'announcements'),
            orderBy('createdAt', 'desc')
          )
        )
        setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 5))
      } catch { /* skip */ }

      // Load utility accounts for this unit
      if (linkedUnitId) {
        try {
          const utilSnap = await getDocs(
            collection(db, 'users', ownerUid, 'properties', linkedPropertyId, 'utilities')
          )
          const unitUtils = utilSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(u => u.unitNumber === unitData?.unitNumber)
          setUtilities(unitUtils)
        } catch { /* skip */ }
      }
    } catch (err) {
      logError('[TenantDashboard] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitRequest(e) {
    e.preventDefault()
    if (!reqTitle.trim()) return
    setReqSending(true)
    try {
      const ownerInfo = await lookupPropertyOwner(linkedPropertyId)
      if (ownerInfo) {
        await addDoc(
          collection(db, 'users', ownerInfo.ownerUid, 'properties', linkedPropertyId, 'workOrders'),
          {
            title: reqTitle,
            description: reqDesc,
            unitNumber: unit?.unitNumber || '',
            status: 'open',
            priority: 'medium',
            reportedBy: currentUser.displayName || currentUser.email,
            createdAt: serverTimestamp(),
          }
        )
      }
      setReqSent(true)
      setReqTitle('')
      setReqDesc('')
      setTimeout(() => { setReqSent(false); setShowRequestForm(false) }, 2000)
    } catch (err) {
      logError('[TenantDashboard] Submit error:', err)
    } finally {
      setReqSending(false)
    }
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

  if (!property) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <Home className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <h2 className="text-lg font-semibold">{t('tenant.noProperty')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('tenant.noPropertyDesc')}</p>
        </div>
      </AppLayout>
    )
  }

  const PAYMENT_VARIANT = { paid: 'success', pending: 'warning', overdue: 'destructive' }

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

        {/* Unit Info Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {unit && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('tenant.myUnit')}</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{unit.unitNumber}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('units.floor')}: {unit.floor} · {property.name}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('property.monthlyRent')}</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{formatCurrency(unit.monthlyRent)}</div>
                  <Badge variant={PAYMENT_VARIANT[unit.paymentStatus] || 'secondary'} className="mt-1 text-[10px]">
                    {unit.paymentStatus || 'pending'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('tenant.leaseStart')}</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">{unit.leaseStart ? formatDate(unit.leaseStart) : '—'}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('tenant.leaseEnd')}</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-lg font-semibold ${unit.leaseEnd && new Date(unit.leaseEnd) < new Date() ? 'text-destructive' : ''}`}>
                    {unit.leaseEnd ? formatDate(unit.leaseEnd) : '—'}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Maintenance Request */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="w-4 h-4" /> {t('tenant.maintenanceRequest')}
              </CardTitle>
              {!showRequestForm && (
                <Button size="sm" onClick={() => setShowRequestForm(true)}>
                  <Send className="w-4 h-4" /> {t('tenant.submitRequest')}
                </Button>
              )}
            </div>
          </CardHeader>
          {showRequestForm && (
            <CardContent>
              {reqSent ? (
                <div className="p-4 rounded-md bg-emerald-500/10 text-emerald-600 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {t('tenant.requestSent')}
                </div>
              ) : (
                <form onSubmit={handleSubmitRequest} className="space-y-3">
                  <div className="space-y-2">
                    <Label>{t('tenant.issueTitle')}</Label>
                    <Input
                      value={reqTitle}
                      onChange={e => setReqTitle(e.target.value)}
                      placeholder={t('tenant.issueTitlePlaceholder')}
                      required
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('tenant.issueDescription')}</Label>
                    <textarea
                      value={reqDesc}
                      onChange={e => setReqDesc(e.target.value)}
                      placeholder={t('tenant.issueDescPlaceholder')}
                      rows={3}
                      maxLength={2000}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowRequestForm(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={reqSending}>
                      {reqSending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving')}</>
                      ) : (
                        <><Send className="w-4 h-4" /> {t('tenant.submitRequest')}</>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Announcements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> {t('property.announcements')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t('tenant.noAnnouncements')}</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map(a => (
                    <div key={a.id} className="py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{a.title}</p>
                        {a.pinned && <Badge variant="secondary" className="text-[9px]">{t('announce.pinned')}</Badge>}
                        <Badge
                          variant={a.priority === 'urgent' ? 'destructive' : a.priority === 'notice' ? 'warning' : 'secondary'}
                          className="text-[9px]"
                        >
                          {a.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{a.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Utility Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4" /> {t('property.utilities')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {utilities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t('tenant.noUtilities')}</p>
              ) : (
                <div className="space-y-3">
                  {utilities.map(u => (
                    <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{u.utilityType}</p>
                        <p className="text-xs text-muted-foreground">{t('utilities.accountNumber')}: {u.accountNumber || '—'}</p>
                      </div>
                      <Badge variant={u.status === 'active' ? 'success' : 'destructive'} className="text-[10px]">
                        {u.status}
                      </Badge>
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
