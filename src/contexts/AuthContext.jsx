import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase/config'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function signup(email, password, displayName) {
    console.log('[Auth] Attempting signup for:', email)
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      console.log('[Auth] Account created successfully, updating profile...')
      await updateProfile(result.user, { displayName })
      console.log('[Auth] Profile updated with displayName:', displayName)
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
      return result
    } catch (err) {
      console.error('[Auth] Login failed:', err.code, err.message)
      throw err
    }
  }

  function logout() {
    console.log('[Auth] Logging out')
    return signOut(auth)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('[Auth] State changed:', user ? `logged in as ${user.email}` : 'not logged in')
      setCurrentUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ currentUser, signup, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
