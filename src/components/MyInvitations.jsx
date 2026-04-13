import { useState, useEffect } from 'react'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { getAllInvitationsForEmail, reacceptInvitation } from '@/services/invitations'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, CheckCircle2, XCircle, RotateCcw, Loader2, Building2, Clock } from 'lucide-react'

const STATUS_BADGE = {
  pending: { variant: 'secondary', label: 'Pending' },
  accepted: { variant: 'success', label: 'Accepted' },
  declined: { variant: 'destructive', label: 'Declined' },
  revoked: { variant: 'outline', label: 'Revoked' },
}

const ROLE_LABELS = {
  property_manager: 'Property Manager',
  staff: 'Staff',
  vendor: 'Vendor',
  tenant: 'Tenant',
}

export default function MyInvitations() {
  const { currentUser, userProfile, refreshProfile } = useAuth()
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    if (!currentUser?.email) return
    loadInvitations()
  }, [currentUser?.email])

  async function loadInvitations() {
    setLoading(true)
    try {
      const invites = await getAllInvitationsForEmail(currentUser.email)
      setInvitations(invites)
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }

  async function handleReaccept(invite) {
    setProcessingId(invite.id)
    try {
      // 1. Re-accept the invitation
      await reacceptInvitation(invite.id)

      // 2. Update user profile — add property to linkedProperties
      const userRef = doc(db, 'users', currentUser.uid)
      const updates = {
        linkedProperties: arrayUnion(invite.propertyId),
      }

      // Only change role for users with no properties (fresh accounts defaulted to owner)
      const SAFE_INVITE_ROLES = ['property_manager', 'staff', 'vendor', 'tenant']
      const isNewUser = !userProfile?.role || (
        userProfile.role === 'owner'
        && (!userProfile.linkedProperties || userProfile.linkedProperties.length === 0)
      )
      if (isNewUser && SAFE_INVITE_ROLES.includes(invite.role)) {
        updates.role = invite.role
      }

      if (invite.role === 'tenant' && invite.unitId) {
        updates.linkedUnitId = invite.unitId
        updates.linkedUnitNumber = invite.unitNumber || null
      }

      await updateDoc(userRef, updates)

      // 3. Refresh profile and reload invitations
      await refreshProfile()
      await loadInvitations()
    } catch {
      // silently handle
    } finally {
      setProcessingId(null)
    }
  }

  function formatDate(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" /> My Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading invitations...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!invitations.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="w-4 h-4" /> My Invitations
        </CardTitle>
        <CardDescription>
          Invitations you have received to join properties.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map(inv => {
          const status = STATUS_BADGE[inv.status] || STATUS_BADGE.pending
          const canReaccept = inv.status === 'declined'

          return (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {inv.propertyName || inv.propertyId}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">
                    {ROLE_LABELS[inv.role] || inv.role}
                  </Badge>
                  <Badge variant={status.variant} className="text-[10px]">
                    {status.label}
                  </Badge>
                  {inv.inviterName && (
                    <span className="text-xs text-muted-foreground">
                      from {inv.inviterName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(inv.createdAt)}
                  </span>
                </div>
              </div>

              {canReaccept && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processingId === inv.id}
                  onClick={() => handleReaccept(inv)}
                  className="shrink-0"
                >
                  {processingId === inv.id ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Accepting...</>
                  ) : (
                    <><RotateCcw className="w-3.5 h-3.5" /> Accept</>
                  )}
                </Button>
              )}

              {inv.status === 'accepted' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}

              {inv.status === 'revoked' && (
                <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
