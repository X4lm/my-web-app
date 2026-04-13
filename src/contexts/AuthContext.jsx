import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth'
import { doc, getDoc, setDoc, getDocs, updateDoc, collection, query, where, arrayUnion, serverTimestamp } from 'firebase/firestore'
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

const SESSION_TIMEOUT_MS = 30 * 60 * 1000

export function useAuth() {
  return useContext(AuthContext)
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

  async function fetchOrCreateProfile(user) {
    if (!user) { setUserProfile(null); return null }
    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const profile = { id: snap.id, ...snap.data() }
      if (profile.suspended) {
        await signOut(auth)
        setUserProfile(null)
        return null
      }
      setUserProfile(profile)
      return profile
    }

    // New user — check for pending invitations before creating profile
    let role = ROLES.OWNER
    let linkedProperties = []
    let extras = {}

    try {
      const inviteQ = query(
        collection(db, 'invitations'),
        where('inviteeEmail', '==', user.email.toLowerCase()),
        where('status', '==', 'pending'),
      )
      const inviteSnap = await getDocs(inviteQ)

      if (!inviteSnap.empty) {
        const SAFE_ROLES = ['property_manager', 'staff', 'vendor', 'tenant']
        const ROLE_PRIORITY = { property_manager: 1, staff: 2, vendor: 3, tenant: 4 }

        for (const invDoc of inviteSnap.docs) {
          const inv = invDoc.data()
          if (inv.propertyId && !linkedProperties.includes(inv.propertyId)) {
            linkedProperties.push(inv.propertyId)
          }
          if (SAFE_ROLES.includes(inv.role)) {
            if (role === ROLES.OWNER || (ROLE_PRIORITY[inv.role] || 99) < (ROLE_PRIORITY[role] || 99)) {
              role = inv.role
            }
          }
          if (inv.role === 'tenant' && inv.unitId && !extras.linkedUnitId) {
            extras.linkedUnitId = inv.unitId
            extras.linkedUnitNumber = inv.unitNumber || null
          }
          await updateDoc(doc(db, 'invitations', invDoc.id), {
            status: 'accepted',
            acceptedAt: serverTimestamp(),
          })
        }
      }
    } catch (err) {
      console.warn('Auto-invitation check failed:', err)
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

  async function signup(email, password, displayName) {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName })
    await sendEmailVerification(result.user)

    // Check for pending invitations for this email
    let role = ROLES.OWNER
    let linkedProperties = []
    let linkedUnitId = null
    let linkedUnitNumber = null

    try {
      const inviteQ = query(
        collection(db, 'invitations'),
        where('inviteeEmail', '==', email.toLowerCase()),
        where('status', '==', 'pending'),
      )
      const inviteSnap = await getDocs(inviteQ)

      if (!inviteSnap.empty) {
        // Auto-accept all pending invitations
        const SAFE_ROLES = ['property_manager', 'staff', 'vendor', 'tenant']
        const ROLE_PRIORITY = { property_manager: 1, staff: 2, vendor: 3, tenant: 4 }

        for (const invDoc of inviteSnap.docs) {
          const inv = invDoc.data()

          // Add property to linked list
          if (inv.propertyId && !linkedProperties.includes(inv.propertyId)) {
            linkedProperties.push(inv.propertyId)
          }

          // Use the highest-priority role from all invitations
          if (SAFE_ROLES.includes(inv.role)) {
            if (role === ROLES.OWNER || (ROLE_PRIORITY[inv.role] || 99) < (ROLE_PRIORITY[role] || 99)) {
              role = inv.role
            }
          }

          // Store tenant unit info from the first tenant invitation
          if (inv.role === 'tenant' && inv.unitId && !linkedUnitId) {
            linkedUnitId = inv.unitId
            linkedUnitNumber = inv.unitNumber || null
          }

          // Mark invitation as accepted
          await updateDoc(doc(db, 'invitations', invDoc.id), {
            status: 'accepted',
            acceptedAt: serverTimestamp(),
          })
        }
      }
    } catch (err) {
      // If invitation check fails, default to owner — InvitationChecker is backup
      console.warn('Auto-invitation check failed:', err)
    }

    const profile = {
      uid: result.user.uid,
      email: result.user.email,
      displayName,
      role,
      linkedProperties,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      suspended: false,
    }
    if (linkedUnitId) {
      profile.linkedUnitId = linkedUnitId
      profile.linkedUnitNumber = linkedUnitNumber
    }
    await setDoc(doc(db, 'users', result.user.uid), profile)
    setUserProfile({ id: result.user.uid, ...profile })
    return result
  }

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password)
    logLoginEvent(result.user.uid)

    const ref = doc(db, 'users', result.user.uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const existingData = snap.data()
      if (existingData.suspended) {
        await signOut(auth)
        throw new Error('Account suspended. Contact administrator.')
      }

      // If user is still 'owner' with no properties, check for pending/accepted invitations
      // This catches users who signed up but the invitation wasn't applied properly
      const hasNoProperties = !existingData.linkedProperties || existingData.linkedProperties.length === 0
      if (existingData.role === 'owner' && hasNoProperties) {
        try {
          const inviteQ = query(
            collection(db, 'invitations'),
            where('inviteeEmail', '==', email.toLowerCase()),
            where('status', 'in', ['pending', 'accepted']),
          )
          const inviteSnap = await getDocs(inviteQ)
          if (!inviteSnap.empty) {
            const SAFE_ROLES = ['property_manager', 'staff', 'vendor', 'tenant']
            const ROLE_PRIORITY = { property_manager: 1, staff: 2, vendor: 3, tenant: 4 }
            let newRole = 'owner'
            const newLinked = []
            const extras = {}

            for (const invDoc of inviteSnap.docs) {
              const inv = invDoc.data()
              if (inv.propertyId && !newLinked.includes(inv.propertyId)) {
                newLinked.push(inv.propertyId)
              }
              if (SAFE_ROLES.includes(inv.role)) {
                if (newRole === 'owner' || (ROLE_PRIORITY[inv.role] || 99) < (ROLE_PRIORITY[newRole] || 99)) {
                  newRole = inv.role
                }
              }
              if (inv.role === 'tenant' && inv.unitId && !extras.linkedUnitId) {
                extras.linkedUnitId = inv.unitId
                extras.linkedUnitNumber = inv.unitNumber || null
              }
              // Mark pending ones as accepted
              if (inv.status === 'pending') {
                await updateDoc(doc(db, 'invitations', invDoc.id), {
                  status: 'accepted',
                  acceptedAt: serverTimestamp(),
                })
              }
            }

            if (newRole !== 'owner' && newLinked.length > 0) {
              const updates = { role: newRole, linkedProperties: newLinked, lastLogin: serverTimestamp(), ...extras }
              await updateDoc(ref, updates)
              setUserProfile({ id: snap.id, ...existingData, ...updates, lastLogin: new Date() })
              return result
            }
          }
        } catch (err) {
          console.warn('Login invitation repair failed:', err)
        }
      }

      await setDoc(ref, { lastLogin: serverTimestamp() }, { merge: true })
      setUserProfile({ id: snap.id, ...existingData, lastLogin: new Date() })
    } else {
      await fetchOrCreateProfile(result.user)
    }
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
