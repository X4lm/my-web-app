/**
 * One-time migration script: Backfill assignedVendorUid on work orders.
 *
 * Run from the browser console or a dedicated admin page.
 * Matches work orders' assignedVendor (display name) to vendor users
 * in the users collection, then writes the UID.
 *
 * Usage (from admin page or console):
 *   import { migrateVendorUids } from '@/scripts/migrateVendorUids'
 *   const result = await migrateVendorUids()
 *   console.log(result)
 */
import {
  collection, getDocs, query, where, doc, writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase/config'

export async function migrateVendorUids() {
  const results = { scanned: 0, updated: 0, skipped: 0, errors: [] }

  // 1. Build a map of vendor display names → UIDs from the users collection
  const usersSnap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'vendor'))
  )
  const vendorNameToUid = {}
  usersSnap.docs.forEach(d => {
    const data = d.data()
    const name = (data.displayName || '').trim().toLowerCase()
    if (name) vendorNameToUid[name] = d.id
  })

  if (Object.keys(vendorNameToUid).length === 0) {
    return { ...results, message: 'No vendor users found. Nothing to migrate.' }
  }

  // 2. Iterate all property owners and their work orders
  const allUsersSnap = await getDocs(collection(db, 'users'))

  for (const userDoc of allUsersSnap.docs) {
    const userData = userDoc.data()
    if (!['admin', 'owner'].includes(userData.role)) continue

    let propsSnap
    try {
      propsSnap = await getDocs(collection(db, 'users', userDoc.id, 'properties'))
    } catch { continue }

    for (const propDoc of propsSnap.docs) {
      let woSnap
      try {
        woSnap = await getDocs(
          collection(db, 'users', userDoc.id, 'properties', propDoc.id, 'workOrders')
        )
      } catch { continue }

      const batch = writeBatch(db)
      let batchCount = 0

      for (const woDoc of woSnap.docs) {
        results.scanned++
        const data = woDoc.data()

        // Skip if already has a UID
        if (data.assignedVendorUid) {
          results.skipped++
          continue
        }

        // Skip if no vendor assigned
        if (!data.assignedVendor) {
          results.skipped++
          continue
        }

        // Match by name
        const vendorNameLower = data.assignedVendor.trim().toLowerCase()
        const matchedUid = vendorNameToUid[vendorNameLower]

        if (matchedUid) {
          const woRef = doc(
            db, 'users', userDoc.id, 'properties', propDoc.id, 'workOrders', woDoc.id
          )
          batch.update(woRef, { assignedVendorUid: matchedUid })
          batchCount++
          results.updated++
        } else {
          results.skipped++
        }

        // Firestore batch limit is 500
        if (batchCount >= 450) {
          await batch.commit()
          batchCount = 0
        }
      }

      if (batchCount > 0) {
        try {
          await batch.commit()
        } catch (err) {
          results.errors.push(`Batch commit failed for property ${propDoc.id}: ${err.message}`)
        }
      }
    }
  }

  results.message = `Migration complete. Scanned: ${results.scanned}, Updated: ${results.updated}, Skipped: ${results.skipped}`
  return results
}
