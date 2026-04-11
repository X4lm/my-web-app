import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, collection, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useLocale } from '@/contexts/LocaleContext'
import { getAllInvitations, revokeInvitation, INVITE_STATUS } from '@/services/invitations'
import AppLayout from '@/components/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Megaphone, Globe, Mail, Loader2, Save, XCircle, Clock, CheckCircle2, Trash2 } from 'lucide-react'

const CURRENCIES = ['AED', 'USD', 'EUR', 'GBP', 'SAR', 'KWD', 'BHD', 'QAR', 'OMR', 'EGP', 'INR']
const DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']

const STATUS_ICON = { pending: Clock, accepted: CheckCircle2, declined: XCircle, revoked: XCircle }
const STATUS_VARIANT = { pending: 'secondary', accepted: 'success', declined: 'destructive', revoked: 'outline' }

export default function AdminSettingsPage() {
  const { t } = useLocale()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Platform settings
  const [announcement, setAnnouncement] = useState('')
  const [announcementActive, setAnnouncementActive] = useState(false)
  const [defaultCurrency, setDefaultCurrency] = useState('AED')
  const [defaultDateFormat, setDefaultDateFormat] = useState('DD/MM/YYYY')

  // Invitations
  const [invitations, setInvitations] = useState([])
  const [invitationsLoading, setInvitationsLoading] = useState(true)

  useEffect(() => {
    loadSettings()
    loadInvitations()
  }, [])

  async function loadSettings() {
    try {
      const snap = await getDoc(doc(db, 'platformSettings', 'general'))
      if (snap.exists()) {
        const data = snap.data()
        setAnnouncement(data.announcement || '')
        setAnnouncementActive(data.announcementActive || false)
        setDefaultCurrency(data.defaultCurrency || 'AED')
        setDefaultDateFormat(data.defaultDateFormat || 'DD/MM/YYYY')
      }
    } catch (err) {
      console.error('[AdminSettings] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadInvitations() {
    setInvitationsLoading(true)
    try {
      const invs = await getAllInvitations()
      setInvitations(invs)
    } catch (err) {
      console.error('[AdminSettings] Invitations load error:', err)
    } finally {
      setInvitationsLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await setDoc(doc(db, 'platformSettings', 'general'), {
        announcement,
        announcementActive,
        defaultCurrency,
        defaultDateFormat,
        updatedAt: serverTimestamp(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('[AdminSettings] Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleRevokeInvitation(invId) {
    if (!window.confirm(t('team.removeConfirm'))) return
    try {
      await revokeInvitation(invId)
      setInvitations(prev => prev.map(inv =>
        inv.id === invId ? { ...inv, status: INVITE_STATUS.REVOKED } : inv
      ))
    } catch (err) {
      console.error('[AdminSettings] Revoke error:', err)
    }
  }

  function formatTimestamp(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const pendingInvitations = invitations.filter(i => i.status === INVITE_STATUS.PENDING)

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('admin.systemTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.systemSubtitle')}</p>
        </div>

        {/* Platform Announcement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> {t('admin.platformAnnouncement')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <textarea
                value={announcement}
                onChange={e => setAnnouncement(e.target.value)}
                placeholder={t('admin.announcementPlaceholder')}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={announcementActive}
                onChange={e => setAnnouncementActive(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm">{t('admin.announcementActive')}</span>
            </label>
            {announcementActive && announcement && (
              <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm">
                <span className="font-medium">Preview: </span>{announcement}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Default Currency & Date Format */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" /> {t('settings.currencyLocale')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('admin.defaultCurrency')}</Label>
                <select
                  value={defaultCurrency}
                  onChange={e => setDefaultCurrency(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('admin.defaultDateFormat')}</Label>
                <select
                  value={defaultDateFormat}
                  onChange={e => setDefaultDateFormat(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {DATE_FORMATS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving')}</>
            ) : (
              <><Save className="w-4 h-4" /> {t('common.saveChanges')}</>
            )}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {t('common.saved')}
            </span>
          )}
        </div>

        <Separator />

        {/* Pending Invitations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4" /> {t('admin.pendingInvitations')}
              </CardTitle>
              {pendingInvitations.length > 0 && (
                <Badge variant="secondary">{pendingInvitations.length} {t('team.pending').toLowerCase()}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {invitationsLoading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
              </div>
            ) : invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('team.noMembers')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.email')}</TableHead>
                      <TableHead>{t('properties.property')}</TableHead>
                      <TableHead>{t('team.role')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('team.invitedBy')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('common.date')}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map(inv => {
                      const StatusIcon = STATUS_ICON[inv.status] || Clock
                      return (
                        <TableRow key={inv.id} className={inv.status === INVITE_STATUS.REVOKED ? 'opacity-50' : ''}>
                          <TableCell className="text-sm font-medium">{inv.inviteeEmail}</TableCell>
                          <TableCell className="text-sm">
                            {inv.propertyName || inv.propertyId}
                            {inv.unitNumber && <span className="text-muted-foreground"> · Unit {inv.unitNumber}</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">{t(`role.${inv.role}`)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[inv.status]} className="text-[10px] flex items-center gap-1 w-fit">
                              <StatusIcon className="w-3 h-3" />
                              {t(`team.${inv.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {inv.inviterName || '—'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {formatTimestamp(inv.createdAt)}
                          </TableCell>
                          <TableCell>
                            {inv.status === INVITE_STATUS.PENDING && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleRevokeInvitation(inv.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
