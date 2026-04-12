import { useState, useEffect } from 'react'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import {
  getPendingInvitationsForEmail,
  acceptInvitation,
  declineInvitation,
} from '@/services/invitations'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, CheckCircle2, XCircle, Loader2, Building2 } from 'lucide-react'

export default function InvitationChecker() {
  const { currentUser, userProfile, refreshProfile } = useAuth()
  const { t } = useLocale()
  const [pendingInvites, setPendingInvites] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null) // 'accepted' | 'declined'
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!currentUser?.email || checked) return
    async function check() {
      try {
        const invites = await getPendingInvitationsForEmail(currentUser.email)
        setPendingInvites(invites)
      } catch {
        // silently handle
      } finally {
        setChecked(true)
      }
    }
    check()
  }, [currentUser?.email, checked])

  if (!pendingInvites.length || currentIndex >= pendingInvites.length) return null

  const invite = pendingInvites[currentIndex]

  async function handleAccept() {
    setProcessing(true)
    setResult(null)
    try {
      // 1. Update invitation status
      await acceptInvitation(invite.id)

      // 2. Update user profile — set role (if not already set or upgrading from owner to specific role)
      //    and add propertyId to linkedProperties
      const userRef = doc(db, 'users', currentUser.uid)
      const updates = {
        linkedProperties: arrayUnion(invite.propertyId),
      }

      // Only change role for fresh signups who have no properties yet.
      // Real owners (who already have properties) should NEVER be downgraded.
      const SAFE_INVITE_ROLES = ['property_manager', 'staff', 'vendor', 'tenant']
      const isNewUser = !userProfile?.role || (
        userProfile.role === 'owner'
        && (!userProfile.linkedProperties || userProfile.linkedProperties.length === 0)
      )
      if (isNewUser && SAFE_INVITE_ROLES.includes(invite.role)) {
        updates.role = invite.role
      }

      // For tenants, also store their unit info
      if (invite.role === 'tenant' && invite.unitId) {
        updates.linkedUnitId = invite.unitId
        updates.linkedUnitNumber = invite.unitNumber || null
      }

      await updateDoc(userRef, updates)

      // 3. Refresh the user profile in context
      await refreshProfile()

      setResult('accepted')
      setTimeout(() => {
        setResult(null)
        setCurrentIndex(i => i + 1)
      }, 1500)
    } catch {
      // silently handle
    } finally {
      setProcessing(false)
    }
  }

  async function handleDecline() {
    setProcessing(true)
    setResult(null)
    try {
      await declineInvitation(invite.id)
      setResult('declined')
      setTimeout(() => {
        setResult(null)
        setCurrentIndex(i => i + 1)
      }, 1500)
    } catch {
      // silently handle
    } finally {
      setProcessing(false)
    }
  }

  // Build the message with placeholders replaced
  const message = t('invite.message')
    .replace('{property}', invite.propertyName || invite.propertyId)
    .replace('{role}', t(`role.${invite.role}`))
    .replace('{inviter}', invite.inviterName || 'Unknown')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-[95vw] max-w-md bg-background rounded-xl shadow-2xl border p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t('invite.title')}</h3>
            {pendingInvites.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {currentIndex + 1} / {pendingInvites.length}
              </p>
            )}
          </div>
        </div>

        {/* Invitation details */}
        <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{invite.propertyName || invite.propertyId}</span>
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{t(`role.${invite.role}`)}</Badge>
            {invite.unitNumber && (
              <Badge variant="outline">{t('common.unit')}: {invite.unitNumber}</Badge>
            )}
          </div>
        </div>

        {/* Result message */}
        {result && (
          <div className={`mt-4 p-3 rounded-md text-sm flex items-center gap-2 ${
            result === 'accepted' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
          }`}>
            {result === 'accepted' ? (
              <><CheckCircle2 className="w-4 h-4" /> {t('invite.accepted')}</>
            ) : (
              <><XCircle className="w-4 h-4" /> {t('invite.declined')}</>
            )}
          </div>
        )}

        {/* Actions */}
        {!result && (
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={processing}
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t('invite.declining')}</>
              ) : (
                <><XCircle className="w-4 h-4" /> {t('invite.decline')}</>
              )}
            </Button>
            <Button
              onClick={handleAccept}
              disabled={processing}
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t('invite.accepting')}</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> {t('invite.accept')}</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
