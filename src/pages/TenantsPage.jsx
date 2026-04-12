import { useState, useEffect, useCallback } from 'react'
import {
  collection, query, where, orderBy, onSnapshot, getDocs,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import { createInvitation, revokeInvitation, INVITE_STATUS } from '@/services/invitations'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreHorizontal, Users, XCircle } from 'lucide-react'

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

const STATUS_BADGE = {
  [INVITE_STATUS.PENDING]: { label: 'Pending', variant: 'outline', className: 'border-amber-400 text-amber-600 bg-amber-50' },
  [INVITE_STATUS.ACCEPTED]: { label: 'Accepted', variant: 'outline', className: 'border-green-400 text-green-600 bg-green-50' },
  [INVITE_STATUS.DECLINED]: { label: 'Declined', variant: 'outline', className: 'border-red-400 text-red-600 bg-red-50' },
  [INVITE_STATUS.REVOKED]: { label: 'Revoked', variant: 'outline', className: 'border-gray-400 text-gray-500 bg-gray-50' },
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function TenantsPage() {
  const { currentUser, userProfile } = useAuth()
  const { t } = useLocale()
  const { properties } = usePropertyAlerts()

  // ── Invitation list state ──────────────────────────────────────────────────
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // ── Invite dialog state ────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [units, setUnits] = useState([])
  const [unitsLoading, setUnitsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // ── Real-time listener for tenant invitations ──────────────────────────────
  useEffect(() => {
    if (!currentUser) return

    const q = query(
      collection(db, 'invitations'),
      where('role', '==', 'tenant'),
      where('inviterUid', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setInvitations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        logError('[Tenants] Snapshot error:', err)
        setLoading(false)
      },
    )

    return unsub
  }, [currentUser])

  // ── Load units when property changes in invite dialog ──────────────────────
  const loadUnits = useCallback(async (propertyId) => {
    if (!propertyId || !currentUser) {
      setUnits([])
      return
    }
    setUnitsLoading(true)
    try {
      const unitsSnap = await getDocs(
        query(
          collection(db, `users/${currentUser.uid}/properties/${propertyId}/units`),
          orderBy('unitNumber'),
        ),
      )
      setUnits(unitsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      logError('[Tenants] Load units error:', err)
      setUnits([])
    } finally {
      setUnitsLoading(false)
    }
  }, [currentUser])

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = invitations.filter((inv) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (inv.inviteeEmail && inv.inviteeEmail.toLowerCase().includes(q)) ||
      (inv.inviteeName && inv.inviteeName.toLowerCase().includes(q)) ||
      (inv.propertyName && inv.propertyName.toLowerCase().includes(q))
    )
  })

  // ── Dialog helpers ─────────────────────────────────────────────────────────
  function openInviteDialog() {
    setInviteEmail('')
    setSelectedPropertyId('')
    setSelectedUnitId('')
    setUnits([])
    setFormError('')
    setDialogOpen(true)
  }

  function handlePropertyChange(propertyId) {
    setSelectedPropertyId(propertyId)
    setSelectedUnitId('')
    loadUnits(propertyId)
  }

  async function handleInvite(e) {
    e.preventDefault()
    setFormError('')

    const email = inviteEmail.trim()
    if (!email) {
      setFormError(t('tenants.emailRequired') || 'Email is required')
      return
    }
    if (!selectedPropertyId) {
      setFormError(t('tenants.propertyRequired') || 'Please select a property')
      return
    }

    setSaving(true)
    try {
      await createInvitation({
        inviterUid: currentUser.uid,
        inviterName: currentUser.displayName || currentUser.email,
        inviteeEmail: email,
        propertyId: selectedPropertyId,
        propertyName: properties.find(p => p.id === selectedPropertyId)?.name || '',
        unitId: selectedUnitId || undefined,
        unitNumber: units.find(u => u.id === selectedUnitId)?.unitNumber || '',
        role: 'tenant',
        inviterRole: userProfile?.role || 'owner',
      })
      setDialogOpen(false)
    } catch (err) {
      if (err.message === 'DUPLICATE_INVITE') {
        setFormError(t('tenants.duplicateInvite') || 'A pending invitation already exists for this tenant at this property')
      } else {
        logError('[Tenants] Invite error:', err)
        setFormError(t('tenants.inviteError') || 'Failed to send invitation. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleRevoke(invitationId) {
    if (!window.confirm(t('tenants.revokeConfirm') || 'Revoke this invitation?')) return
    try {
      await revokeInvitation(invitationId)
    } catch (err) {
      logError('[Tenants] Revoke error:', err)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t('tenants.title') || 'Tenants'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('tenants.subtitle') || 'Manage tenant invitations and access'}
            </p>
          </div>
          <Button onClick={openInviteDialog}>
            <Plus className="w-4 h-4" /> {t('tenants.inviteTenant') || 'Invite Tenant'}
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('tenants.search') || 'Search by name, email, or property...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                {t('common.loading') || 'Loading...'}
              </p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h3 className="text-sm font-medium">
                  {search
                    ? (t('tenants.noResults') || 'No tenants match your search')
                    : (t('tenants.noTenants') || 'No tenants yet')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {search
                    ? (t('tenants.tryDifferentSearch') || 'Try a different search term')
                    : (t('tenants.inviteDesc') || 'Invite tenants to give them access to their property and unit information.')}
                </p>
                {!search && (
                  <Button onClick={openInviteDialog} size="sm" className="mt-4">
                    <Plus className="w-4 h-4" /> {t('tenants.inviteTenant') || 'Invite Tenant'}
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('tenants.tenant') || 'Tenant'}</TableHead>
                      <TableHead>{t('tenants.property') || 'Property'}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('tenants.unit') || 'Unit'}</TableHead>
                      <TableHead>{t('tenants.status') || 'Status'}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('tenants.invitedDate') || 'Invited'}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(inv => {
                      const badge = STATUS_BADGE[inv.status] || STATUS_BADGE[INVITE_STATUS.PENDING]
                      return (
                        <TableRow key={inv.id}>
                          <TableCell>
                            <div>
                              {inv.inviteeName && (
                                <p className="font-medium text-sm">{inv.inviteeName}</p>
                              )}
                              <p className={inv.inviteeName ? 'text-xs text-muted-foreground' : 'text-sm font-medium'}>
                                {inv.inviteeEmail}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{inv.propertyName || '—'}</span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-sm">{inv.unitNumber || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={badge.variant} className={badge.className}>
                              {t(`tenants.status_${inv.status}`) || badge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {formatDate(inv.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {inv.status === INVITE_STATUS.PENDING && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleRevoke(inv.id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <XCircle className="mr-2 h-3.5 w-3.5" />
                                    {t('tenants.revoke') || 'Revoke Invitation'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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

      {/* Invite Tenant Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('tenants.inviteTenant') || 'Invite Tenant'}</DialogTitle>
            <DialogDescription>
              {t('tenants.inviteDialogDesc') || 'Send an invitation to a tenant for a specific property and unit.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 mt-2">
            {/* Email */}
            <div className="space-y-2">
              <Label>{t('common.email') || 'Email'}</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => { setInviteEmail(e.target.value); setFormError('') }}
                placeholder={t('tenants.emailPlaceholder') || 'tenant@example.com'}
                required
              />
            </div>

            {/* Property */}
            <div className="space-y-2">
              <Label>{t('tenants.property') || 'Property'}</Label>
              <select
                value={selectedPropertyId}
                onChange={e => handlePropertyChange(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">{t('tenants.selectProperty') || 'Select a property...'}</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div className="space-y-2">
              <Label>{t('tenants.unit') || 'Unit'}</Label>
              <select
                value={selectedUnitId}
                onChange={e => setSelectedUnitId(e.target.value)}
                className={SELECT_CLASS}
                disabled={!selectedPropertyId || unitsLoading}
              >
                <option value="">
                  {unitsLoading
                    ? (t('common.loading') || 'Loading...')
                    : !selectedPropertyId
                      ? (t('tenants.selectPropertyFirst') || 'Select a property first')
                      : units.length === 0
                        ? (t('tenants.noUnits') || 'No units available')
                        : (t('tenants.selectUnit') || 'Select a unit (optional)')}
                </option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.unitNumber}</option>
                ))}
              </select>
            </div>

            {/* Error */}
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? (t('common.sending') || 'Sending...')
                  : (t('tenants.sendInvite') || 'Send Invitation')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
