import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '@/firebase/config'

export async function logPageView(userId, userRole, pagePath) {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return
  try {
    await addDoc(collection(db, 'analytics'), {
      userId: auth.currentUser.uid,
      userRole: userRole || 'owner',
      page: pagePath,
      timestamp: serverTimestamp(),
    })
  } catch {
    // Silently fail — analytics should never break the app
  }
}

export async function logLoginEvent(userId) {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return
  try {
    await addDoc(collection(db, 'loginEvents'), {
      userId: auth.currentUser.uid,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent || '',
    })
  } catch {
    // Silently fail
  }
}
