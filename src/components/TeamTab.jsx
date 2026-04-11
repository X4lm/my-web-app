import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, arrayRemove } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import {
  createInvitation, getPropertyInvitations,
  revokeInvitation, INVITE_STATUS, INVITABLE_ROLES,
} from '@/services/invitations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Users, UserPlus, MoreHorizontal, Trash2, Loader2, Mail, CheckCircle2, XCircle, Clock } from 'lucide-react'

const ROLE_INVITE_MAP = {
  admin:            ['property_manager', 'staff', 'vendor', 'tenant'],
  owner:            ['property_manager', 'staff', 'vendor', 'tenant'],
  property_manager: ['staff', 'vendor', 'tenant'],
}

const STATUS_ICON = {
  pending:  Clock,
  accepted: CheckCircle2,
  declined: XCircle,
  revoked:  XCircle,
}

const STATUS_VARIANT = {
  pending:  'secondary',
  accepted: 'success',
  declined: 'destructive',
  revoked:  'outline',
}

export default function TeamTab({ propertyId, property }) {
  const { currentUser, userProfile } = useAuth()
  const { t } = useLocale()
  const [invitations, setInvitations] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Form state
  const [invEmail, setInvEmail] = useState('')
  const [invRole, setInvRole] = useState('')
  const [invUnit, setInvUnit] = useState('')

  const myRole = userProfile?.role || 'owner'
  const canInviteRoles = ROLE_INVITE_MAP[myRole] || []
  const canInvite = canInviteRoles.length > 0

  useEffect(() => {
    loadData()
  }, [propertyId])

  async function loadData() {
    setLoading(true)
    try {
      const [invs, unitsSnap] = await Promise.all([
        getPropertyInvitations(propertyId),
        getDocs(collection(db, `users/${currentUser.uid}/properties/${propertyId}/units`)),
      ])
      setInvitations(invs)
      setUnits(unitsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error('[TeamTab] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  function openDialog() {
    setInvEmail('')
    setInvRole('')
    setInvUnit('')
    setSuccessMsg('')
    setErrorMsg('')
    setDialogOpen(true)
  }

  async function handleSendInvite(e) {
    e.preventDefault()
    if (!invEmail || !invRole) return
    if (invRole === 'tenant' && !invUnit) return

    setSending(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const unitDoc = invRole === 'tenant' ? units.find(u => u.id === invUnit) : null
      await createInvitation({
        inviterUid: currentUser.uid,
        inviterName: currentUser.displayName || currentUser.email,
        inviteeEmail: invEmail,
        propertyId,
        propertyName: property?.name || '',
        unitId: invRole === 'tenant' ? invUnit : undefined,
        unitNumber: unitDoc?.unitNumber || undefined,
        role: invRole,
      })
      setSuccessMsg(t('team.inviteSent'))
      setInvEmail('')
      setInvRole('')
      setInvUnit('')
      await loadData()
    } catch (err) {
      if (err.message === 'DUPLICATE_INVITE') {
        setErrorMsg(t('team.duplicateInvite'))
      } else {
        setErrorMsg(err.message)
      }
    } finally {
      setSending(false)
    }
  }

  async function handleRemove(invitation) {
    if (!window.confirm(t('team.removeConfirm'))) return
    try {
      await revokeInvitation(invitation.id)
      // If they had accepted, remove the property from their linkedProperties
      // (we'd need to know their UID — for now, just revoke the invitation)
      await loadData()
    } catch (err) {
      console.error('[TeamTab] Remove error:', err)
    }
  }

  function canRemoveMember(inv) {
    if (myRole === 'admin' || myRole === 'owner') return true
    if (inv.inviterUid === currentUser.uid) return true
    return false
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </CardContent>
      </Card>
    )
  }

  const activeInvitations = invitations.filter(i => i.status !== INVITE_STATUS.REVOKED)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" /> {t('team.title')}
            </CardTitle>
            {canInvite && (
              <Button size="sm" onClick={openDialog}>
                <UserPlus className="w-4 h-4" /> {t('team.invite')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeInvitations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">{t('team.noMembers')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('team.noMembersDesc')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {activeInvitations.map(inv => {
                const StatusIcon = STATUS_ICON[inv.status] || Clock
                return (
                  <div key={inv.id} className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted shrink-0">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{inv.inviteeEmail}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">
                            {t(`role.${inv.role}`)}
                          </Badge>
                          <Badge variant={STATUS_VARIANT[inv.status]} className="text-[10px] flex items-center gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {t(`team.${inv.status}`)}
                          </Badge>
                          {inv.unitNumber && (
                            <span className="text-[10px] text-muted-foreground">
                              {t('common.unit')}: {inv.unitNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t('team.invitedBy')} {inv.inviterName}
                          {inv.createdAt?.toDate && ` · ${inv.createdAt.toDate().toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>

                    {canRemoveMember(inv) && inv.status !== INVITE_STATUS.DECLINED && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleRemove(inv)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> {t('team.remove')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog (modal overlay) */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDialogOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 w-[95vw] max-w-md bg-background rounded-xl shadow-2xl border p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">{t('team.inviteTitle')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('team.inviteDesc')}</p>

            {errorMsg && (
              <div className="mt-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{errorMsg}</div>
            )}
            {successMsg && (
              <div className="mt-3 p-3 rounded-md bg-emerald-500/10 text-emerald-600 text-sm">{successMsg}</div>
            )}

            <form onSubmit={handleSendInvite} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>{t('team.email')}</Label>
                <Input
                  type="email"
                  value={invEmail}
                  onChange={e => setInvEmail(e.target.value)}
                  placeholder={t('team.emailPlaceholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{t('team.role')}</Label>
                <select
                  value={invRole}
                  onChange={e => setInvRole(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="">{t('team.selectRole')}</option>
                  {canInviteRoles.map(r => (
                    <option key={r} value={r}>{t(`role.${r}`)}</option>
                  ))}
                </select>
              </div>

              {invRole === 'tenant' && units.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('team.unit')}</Label>
                  <select
                    value={invUnit}
                    onChange={e => setInvUnit(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    required
                  >
                    <option value="">{t('team.selectUnit')}</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.unitNumber} {u.tenantName ? `(${u.tenantName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={sending}>
                  {sending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('team.sending')}</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> {t('team.sendInvite')}</>
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
