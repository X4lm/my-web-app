import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'

export async function upsertPropertyIndex(ownerUid, propertyId, propertyName) {
  await setDoc(doc(db, 'propertyIndex', propertyId), {
    ownerUid,
    propertyName,
    updatedAt: serverTimestamp(),
  })
}

export async function lookupPropertyOwner(propertyId) {
  const snap = await getDoc(doc(db, 'propertyIndex', propertyId))
  if (snap.exists()) return snap.data()
  return null
}
