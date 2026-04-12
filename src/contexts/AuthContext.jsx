import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
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
    const newProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      role: ROLES.OWNER,
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
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName })
    await sendEmailVerification(result.user)

    const profile = {
      uid: result.user.uid,
      email: result.user.email,
      displayName,
      role: ROLES.OWNER,
      linkedProperties: [],
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      suspended: false,
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
