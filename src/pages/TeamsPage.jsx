import { useState, useEffect, useMemo } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import { getInvitableRoles } from '@/utils/permissions'
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
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Wrench,
  Phone, Mail, Star, Users, ShieldCheck, UserCog, XCircle,
} from 'lucide-react'

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

// ─── Vendor directory constants (same as old VendorsPage) ────────────────────

const CATEGORY_KEYS = {
  plumbing: 'vendors.catPlumbing',
  electrical: 'vendors.catElectrical',
  hvac: 'vendors.catHvac',
  cleaning: 'vendors.catCleaning',
  painting: 'vendors.catPainting',
  carpentry: 'vendors.catCarpentry',
  pest_control: 'vendors.catPestControl',
  landscaping: 'vendors.catLandscaping',
  security: 'vendors.catSecurity',
  general: 'vendors.catGeneralMaintenance',
  other: 'vendors.catOther',
}

const EMPTY_VENDOR = {
  name: '', phone: '', email: '', category: 'general',
  tradeLicense: '', rating: '', notes: '', active: true,
}

// ─── Tab config ──────────────────────────────────────────────────────────────

const TABS = [
  { key: 'property_manager', label: 'team.tabPropertyManagers', icon: ShieldCheck },
  { key: 'staff', label: 'team.tabStaff', icon: UserCog },
  { key: 'vendor', label: 'team.tabVendors', icon: Wrench },
]

// ─── Status badge variant mapping ────────────────────────────────────────────

function statusVariant(status) {
  switch (status) {
    case 'accepted': return 'default'
    case 'pending': return 'secondary'
    case 'declined': return 'destructive'
    case 'revoked': return 'outline'
    default: return 'secondary'
  }
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════════════

export default function TeamsPage() {
  const { currentUser, userProfile } = useAuth()
  const { t } = useLocale()
  const { properties } = usePropertyAlerts()

  // ─── State: active tab ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('property_manager')
  const [search, setSearch] = useState('')

  // ─── State: invitations (for PM, Staff, Vendor tabs) ────────────────────────
  const [invitations, setInvitations] = useState([])
  const [invLoading, setInvLoading] = useState(true)

  // ─── State: vendor directory (old VendorsPage data) ─────────────────────────
  const [vendors, setVendors] = useState([])
  const [vendorsLoading, setVendorsLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [vendorForm, setVendorForm] = useState(EMPTY_VENDOR)
  const [vendorErrors, setVendorErrors] = useState({})
  const [vendorSaving, setVendorSaving] = useState(false)

  // ─── State: invite dialog ──────────────────────────────────────────────────
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePropertyId, setInvitePropertyId] = useState('')
  const [inviteSaving, setInviteSaving] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const invitableRoles = useMemo(
    () => getInvitableRoles(userProfile?.role),
    [userProfile?.role],
  )
  const canInviteForTab = invitableRoles.includes(activeTab)

  const vendorColPath = `users/${currentUser.uid}/vendors`

  // ─── Effect: listen to invitations for the active role ──────────────────────
  useEffect(() => {
    if (!currentUser) return

    setInvLoading(true)
    const q = query(
      collection(db, 'invitations'),
      where('inviterUid', '==', currentUser.uid),
      where('role', '==', activeTab),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setInvitations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setInvLoading(false)
      },
      (err) => {
        logError('[Teams] Invitation listener error:', err)
        setInvLoading(false)
      },
    )
    return unsub
  }, [currentUser, activeTab])

  // ─── Effect: listen to vendor directory ─────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return
    const q = query(collection(db, vendorColPath), orderBy('name'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setVendors(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setVendorsLoading(false)
      },
      (err) => {
        logError('[Teams] Vendors listener error:', err)
        setVendorsLoading(false)
      },
    )
    return unsub
  }, [vendorColPath, currentUser])

  // ─── Filtered invitations ──────────────────────────────────────────────────
  const filteredInvitations = useMemo(() => {
    if (!search) return invitations
    const s = search.toLowerCase()
    return invitations.filter(inv =>
      (inv.inviteeEmail || '').toLowerCase().includes(s) ||
      (inv.inviterName || '').toLowerCase().includes(s) ||
      (inv.propertyName || '').toLowerCase().includes(s),
    )
  }, [invitations, search])

  // ─── Filtered vendors ──────────────────────────────────────────────────────
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      if (search && !v.name.toLowerCase().includes(search.toLowerCase()) &&
          !(v.email || '').toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter !== 'all' && v.category !== categoryFilter) return false
      return true
    })
  }, [vendors, search, categoryFilter])

  // ─── Invite dialog handlers ────────────────────────────────────────────────

  function openInviteDialog() {
    setInviteEmail('')
    setInvitePropertyId(properties.length === 1 ? properties[0].id : '')
    setInviteError('')
    setInviteDialogOpen(true)
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      setInviteError(t('team.emailRequired'))
      return
    }
    if (!invitePropertyId) {
      setInviteError(t('team.propertyRequired'))
      return
    }

    setInviteSaving(true)
    setInviteError('')
    try {
      await createInvitation({
        inviterUid: currentUser.uid,
        inviterName: currentUser.displayName || currentUser.email,
        inviteeEmail: inviteEmail.trim(),
        propertyId: invitePropertyId,
        propertyName: properties.find(p => p.id === invitePropertyId)?.name || '',
        role: activeTab,
        inviterRole: userProfile?.role || 'owner',
      })
      setInviteDialogOpen(false)
    } catch (err) {
      if (err.message === 'DUPLICATE_INVITE') {
        setInviteError(t('team.duplicateInvite'))
      } else {
        logError('[Teams] Invite error:', err)
        setInviteError(err.message || t('team.inviteError'))
      }
    } finally {
      setInviteSaving(false)
    }
  }

  async function handleRevoke(invitationId) {
    if (!window.confirm(t('team.revokeConfirm'))) return
    try {
      await revokeInvitation(invitationId)
    } catch (err) {
      logError('[Teams] Revoke error:', err)
    }
  }

  // ─── Vendor directory CRUD handlers (same as old VendorsPage) ──────────────

  function openAddVendor() {
    setEditingVendor(null)
    setVendorForm(EMPTY_VENDOR)
    setVendorErrors({})
    setVendorDialogOpen(true)
  }

  function openEditVendor(v) {
    setEditingVendor(v)
    setVendorForm({ ...EMPTY_VENDOR, ...v })
    setVendorErrors({})
    setVendorDialogOpen(true)
  }

  function setVendorField(field, value) {
    setVendorForm(f => ({ ...f, [field]: value }))
    if (vendorErrors[field]) setVendorErrors(e => ({ ...e, [field]: null }))
  }

  async function handleVendorSave(e) {
    e.preventDefault()
    const errs = {}
    if (!vendorForm.name.trim()) errs.name = 'Required'
    if (!vendorForm.phone.trim()) errs.phone = 'Required'
    if (Object.keys(errs).length) return setVendorErrors(errs)

    setVendorSaving(true)
    try {
      const data = { ...vendorForm, rating: vendorForm.rating ? Number(vendorForm.rating) : '' }
      if (editingVendor) {
        await updateDoc(doc(db, vendorColPath, editingVendor.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, vendorColPath), { ...data, createdAt: serverTimestamp() })
      }
      setVendorDialogOpen(false)
      setEditingVendor(null)
    } catch (err) {
      logError('[Teams] Vendor save error:', err)
    } finally {
      setVendorSaving(false)
    }
  }

  async function handleVendorDelete(id) {
    if (!window.confirm(t('vendors.deleteConfirm'))) return
    try {
      await deleteDoc(doc(db, vendorColPath, id))
    } catch (err) {
      logError('[Teams] Vendor delete error:', err)
    }
  }

  // ─── Tab change clears search ──────────────────────────────────────────────

  function switchTab(key) {
    setActiveTab(key)
    setSearch('')
    setCategoryFilter('all')
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('team.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('team.subtitle')}</p>
          </div>
          {activeTab === 'vendor' ? (
            <div className="flex gap-2">
              <Button onClick={openAddVendor}>
                <Plus className="w-4 h-4" /> {t('vendors.addVendor')}
              </Button>
              {canInviteForTab && (
                <Button variant="outline" onClick={openInviteDialog}>
                  <Mail className="w-4 h-4" /> {t('team.inviteVendor')}
                </Button>
              )}
            </div>
          ) : canInviteForTab ? (
            <Button onClick={openInviteDialog}>
              <Plus className="w-4 h-4" /> {t('team.invite')}
            </Button>
          ) : null}
        </div>

        {/* Horizontal pill tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.label)}
              </button>
            )
          })}
        </div>

        {/* Search bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={activeTab === 'vendor' ? t('vendors.search') : t('team.searchPlaceholder')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {activeTab === 'vendor' && (
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">{t('vendors.allCategories')}</option>
                  {Object.entries(CATEGORY_KEYS).map(([val, key]) => (
                    <option key={val} value={val}>{t(key)}</option>
                  ))}
                </select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tab content */}
        {activeTab === 'vendor' ? (
          <VendorTabContent
            t={t}
            vendors={filteredVendors}
            vendorsLoading={vendorsLoading}
            invitations={filteredInvitations}
            invLoading={invLoading}
            openAddVendor={openAddVendor}
            openEditVendor={openEditVendor}
            handleVendorDelete={handleVendorDelete}
            handleRevoke={handleRevoke}
          />
        ) : (
          <InvitationTabContent
            t={t}
            invitations={filteredInvitations}
            loading={invLoading}
            activeTab={activeTab}
            canInvite={canInviteForTab}
            openInviteDialog={openInviteDialog}
            handleRevoke={handleRevoke}
          />
        )}
      </div>

      {/* ─── Invite Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={inviteDialogOpen} onOpenChange={(open) => { if (!inviteSaving) setInviteDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('team.inviteTitle')}</DialogTitle>
            <DialogDescription>{t('team.inviteDesc')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t('common.email')}</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder={t('team.emailPlaceholder')}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t('team.property')}</Label>
              <select
                value={invitePropertyId}
                onChange={e => setInvitePropertyId(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">{t('team.selectProperty')}</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('team.role')}</Label>
              <Input value={t(`team.role_${activeTab}`)} disabled className="bg-muted" />
            </div>
            {inviteError && (
              <p className="text-sm text-destructive">{inviteError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={inviteSaving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={inviteSaving}>
                {inviteSaving ? t('common.saving') : t('team.sendInvite')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Vendor CRUD Dialog ────────────────────────────────────────────────── */}
      <Dialog open={vendorDialogOpen} onOpenChange={(open) => { if (!vendorSaving) setVendorDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVendor ? t('vendors.editVendor') : t('vendors.addVendor')}</DialogTitle>
            <DialogDescription>{t('vendors.vendorDesc')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVendorSave} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t('vendors.companyName')}</Label>
              <Input value={vendorForm.name} onChange={e => setVendorField('name', e.target.value)} placeholder={t('vendors.companyPlaceholder')} />
              {vendorErrors.name && <p className="text-xs text-destructive">{t('common.required')}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.phone')}</Label>
                <Input value={vendorForm.phone} onChange={e => setVendorField('phone', e.target.value)} placeholder={t('vendors.phonePlaceholder')} />
                {vendorErrors.phone && <p className="text-xs text-destructive">{t('common.required')}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t('common.email')}</Label>
                <Input type="email" value={vendorForm.email} onChange={e => setVendorField('email', e.target.value)} placeholder={t('vendors.emailPlaceholder')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.category')}</Label>
                <select value={vendorForm.category} onChange={e => setVendorField('category', e.target.value)} className={SELECT_CLASS}>
                  {Object.entries(CATEGORY_KEYS).map(([val, key]) => (
                    <option key={val} value={val}>{t(key)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('vendors.rating')}</Label>
                <Input type="number" min="1" max="5" value={vendorForm.rating} onChange={e => setVendorField('rating', e.target.value)} placeholder={t('vendors.ratingPlaceholder')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('vendors.tradeLicense')}</Label>
              <Input value={vendorForm.tradeLicense} onChange={e => setVendorField('tradeLicense', e.target.value)} placeholder={t('common.optional')} />
            </div>
            <div className="space-y-2">
              <Label>{t('common.notes')}</Label>
              <Input value={vendorForm.notes} onChange={e => setVendorField('notes', e.target.value)} placeholder={t('vendors.notesPlaceholder')} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setVendorDialogOpen(false)} disabled={vendorSaving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={vendorSaving}>
                {vendorSaving ? t('common.saving') : editingVendor ? t('common.saveChanges') : t('vendors.addVendor')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Invitation Table (used for PM and Staff tabs)
// ═════════════════════════════════════════════════════════════════════════════

function InvitationTabContent({ t, invitations, loading, activeTab, canInvite, openInviteDialog, handleRevoke }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-0">
          <p className="text-sm text-muted-foreground py-12 text-center">{t('team.loading')}</p>
        </CardContent>
      </Card>
    )
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-sm font-medium">{t('team.noMembers')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('team.noMembersDesc')}</p>
            {canInvite && (
              <Button onClick={openInviteDialog} size="sm" className="mt-4">
                <Plus className="w-4 h-4" /> {t('team.invite')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('team.nameEmail')}</TableHead>
                <TableHead>{t('team.property')}</TableHead>
                <TableHead>{t('team.status')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('team.dateInvited')}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{inv.inviteeEmail}</p>
                      {inv.status === 'accepted' && inv.inviteeName && (
                        <p className="text-xs text-muted-foreground">{inv.inviteeName}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{inv.propertyName || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(inv.status)}>
                      {t(`team.status_${inv.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(inv.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {inv.status === 'pending' && (
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
                            <XCircle className="mr-2 h-3.5 w-3.5" /> {t('team.revoke')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Vendor Tab (directory + invited vendor users)
// ═════════════════════════════════════════════════════════════════════════════

function VendorTabContent({
  t, vendors, vendorsLoading, invitations, invLoading,
  openAddVendor, openEditVendor, handleVendorDelete, handleRevoke,
}) {
  return (
    <div className="space-y-6">
      {/* Invited vendor users section */}
      {!invLoading && invitations.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('team.invitedVendors')}
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('team.nameEmail')}</TableHead>
                      <TableHead>{t('team.property')}</TableHead>
                      <TableHead>{t('team.status')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('team.dateInvited')}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{inv.inviteeEmail}</p>
                            {inv.status === 'accepted' && inv.inviteeName && (
                              <p className="text-xs text-muted-foreground">{inv.inviteeName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{inv.propertyName || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(inv.status)}>
                            {t(`team.status_${inv.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(inv.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {inv.status === 'pending' && (
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
                                  <XCircle className="mr-2 h-3.5 w-3.5" /> {t('team.revoke')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vendor directory section */}
      <div className="space-y-2">
        {!invLoading && invitations.length > 0 && (
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('team.vendorDirectory')}
          </h2>
        )}
        <Card>
          <CardContent className="p-0">
            {vendorsLoading ? (
              <p className="text-sm text-muted-foreground py-12 text-center">{t('vendors.loading')}</p>
            ) : vendors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wrench className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h3 className="text-sm font-medium">{t('vendors.noVendors')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('vendors.addDesc')}</p>
                <Button onClick={openAddVendor} size="sm" className="mt-4">
                  <Plus className="w-4 h-4" /> {t('vendors.addVendor')}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.name')}</TableHead>
                      <TableHead>{t('common.category')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('common.phone')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('common.email')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('vendors.rating')}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map(v => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{v.name}</p>
                            {v.tradeLicense && (
                              <p className="text-xs text-muted-foreground">TL: {v.tradeLicense}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{CATEGORY_KEYS[v.category] ? t(CATEGORY_KEYS[v.category]) : v.category}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <a href={`tel:${v.phone}`} className="text-sm flex items-center gap-1 text-muted-foreground hover:text-foreground">
                            <Phone className="w-3 h-3" /> {v.phone}
                          </a>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {v.email ? (
                            <a href={`mailto:${v.email}`} className="text-sm flex items-center gap-1 text-muted-foreground hover:text-foreground">
                              <Mail className="w-3 h-3" /> {v.email}
                            </a>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {v.rating ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {v.rating}/5
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditVendor(v)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" /> {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleVendorDelete(v.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
