import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'

/**
 * Log a page view to the analytics collection
 * @param {string} userId
 * @param {string} userRole
 * @param {string} pagePath - e.g. '/dashboard', '/properties/abc123'
 */
export async function logPageView(userId, userRole, pagePath) {
  if (!userId) return
  try {
    await addDoc(collection(db, 'analytics'), {
      userId,
      userRole: userRole || 'owner',
      page: pagePath,
      timestamp: serverTimestamp(),
    })
  } catch (err) {
    // Silently fail — analytics should never break the app
    console.debug('[Analytics] Page view log error:', err.message)
  }
}

/**
 * Log a login event to the loginEvents collection
 * @param {string} userId
 */
export async function logLoginEvent(userId) {
  if (!userId) return
  try {
    await addDoc(collection(db, 'loginEvents'), {
      userId,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent || '',
    })
  } catch (err) {
    console.debug('[Analytics] Login event log error:', err.message)
  }
}
