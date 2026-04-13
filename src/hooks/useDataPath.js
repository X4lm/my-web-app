import { useAuth } from '@/contexts/AuthContext'

const OWNER_ROLES = new Set(['admin', 'owner'])

/**
 * Returns a function that resolves the correct Firestore base path for property data.
 * - For owners/admins: always uses their own UID
 * - For PMs/staff: uses the property's _ownerUid (set by usePropertyAlerts)
 *
 * Usage:
 *   const { getOwnerUid } = useDataPath()
 *   const uid = getOwnerUid(property)
 *   // Then use: `users/${uid}/properties/${property.id}/...`
 */
export function useDataPath() {
  const { currentUser, userProfile } = useAuth()
  const role = userProfile?.role || 'owner'
  const isOwner = OWNER_ROLES.has(role)

  function getOwnerUid(property) {
    if (isOwner) return currentUser?.uid
    // For non-owners, the property object should carry _ownerUid from usePropertyAlerts
    return property?._ownerUid || currentUser?.uid
  }

  return { getOwnerUid, isOwner }
}
