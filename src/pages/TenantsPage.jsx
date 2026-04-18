import { useState, useEffect, useCallback } from 'react'
import {
  collection, query, where, orderBy, onSnapshot, getDocs,
  addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import { canEdit, FEATURES } from '@/utils/permissions'
import { createInvitation, revokeInvitation, INVITE_STATUS } from '@/services/invitations'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  Plus, Search, MoreHorizontal, Users, XCircle, Pencil, Trash2,
  Eye, Mail, Phone, FileText, Calendar, Building2, ChevronLeft,
} from 'lucide-react'

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'
const TEXTAREA_CLASS = 'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

// ─── Document types required for tenants in UAE ─────────────────────────────
const DOCUMENT_TYPES = [
  { key: 'emirates_id', label: 'Emirates ID Copy' },
  { key: 'passport', label: 'Passport Copy' },
  { key: 'visa', label: 'Visa Copy' },
  { key: 'tenancy_contract', label: 'Tenancy Contract (Ejari)' },
  { key: 'security_deposit', label: 'Security Deposit Receipt' },
  { key: 'cheque_copies', label: 'Cheque Copies' },
  { key: 'move_in_report', label: 'Move-in Inspection Report' },
  { key: 'move_out_report', label: 'Move-out Inspection Report' },
  { key: 'noc', label: 'NOC (No Objection Certificate)' },
  { key: 'other', label: 'Other' },
]

// ─── Lease status options ───────────────────────────────────────────────────
const LEASE_STATUSES = [
  { key: 'active', label: 'Active', color: 'border-green-400 text-green-600 bg-green-50' },
  { key: 'expiring_soon', label: 'Expiring Soon', color: 'border-amber-400 text-amber-600 bg-amber-50' },
  { key: 'expired', label: 'Expired', color: 'border-red-400 text-red-600 bg-red-50' },
  { key: 'terminated', label: 'Terminated', color: 'border-gray-400 text-gray-500 bg-gray-50' },
  { key: 'pending', label: 'Pending', color: 'border-blue-400 text-blue-500 bg-blue-50' },
]

const EMPTY_TENANT = {
  // Personal
  fullName: '',
  email: '',
  phone: '',
  secondaryPhone: '',
  nationality: '',
  emiratesId: '',
  emiratesIdExpiry: '',
  passportNumber: '',
  passportExpiry: '',
  visaStatus: '',
  visaExpiry: '',
  // Lease
  propertyId: '',
  unitId: '',
  leaseStart: '',
  leaseEnd: '',
  monthlyRent: '',
  securityDeposit: '',
  paymentFrequency: 'monthly',
  leaseStatus: 'active',
  ejariNumber: '',
  // Emergency
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelation: '',
  // Documents checklist
  documents: {},
  // Notes
  notes: '',
}

const INVITE_STATUS_BADGE = {
  [INVITE_STATUS.PENDING]: { labelKey: 'tenants.invitePending', className: 'border-amber-400 text-amber-600 bg-amber-50' },
  [INVITE_STATUS.ACCEPTED]: { labelKey: 'tenants.appAccess', className: 'border-green-400 text-green-600 bg-green-50' },
  [INVITE_STATUS.DECLINED]: { labelKey: 'tenants.inviteDeclined', className: 'border-red-400 text-red-600 bg-red-50' },
  [INVITE_STATUS.REVOKED]: { labelKey: 'tenants.inviteRevoked', className: 'border-gray-400 text-gray-500 bg-gray-50' },
}

export default function TenantsPage() {
  const { currentUser, userProfile } = useAuth()
  const { t, formatCurrency, formatDate: fmtDate, formatDateTime: fmtTimestamp } = useLocale()
  const confirm = useConfirm()
  const toast = useToast()
  const { properties } = usePropertyAlerts()
  const role = userProfile?.role || 'owner'
  const canEditTenants = canEdit(role, FEATURES.TENANTS) || canEdit(role, FEATURES.INVITE_MEMBER)

  // ── State ─────────────────────────────────────────────────────────────────
  const [tenants, setTenants] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterProperty, setFilterProperty] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_TENANT)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [units, setUnits] = useState([])
  const [unitsLoading, setUnitsLoading] = useState(false)

  // Detail view
  const [viewTenant, setViewTenant] = useState(null)

  // Invite dialog
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePropertyId, setInvitePropertyId] = useState('')
  const [inviteUnitId, setInviteUnitId] = useState('')
  const [inviteUnits, setInviteUnits] = useState([])
  const [inviteUnitsLoading, setInviteUnitsLoading] = useState(false)
  const [inviteSaving, setInviteSaving] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const colPath = `users/${currentUser?.uid}/tenants`

  // ── Load tenants ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return
    const q = query(collection(db, colPath), orderBy('fullName'))
    const unsub = onSnapshot(q, (snap) => {
      setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      logError('[Tenants] Load error:', err)
      setLoading(false)
    })
    return unsub
  }, [currentUser, colPath])

  // ── Load invitations ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return
    const q = query(
      collection(db, 'invitations'),
      where('role', '==', 'tenant'),
      where('inviterUid', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setInvitations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, (err) => {
      logError('[Tenants] Invitation listener error:', err)
    })
    return unsub
  }, [currentUser])

  // ── Load units for a property ─────────────────────────────────────────────
  const loadUnits = useCallback(async (propertyId, target = 'form') => {
    if (!propertyId || !currentUser) {
      if (target === 'form') setUnits([])
      else setInviteUnits([])
      return
    }
    if (target === 'form') setUnitsLoading(true)
    else setInviteUnitsLoading(true)
    try {
      const snap = await getDocs(
        query(collection(db, `users/${currentUser.uid}/properties/${propertyId}/units`), orderBy('unitNumber'))
      )
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      if (target === 'form') setUnits(data)
      else setInviteUnits(data)
    } catch (err) {
      logError('[Tenants] Load units error:', err)
    } finally {
      if (target === 'form') setUnitsLoading(false)
      else setInviteUnitsLoading(false)
    }
  }, [currentUser])

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = tenants.filter(t => {
    if (filterProperty !== 'all' && t.propertyId !== filterProperty) return false
    if (filterStatus !== 'all' && t.leaseStatus !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        t.fullName?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.phone?.includes(q) ||
        t.emiratesId?.includes(q)
      )
    }
    return true
  })

  // ── Form helpers ──────────────────────────────────────────────────────────
  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (formError) setFormError('')
  }

  function setDocCheck(docKey, checked) {
    setForm(f => ({
      ...f,
      documents: { ...f.documents, [docKey]: checked },
    }))
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_TENANT)
    setUnits([])
    setFormError('')
    setDialogOpen(true)
  }

  function openEdit(tenant) {
    setEditing(tenant)
    setForm({ ...EMPTY_TENANT, ...tenant, documents: tenant.documents || {} })
    setFormError('')
    if (tenant.propertyId) loadUnits(tenant.propertyId, 'form')
    setDialogOpen(true)
  }

  function handlePropertyChange(propertyId) {
    set('propertyId', propertyId)
    set('unitId', '')
    loadUnits(propertyId, 'form')
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.fullName.trim()) return setFormError('Full name is required')
    if (!form.propertyId) return setFormError('Please select a property')

    setSaving(true)
    try {
      const propName = properties.find(p => p.id === form.propertyId)?.name || ''
      const unitNum = units.find(u => u.id === form.unitId)?.unitNumber || ''
      const data = {
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        monthlyRent: form.monthlyRent ? Number(form.monthlyRent) : 0,
        securityDeposit: form.securityDeposit ? Number(form.securityDeposit) : 0,
        propertyName: propName,
        unitNumber: unitNum,
      }

      if (editing) {
        await updateDoc(doc(db, colPath, editing.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, colPath), { ...data, createdAt: serverTimestamp() })
      }
      setDialogOpen(false)
    } catch (err) {
      logError('[Tenants] Save error:', err)
      setFormError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({
      title: t('tenants.deleteTitle'),
      description: t('tenants.deleteConfirm'),
      confirmLabel: t('common.delete'),
      destructive: true,
    })
    if (!ok) return
    const snapshot = tenants.find(x => x.id === id)
    if (!snapshot) return
    try {
      await deleteDoc(doc(db, colPath, id))
      if (viewTenant?.id === id) setViewTenant(null)
      // Offer undo: setDoc rewrites the same ID with the original data.
      toast.undo(
        t('common.deleted'),
        async () => {
          try {
            const { id: _id, ...rest } = snapshot
            await setDoc(doc(db, colPath, id), rest)
          } catch (err) {
            logError('[Tenants] Undo restore error:', err)
            toast.error(t('common.error'))
          }
        },
        { actionLabel: t('common.undo') },
      )
    } catch (err) {
      logError('[Tenants] Delete error:', err)
      toast.error(t('common.deleteFailed'))
    }
  }

  // ── Invite helpers ────────────────────────────────────────────────────────
  function openInvite(tenant) {
    setInviteEmail(tenant?.email || '')
    setInvitePropertyId(tenant?.propertyId || '')
    setInviteUnitId(tenant?.unitId || '')
    setInviteError('')
    if (tenant?.propertyId) loadUnits(tenant.propertyId, 'invite')
    setInviteDialogOpen(true)
  }

  function handleInvitePropertyChange(propertyId) {
    setInvitePropertyId(propertyId)
    setInviteUnitId('')
    loadUnits(propertyId, 'invite')
  }

  async function handleInvite(e) {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) return setInviteError('Email is required')
    if (!invitePropertyId) return setInviteError('Please select a property')

    setInviteSaving(true)
    try {
      await createInvitation({
        inviterUid: currentUser.uid,
        inviterName: currentUser.displayName || currentUser.email,
        inviteeEmail: email,
        propertyId: invitePropertyId,
        propertyName: properties.find(p => p.id === invitePropertyId)?.name || '',
        unitId: inviteUnitId || undefined,
        unitNumber: inviteUnits.find(u => u.id === inviteUnitId)?.unitNumber || '',
        role: 'tenant',
        inviterRole: role,
      })
      setInviteDialogOpen(false)
    } catch (err) {
      if (err.message === 'DUPLICATE_INVITE') {
        setInviteError('A pending invitation already exists for this tenant.')
      } else {
        logError('[Tenants] Invite error:', err)
        setInviteError('Failed to send invitation.')
      }
    } finally {
      setInviteSaving(false)
    }
  }

  async function handleRevoke(invitationId) {
    const ok = await confirm({
      title: t('tenants.revokeTitle'),
      description: t('tenants.revokeConfirm'),
      confirmLabel: t('common.confirm'),
      destructive: true,
    })
    if (!ok) return
    try {
      await revokeInvitation(invitationId)
    } catch (err) {
      logError('[Tenants] Revoke error:', err)
      toast.error(t('common.error') || 'Failed to revoke invitation.')
    }
  }

  // ── Get invitation status for a tenant ────────────────────────────────────
  function getInviteForTenant(tenant) {
    if (!tenant.email) return null
    return invitations.find(inv =>
      inv.inviteeEmail === tenant.email.toLowerCase()
      && inv.status !== INVITE_STATUS.REVOKED
      && inv.status !== INVITE_STATUS.DECLINED
    )
  }

  // ── Lease status badge ────────────────────────────────────────────────────
  function leaseStatusBadge(status) {
    const s = LEASE_STATUSES.find(ls => ls.key === status)
    if (!s) return null
    return <Badge variant="outline" className={s.color}>{s.label}</Badge>
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewTenant) {
    const tenant = tenants.find(t => t.id === viewTenant.id) || viewTenant
    const invite = getInviteForTenant(tenant)
    return (
      <AppLayout>
        <div className="space-y-6 max-w-3xl">
          {/* Back + header */}
          <div>
            <Button variant="ghost" size="sm" onClick={() => setViewTenant(null)} className="mb-2 -ml-2">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Tenants
            </Button>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{tenant.fullName}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {tenant.propertyName}{tenant.unitNumber ? ` — Unit ${tenant.unitNumber}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {leaseStatusBadge(tenant.leaseStatus)}
                {invite && (
                  <Badge variant="outline" className={INVITE_STATUS_BADGE[invite.status]?.className}>
                    {t(INVITE_STATUS_BADGE[invite.status]?.labelKey)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Full Name" value={tenant.fullName} />
                <InfoRow label="Email" value={tenant.email} icon={<Mail className="w-3.5 h-3.5" />} link={tenant.email ? `mailto:${tenant.email}` : null} />
                <InfoRow label="Phone" value={tenant.phone} icon={<Phone className="w-3.5 h-3.5" />} link={tenant.phone ? `tel:${tenant.phone}` : null} />
                <InfoRow label="Secondary Phone" value={tenant.secondaryPhone} />
                <InfoRow label="Nationality" value={tenant.nationality} />
                <InfoRow label="Emirates ID" value={tenant.emiratesId} />
                <InfoRow label="Emirates ID Expiry" value={fmtDate(tenant.emiratesIdExpiry)} />
                <InfoRow label="Passport Number" value={tenant.passportNumber} />
                <InfoRow label="Passport Expiry" value={fmtDate(tenant.passportExpiry)} />
                <InfoRow label="Visa Status" value={tenant.visaStatus} />
                <InfoRow label="Visa Expiry" value={fmtDate(tenant.visaExpiry)} />
              </div>
            </CardContent>
          </Card>

          {/* Lease Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lease Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Property" value={tenant.propertyName} icon={<Building2 className="w-3.5 h-3.5" />} />
                <InfoRow label="Unit" value={tenant.unitNumber || '—'} />
                <InfoRow label="Lease Start" value={fmtDate(tenant.leaseStart)} icon={<Calendar className="w-3.5 h-3.5" />} />
                <InfoRow label="Lease End" value={fmtDate(tenant.leaseEnd)} />
                <InfoRow label="Monthly Rent" value={tenant.monthlyRent ? formatCurrency(tenant.monthlyRent) : '—'} />
                <InfoRow label="Security Deposit" value={tenant.securityDeposit ? formatCurrency(tenant.securityDeposit) : '—'} />
                <InfoRow label="Payment Frequency" value={tenant.paymentFrequency ? tenant.paymentFrequency.charAt(0).toUpperCase() + tenant.paymentFrequency.slice(1) : '—'} />
                <InfoRow label="Lease Status" value={leaseStatusBadge(tenant.leaseStatus)} />
                <InfoRow label="Ejari Number" value={tenant.ejariNumber} />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <InfoRow label="Name" value={tenant.emergencyName} />
                <InfoRow label="Phone" value={tenant.emergencyPhone} />
                <InfoRow label="Relationship" value={tenant.emergencyRelation} />
              </div>
            </CardContent>
          </Card>

          {/* Documents Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Documents Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {DOCUMENT_TYPES.map(dt => {
                  const collected = tenant.documents?.[dt.key]
                  return (
                    <div key={dt.key} className="flex items-center gap-2 text-sm">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${collected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-muted-foreground/30'}`}>
                        {collected ? '✓' : ''}
                      </div>
                      <span className={collected ? 'text-foreground' : 'text-muted-foreground'}>{dt.label}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {tenant.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tenant.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {canEditTenants && (
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={() => openEdit(tenant)}>
                <Pencil className="w-4 h-4 mr-1" /> Edit Tenant
              </Button>
              {!invite && tenant.email && (
                <Button size="sm" variant="outline" onClick={() => openInvite(tenant)}>
                  <Mail className="w-4 h-4 mr-1" /> Send App Invite
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => handleDelete(tenant.id)}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>
          )}
        </div>
      </AppLayout>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('tenants.title') || 'Tenants'}</h1>
            <p className="text-muted-foreground text-sm">{t('tenants.subtitle') || 'Manage tenant records, documents, and invitations.'}</p>
          </div>
          {canEditTenants && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => openInvite(null)}>
                <Mail className="w-4 h-4 mr-1" /> Invite to App
              </Button>
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4 mr-1" /> Add Tenant
              </Button>
            </div>
          )}
        </div>

        {/* Search + Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or Emirates ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)} className={SELECT_CLASS + ' sm:w-48'} aria-label={t('tenants.filterByProperty')}>
                <option value="all">{t('tenants.allProperties')}</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={SELECT_CLASS + ' sm:w-40'} aria-label={t('tenants.filterByStatus')}>
                <option value="all">{t('tenants.allStatuses')}</option>
                {LEASE_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Tenant Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-12 text-center">{t('tenants.loading')}</p>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Users}
                title={search || filterProperty !== 'all' || filterStatus !== 'all' ? t('tenants.noMatches') : t('tenants.noTenantsYet')}
                description={search ? t('tenants.tryDifferentSearch') : t('tenants.getStarted')}
                action={!search && canEditTenants ? openAdd : undefined}
                actionLabel={!search && canEditTenants ? t('tenants.addTenant') : undefined}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.tenant')}</TableHead>
                      <TableHead>{t('tenants.propertyUnit')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('common.phone')}</TableHead>
                      <TableHead>{t('tenants.lease')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('common.rent')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('common.status')}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(tenant => {
                      const invite = getInviteForTenant(tenant)
                      return (
                        <TableRow key={tenant.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewTenant(tenant)}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{tenant.fullName}</p>
                              {tenant.email && <p className="text-xs text-muted-foreground">{tenant.email}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{tenant.propertyName || '—'}</p>
                              {tenant.unitNumber && <p className="text-xs text-muted-foreground">Unit {tenant.unitNumber}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-sm text-muted-foreground">{tenant.phone || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              {tenant.leaseStart && tenant.leaseEnd
                                ? <>{fmtDate(tenant.leaseStart)} → {fmtDate(tenant.leaseEnd)}</>
                                : '—'
                              }
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm">{tenant.monthlyRent ? formatCurrency(tenant.monthlyRent) : '—'}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-1.5">
                              {leaseStatusBadge(tenant.leaseStatus)}
                              {invite && (
                                <Badge
                                  variant="outline"
                                  className={INVITE_STATUS_BADGE[invite.status]?.className + ' text-[10px] px-1.5'}
                                  aria-label={t(INVITE_STATUS_BADGE[invite.status]?.labelKey)}
                                  title={t(INVITE_STATUS_BADGE[invite.status]?.labelKey)}
                                >
                                  {invite.status === INVITE_STATUS.ACCEPTED ? '✓' : '⏳'}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewTenant(tenant)}>
                                  <Eye className="mr-2 h-3.5 w-3.5" /> View Details
                                </DropdownMenuItem>
                                {canEditTenants && (
                                  <>
                                    <DropdownMenuItem onClick={() => openEdit(tenant)}>
                                      <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                    </DropdownMenuItem>
                                    {!invite && tenant.email && (
                                      <DropdownMenuItem onClick={() => openInvite(tenant)}>
                                        <Mail className="mr-2 h-3.5 w-3.5" /> Send App Invite
                                      </DropdownMenuItem>
                                    )}
                                    {invite?.status === INVITE_STATUS.PENDING && (
                                      <DropdownMenuItem onClick={() => handleRevoke(invite.id)} className="text-amber-600">
                                        <XCircle className="mr-2 h-3.5 w-3.5" /> Revoke Invite
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDelete(tenant.id)} className="text-destructive focus:text-destructive">
                                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* ═══ ADD / EDIT TENANT DIALOG ═══════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update tenant information.' : 'Enter the tenant\'s personal details, lease information, and document checklist.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 mt-2">
            {/* ── Personal Information ──────────────────────────────── */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Personal Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name <span className="text-destructive">*</span></Label>
                  <Input value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. Ahmed Al Maktoum" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="tenant@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+971 ..." />
                </div>
                <div className="space-y-2">
                  <Label>Secondary Phone</Label>
                  <Input value={form.secondaryPhone} onChange={e => set('secondaryPhone', e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <Input value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="e.g. UAE, India, Egypt" />
                </div>
                <div className="space-y-2">
                  <Label>Emirates ID</Label>
                  <Input value={form.emiratesId} onChange={e => set('emiratesId', e.target.value)} placeholder="784-XXXX-XXXXXXX-X" />
                </div>
                <div className="space-y-2">
                  <Label>Emirates ID Expiry</Label>
                  <Input type="date" value={form.emiratesIdExpiry} onChange={e => set('emiratesIdExpiry', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Passport Number</Label>
                  <Input value={form.passportNumber} onChange={e => set('passportNumber', e.target.value)} placeholder="Passport number" />
                </div>
                <div className="space-y-2">
                  <Label>Passport Expiry</Label>
                  <Input type="date" value={form.passportExpiry} onChange={e => set('passportExpiry', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Visa Status</Label>
                  <Input value={form.visaStatus} onChange={e => set('visaStatus', e.target.value)} placeholder="e.g. Employment, Investor, Family" />
                </div>
                <div className="space-y-2">
                  <Label>Visa Expiry</Label>
                  <Input type="date" value={form.visaExpiry} onChange={e => set('visaExpiry', e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Lease Details ─────────────────────────────────────── */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Lease Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Property <span className="text-destructive">*</span></Label>
                  <select value={form.propertyId} onChange={e => handlePropertyChange(e.target.value)} className={SELECT_CLASS}>
                    <option value="">Select property...</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <select value={form.unitId} onChange={e => set('unitId', e.target.value)} className={SELECT_CLASS} disabled={!form.propertyId || unitsLoading}>
                    <option value="">{unitsLoading ? 'Loading...' : !form.propertyId ? 'Select property first' : units.length === 0 ? 'No units' : 'Select unit...'}</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Lease Start</Label>
                  <Input type="date" value={form.leaseStart} onChange={e => set('leaseStart', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Lease End</Label>
                  <Input type="date" value={form.leaseEnd} onChange={e => set('leaseEnd', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Rent</Label>
                  <Input type="number" value={form.monthlyRent} onChange={e => set('monthlyRent', e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Security Deposit</Label>
                  <Input type="number" value={form.securityDeposit} onChange={e => set('securityDeposit', e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Frequency</Label>
                  <select value={form.paymentFrequency} onChange={e => set('paymentFrequency', e.target.value)} className={SELECT_CLASS}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi_annual">Semi-Annual</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Lease Status</Label>
                  <select value={form.leaseStatus} onChange={e => set('leaseStatus', e.target.value)} className={SELECT_CLASS}>
                    {LEASE_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Ejari Number</Label>
                  <Input value={form.ejariNumber} onChange={e => set('ejariNumber', e.target.value)} placeholder="Ejari contract registration number" />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Emergency Contact ─────────────────────────────────── */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Emergency Contact</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.emergencyName} onChange={e => set('emergencyName', e.target.value)} placeholder="Contact name" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} placeholder="+971 ..." />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Input value={form.emergencyRelation} onChange={e => set('emergencyRelation', e.target.value)} placeholder="e.g. Spouse, Parent" />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Documents Checklist ───────────────────────────────── */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Documents Checklist</h3>
              <p className="text-xs text-muted-foreground mb-3">Track which documents have been collected from the tenant.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {DOCUMENT_TYPES.map(dt => (
                  <label key={dt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form.documents[dt.key]}
                      onChange={e => setDocCheck(dt.key, e.target.checked)}
                      className="rounded border-input"
                    />
                    {dt.label}
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* ── Notes ────────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className={TEXTAREA_CLASS}
                placeholder="Any additional notes about this tenant..."
                rows={3}
              />
            </div>

            {/* Error */}
            {formError && <p className="text-sm text-destructive">{formError}</p>}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Tenant'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ INVITE DIALOG ═════════════════════════════════════════════════ */}
      <Dialog open={inviteDialogOpen} onOpenChange={open => { if (!inviteSaving) setInviteDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Tenant to App</DialogTitle>
            <DialogDescription>
              Send an app invitation so the tenant can view their unit details, submit maintenance requests, and receive announcements.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteError('') }} placeholder="tenant@email.com" required />
            </div>
            <div className="space-y-2">
              <Label>Property</Label>
              <select value={invitePropertyId} onChange={e => handleInvitePropertyChange(e.target.value)} className={SELECT_CLASS}>
                <option value="">Select property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <select value={inviteUnitId} onChange={e => setInviteUnitId(e.target.value)} className={SELECT_CLASS} disabled={!invitePropertyId || inviteUnitsLoading}>
                <option value="">{inviteUnitsLoading ? 'Loading...' : !invitePropertyId ? 'Select property first' : inviteUnits.length === 0 ? 'No units' : 'Select unit (optional)'}</option>
                {inviteUnits.map(u => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
              </select>
            </div>
            {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={inviteSaving}>Cancel</Button>
              <Button type="submit" disabled={inviteSaving}>
                {inviteSaving ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

// ─── Helper component ─────────────────────────────────────────────────────────

function InfoRow({ label, value, icon, link }) {
  const display = value || '—'
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {link ? (
        <a href={link} className="text-sm font-medium flex items-center gap-1.5 hover:underline underline-offset-2">
          {icon} {display}
        </a>
      ) : (
        <div className="text-sm font-medium flex items-center gap-1.5">
          {icon} {typeof display === 'string' ? display : display}
        </div>
      )}
    </div>
  )
}
