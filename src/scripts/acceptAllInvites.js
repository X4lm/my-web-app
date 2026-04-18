/**
 * Dev-only helper — accepts ALL pending invitations for the currently
 * signed-in user and adds the linked properties to their user profile.
 * Bypasses the InvitationChecker modal when you just want to populate
 * linkedProperties quickly during testing.
 */
import {
  collection, getDocs, query, where,
  doc, updateDoc, arrayUnion, serverTimestamp,
} from 'firebase/firestore'

export async function acceptAll() {
  const db = window.__db
  const auth = window.__auth
  if (!db || !auth?.currentUser) throw new Error('Sign in first.')

  const user = auth.currentUser
  const invSnap = await getDocs(query(
    collection(db, 'invitations'),
    where('inviteeEmail', '==', user.email.toLowerCase()),
    where('status', '==', 'pending'),
  ))

  const propIds = []
  for (const d of invSnap.docs) {
    const inv = d.data()
    await updateDoc(doc(db, 'invitations', d.id), {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
    })
    if (inv.propertyId && !propIds.includes(inv.propertyId)) propIds.push(inv.propertyId)
  }

  if (propIds.length) {
    await updateDoc(doc(db, 'users', user.uid), {
      linkedProperties: arrayUnion(...propIds),
      lastLogin: serverTimestamp(),
    })
  }

  return { accepted: invSnap.size, linkedProperties: propIds }
}
