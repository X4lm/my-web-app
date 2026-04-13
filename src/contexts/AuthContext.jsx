import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth'
import { doc, getDoc, setDoc, getDocs, updateDoc, collection, query, where, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/firebase/config'
import { logLoginEvent } from '@/services/analytics'

const AuthContext = createContext()

export const ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner',
  PROPERTY_MANAGER: 'property_manager',
  STAFF: 'staff',
  VENDOR: 'vendor',
  TENANT: 'tenant',
}

const SAFE_ROLES = ['property_manager', 'staff', 'vendor', 'tenant']
const ROLE_PRIORITY = { property_manager: 1, staff: 2, vendor: 3, tenant: 4 }
const SESSION_TIMEOUT_MS = 30 * 60 * 1000

export function useAuth() {
  return useContext(AuthContext)
}

// ─── Resolve invitations for an email ─────────────────────────────────────────
// Queries pending (and optionally accepted) invitations, returns role + linkedProperties
// Also marks pending invitations as accepted
async function resolveInvitations(email, includeAccepted = false) {
  const statuses = includeAccepted ? ['pending', 'accepted'] : ['pending']

  let inviteSnap
  if (statuses.length === 1) {
    inviteSnap = await getDocs(query(
      collection(db, 'invitations'),
      where('inviteeEmail', '==', email.toLowerCase()),
      where('status', '==', statuses[0]),
    ))
  } else {
    inviteSnap = await getDocs(query(
      collection(db, 'invitations'),
      where('inviteeEmail', '==', email.toLowerCase()),
      where('status', 'in', statuses),
    ))
  }

  if (inviteSnap.empty) return null

  let role = null
  const linkedProperties = []
  const extras = {}

  for (const invDoc of inviteSnap.docs) {
    const inv = invDoc.data()

    // Collect property IDs
    if (inv.propertyId && !linkedProperties.includes(inv.propertyId)) {
      linkedProperties.push(inv.propertyId)
    }

    // Pick highest-priority role
    if (SAFE_ROLES.includes(inv.role)) {
      if (!role || (ROLE_PRIORITY[inv.role] || 99) < (ROLE_PRIORITY[role] || 99)) {
        role = inv.role
      }
    }

    // Tenant-specific fields
    if (inv.role === 'tenant' && inv.unitId && !extras.linkedUnitId) {
      extras.linkedUnitId = inv.unitId
      extras.linkedUnitNumber = inv.unitNumber || null
    }

    // Mark pending invitations as accepted
    if (inv.status === 'pending') {
      try {
        await updateDoc(doc(db, 'invitations', invDoc.id), {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
        })
      } catch (e) {
        console.warn('Failed to accept invitation:', e)
      }
    }
  }

  if (!role || linkedProperties.length === 0) return null
  return { role, linkedProperties, ...extras }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const idleTimerRef = useRef(null)

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      signOut(auth)
    }, SESSION_TIMEOUT_MS)
  }, [])

  useEffect(() => {
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart']
    events.forEach(e => document.addEventListener(e, resetIdleTimer))
    resetIdleTimer()
    return () => {
      events.forEach(e => document.removeEventListener(e, resetIdleTimer))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [resetIdleTimer])

  // ─── Core: fetch or create user profile, with invitation resolution ─────────
  async function fetchOrCreateProfile(user) {
    if (!user) { setUserProfile(null); return null }

    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)

    // ── Existing user ──────────────────────────────────────────────────────
    if (snap.exists()) {
      const data = snap.data()
      console.log('[Auth] Existing user loaded:', { uid: user.uid, email: user.email, role: data.role, linkedProperties: data.linkedProperties })

      if (data.suspended) {
        await signOut(auth)
        setUserProfile(null)
        return null
      }

      // Auto-repair: if user is 'owner' with no linked properties,
      // check if they have invitations that should slot them into the right role
      const hasNoProperties = !data.linkedProperties || data.linkedProperties.length === 0
      console.log('[Auth] Repair check:', { role: data.role, hasNoProperties, willRepair: data.role === 'owner' && hasNoProperties })
      if (data.role === 'owner' && hasNoProperties) {
        try {
          // Check both pending AND accepted invitations (covers cases where
          // InvitationChecker accepted the invite but didn't update the user doc)
          console.log('[Auth] Checking invitations for:', user.email)
          const resolved = await resolveInvitations(user.email, true)
          console.log('[Auth] Invitation resolution result:', resolved)
          if (resolved) {
            const updates = {
              role: resolved.role,
              linkedProperties: resolved.linkedProperties,
              lastLogin: serverTimestamp(),
            }
            if (resolved.linkedUnitId) {
              updates.linkedUnitId = resolved.linkedUnitId
              updates.linkedUnitNumber = resolved.linkedUnitNumber
            }
            await updateDoc(ref, updates)
            const updatedProfile = { id: snap.id, ...data, ...updates, lastLogin: new Date() }
            console.log('[Auth] Profile repaired:', { role: updatedProfile.role, linkedProperties: updatedProfile.linkedProperties })
            setUserProfile(updatedProfile)
            return updatedProfile
          }
        } catch (err) {
          console.warn('Invitation auto-repair failed:', err)
        }
      }

      // Normal path: return existing profile
      const profile = { id: snap.id, ...data }
      setUserProfile(profile)
      return profile
    }

    // ── New user (no Firestore doc yet) ────────────────────────────────────
    console.log('[Auth] New user, checking invitations for:', user.email)
    let role = ROLES.OWNER
    let linkedProperties = []
    let extras = {}

    try {
      const resolved = await resolveInvitations(user.email, false)
      console.log('[Auth] New user invitation result:', resolved)
      if (resolved) {
        role = resolved.role
        linkedProperties = resolved.linkedProperties
        if (resolved.linkedUnitId) {
          extras.linkedUnitId = resolved.linkedUnitId
          extras.linkedUnitNumber = resolved.linkedUnitNumber
        }
      }
    } catch (err) {
      console.warn('[Auth] New user invitation check failed:', err)
    }

    const newProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      role,
      linkedProperties,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      suspended: false,
      ...extras,
    }
    await setDoc(ref, newProfile)
    const created = { id: user.uid, ...newProfile }
    setUserProfile(created)
    return created
  }

  // ─── Signup ─────────────────────────────────────────────────────────────────
  async function signup(email, password, displayName) {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName })
    await sendEmailVerification(result.user)
    // fetchOrCreateProfile will be called by onAuthStateChanged,
    // which handles invitation detection for new users
    return result
  }

  // ─── Login ──────────────────────────────────────────────────────────────────
  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password)
    logLoginEvent(result.user.uid)
    // fetchOrCreateProfile will be called by onAuthStateChanged,
    // which handles invitation repair for existing users
    return result
  }

  function logout() {
    setUserProfile(null)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    return signOut(auth)
  }

  async function refreshProfile() {
    if (!currentUser) return null
    return fetchOrCreateProfile(currentUser)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        await fetchOrCreateProfile(user)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, signup, login, logout, refreshProfile, ROLES }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
