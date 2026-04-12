import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import {
  createInvitation, getPropertyInvitations, INVITE_STATUS,
} from '@/services/invitations'
import UnitFormDialog from '@/components/UnitFormDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Pencil, Trash2, DoorOpen, UserPlus, Mail, Loader2, Clock, CheckCircle2 } from 'lucide-react'

import { UNIT_TYPE_LABELS } from '@/lib/utils'
const CONDITION_LABELS = { good: 'Good', needs_attention: 'Needs Attention', critical: 'Critical' }
const PAYMENT_VARIANT = { paid: 'success', pending: 'warning', overdue: 'destructive' }
const PAYMENT_LABELS = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue' }
const CONDITION_VARIANT = { good: 'success', needs_attention: 'warning', critical: 'destructive' }

export default function UnitsTab({ propertyId, propertyType, propertyName }) {
  const { currentUser, userProfile } = useAuth()
  const { t, formatCurrency } = useLocale()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  // Tenant invite state
  const [inviteUnit, setInviteUnit] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteMsg, setInviteMsg] = useState({ type: '', text: '' })
  const [unitInvitations, setUnitInvitations] = useState({}) // unitId -> invitation

  const basePath = `users/${currentUser.uid}/properties/${propertyId}/units`
  const myRole = userProfile?.role || 'owner'
  const canInviteTenant = ['admin', 'owner', 'property_manager'].includes(myRole)

  useEffect(() => {
    const q = query(collection(db, basePath), orderBy('unitNumber', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setUnits(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      logError('[Firestore] Units listen error:', err.code, err.message)
      setLoading(false)
    })
    return unsub
  }, [basePath])

  // Load tenant invitations for this property
  useEffect(() => {
    async function loadInvitations() {
      try {
        const invs = await getPropertyInvitations(propertyId)
        const map = {}
        invs.forEach(inv => {
          if (inv.role === 'tenant' && inv.unitId && inv.status !== INVITE_STATUS.REVOKED) {
            // Keep the most relevant invitation per unit (accepted > pending > declined)
            const existing = map[inv.unitId]
            if (!existing || inv.status === INVITE_STATUS.ACCEPTED ||
                (inv.status === INVITE_STATUS.PENDING && existing.status !== INVITE_STATUS.ACCEPTED)) {
              map[inv.unitId] = inv
            }
          }
        })
        setUnitInvitations(map)
      } catch (err) {
        logError('[UnitsTab] Load invitations error:', err)
      }
    }
    loadInvitations()
  }, [propertyId])

  async function handleInviteTenant(e) {
    e.preventDefault()
    if (!inviteEmail || !inviteUnit) return
    setInviteSending(true)
    setInviteMsg({ type: '', text: '' })
    try {
      await createInvitation({
        inviterUid: currentUser.uid,
        inviterName: currentUser.displayName || currentUser.email,
        inviteeEmail: inviteEmail,
        propertyId,
        propertyName: propertyName || '',
        unitId: inviteUnit.id,
        unitNumber: inviteUnit.unitNumber,
        role: 'tenant',
      })
      setInviteMsg({ type: 'success', text: t('team.inviteSent') })
      // Update local invitation map
      setUnitInvitations(prev => ({
        ...prev,
        [inviteUnit.id]: {
          inviteeEmail: inviteEmail.toLowerCase(),
          status: INVITE_STATUS.PENDING,
          role: 'tenant',
          unitId: inviteUnit.id,
        }
      }))
      setInviteEmail('')
      setTimeout(() => { setInviteUnit(null); setInviteMsg({ type: '', text: '' }) }, 1500)
    } catch (err) {
      if (err.message === 'DUPLICATE_INVITE') {
        setInviteMsg({ type: 'error', text: t('team.duplicateInvite') })
      } else {
        setInviteMsg({ type: 'error', text: err.message })
      }
    } finally {
      setInviteSending(false)
    }
  }

  async function handleSave(data) {
    setSaving(true)
    try {
      if (editing) {
        await updateDoc(doc(db, basePath, editing.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, basePath), { ...data, createdAt: serverTimestamp() })
      }
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      logError('[Firestore] Unit save error:', err.code, err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(t('units.deleteConfirm'))) return
    try {
      await deleteDoc(doc(db, basePath, id))
    } catch (err) {
      logError('[Firestore] Unit delete error:', err.code, err.message)
    }
  }

  const occupied = units.filter(u => u.tenantName).length
  const totalRent = units.reduce((s, u) => s + Number(u.monthlyRent || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {units.length} {units.length === 1 ? t('units.unit') : t('units.title')} &middot; {occupied} {t('units.occupied')} &middot; {formatCurrency(totalRent)}{t('units.moTotalRent')}
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="w-4 h-4" />
          {t('units.addUnit')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground py-12 text-center">{t('units.loading')}</p>
          ) : units.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <DoorOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">{t('units.noUnits')}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t('units.addUnitsDesc')}</p>
              <Button size="sm" className="mt-4" onClick={() => { setEditing(null); setDialogOpen(true) }}>
                <Plus className="w-4 h-4" /> {t('units.addUnit')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('units.unit')}</TableHead>
                  <TableHead>{t('units.floor')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('units.type')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('units.tenant')}</TableHead>
                  <TableHead>{t('units.payment')}</TableHead>
                  <TableHead>{t('units.condition')}</TableHead>
                  <TableHead className="text-right">{t('units.rent')}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.unitNumber}</TableCell>
                    <TableCell>{u.floor}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">{UNIT_TYPE_LABELS[u.unitType] || u.unitType}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {u.tenantName ? (
                        <div>
                          <p className="text-sm">{u.tenantName}</p>
                          <p className="text-xs text-muted-foreground">{u.tenantContact}</p>
                        </div>
                      ) : unitInvitations[u.id] ? (
                        <div className="flex items-center gap-1.5">
                          {unitInvitations[u.id].status === INVITE_STATUS.ACCEPTED ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground">{unitInvitations[u.id].inviteeEmail}</p>
                            <Badge variant={unitInvitations[u.id].status === INVITE_STATUS.ACCEPTED ? 'success' : 'secondary'} className="text-[9px] mt-0.5">
                              {t(`team.${unitInvitations[u.id].status}`)}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t('units.vacant')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={PAYMENT_VARIANT[u.paymentStatus] || 'secondary'}>
                        {PAYMENT_LABELS[u.paymentStatus] || u.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={CONDITION_VARIANT[u.condition] || 'secondary'}>
                        {CONDITION_LABELS[u.condition] || u.condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(u.monthlyRent)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(u); setDialogOpen(true) }}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> {t('common.edit')}
                          </DropdownMenuItem>
                          {canInviteTenant && !u.tenantName && (
                            <DropdownMenuItem onClick={() => { setInviteUnit(u); setInviteEmail(''); setInviteMsg({ type: '', text: '' }) }}>
                              <UserPlus className="mr-2 h-3.5 w-3.5" /> {t('team.inviteTenant')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(u.id)}
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

      <UnitFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!saving) { setDialogOpen(open); if (!open) setEditing(null) } }}
        unit={editing}
        onSave={handleSave}
        saving={saving}
        propertyType={propertyType}
      />

      {/* Invite Tenant Dialog */}
      {inviteUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setInviteUnit(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 w-[95vw] max-w-sm bg-background rounded-xl shadow-2xl border p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> {t('team.inviteTenant')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('team.inviteTenantDesc')}
            </p>
            <p className="text-sm font-medium mt-2">
              {t('common.unit')}: {inviteUnit.unitNumber}
            </p>

            {inviteMsg.text && (
              <div className={`mt-3 p-3 rounded-md text-sm ${inviteMsg.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>
                {inviteMsg.text}
              </div>
            )}

            <form onSubmit={handleInviteTenant} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>{t('team.email')}</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder={t('team.emailPlaceholder')}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setInviteUnit(null)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={inviteSending}>
                  {inviteSending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('team.sending')}</>
                  ) : (
                    <><Mail className="w-4 h-4" /> {t('team.sendInvite')}</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
