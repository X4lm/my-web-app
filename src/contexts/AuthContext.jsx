import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
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

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || ''

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  /** Check if this user should be promoted to admin based on VITE_ADMIN_EMAIL */
  function isDesignatedAdmin(email) {
    return ADMIN_EMAIL && email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  }

  /** Fetch or create a Firestore user profile document */
  async function fetchOrCreateProfile(user) {
    if (!user) { setUserProfile(null); return null }
    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const profile = { id: snap.id, ...snap.data() }

      // Auto-promote to admin if email matches VITE_ADMIN_EMAIL and not already admin
      if (isDesignatedAdmin(user.email) && profile.role !== ROLES.ADMIN) {
        console.log('[Auth] Promoting user to admin (matches VITE_ADMIN_EMAIL)')
        await setDoc(ref, { role: ROLES.ADMIN }, { merge: true })
        profile.role = ROLES.ADMIN
      }

      setUserProfile(profile)
      return profile
    }
    // First time — create profile (should only happen via signup, but safety net)
    const role = isDesignatedAdmin(user.email) ? ROLES.ADMIN : ROLES.OWNER
    const newProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      role,
      linkedProperties: [],
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      suspended: false,
    }
    await setDoc(ref, newProfile)
    const created = { id: user.uid, ...newProfile }
    setUserProfile(created)
    return created
  }

  async function signup(email, password, displayName) {
    console.log('[Auth] Attempting signup for:', email)
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      console.log('[Auth] Account created successfully, updating profile...')
      await updateProfile(result.user, { displayName })
      console.log('[Auth] Profile updated with displayName:', displayName)

      // Create Firestore user document
      const role = isDesignatedAdmin(email) ? ROLES.ADMIN : ROLES.OWNER
      const profile = {
        uid: result.user.uid,
        email: result.user.email,
        displayName,
        role,
        linkedProperties: [],
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        suspended: false,
      }
      await setDoc(doc(db, 'users', result.user.uid), profile)
      setUserProfile({ id: result.user.uid, ...profile })
      console.log('[Auth] User profile created with role:', role)

      return result
    } catch (err) {
      console.error('[Auth] Signup failed:', err.code, err.message)
      throw err
    }
  }

  async function login(email, password) {
    console.log('[Auth] Attempting login for:', email)
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      console.log('[Auth] Login successful')

      // Log login event for analytics
      logLoginEvent(result.user.uid)

      // Update lastLogin and check for admin promotion
      const ref = doc(db, 'users', result.user.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const updates = { lastLogin: serverTimestamp() }
        const existingData = snap.data()

        // Auto-promote to admin if email matches VITE_ADMIN_EMAIL
        if (isDesignatedAdmin(email) && existingData.role !== ROLES.ADMIN) {
          console.log('[Auth] Promoting user to admin on login (matches VITE_ADMIN_EMAIL)')
          updates.role = ROLES.ADMIN
        }

        await setDoc(ref, updates, { merge: true })
        setUserProfile({
          id: snap.id,
          ...existingData,
          ...updates,
          lastLogin: new Date(),
        })
      } else {
        await fetchOrCreateProfile(result.user)
      }

      return result
    } catch (err) {
      console.error('[Auth] Login failed:', err.code, err.message)
      throw err
    }
  }

  function logout() {
    console.log('[Auth] Logging out')
    setUserProfile(null)
    return signOut(auth)
  }

  /** Reload user profile from Firestore (useful after invitation accept, role change, etc.) */
  async function refreshProfile() {
    if (!currentUser) return null
    return fetchOrCreateProfile(currentUser)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[Auth] State changed:', user ? `logged in as ${user.email}` : 'not logged in')
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
