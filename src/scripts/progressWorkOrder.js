/**
 * Dev-only: progress a work order through pending -> attended -> in_progress
 * -> completed with proper statusHistory entries (mirrors WorkOrdersTab logic).
 */
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

const CHAIN = ['open', 'attended', 'in_progress', 'completed']

/**
 * @param {object} opts
 * @param {string} opts.ownerUid  - Owner UID
 * @param {string} opts.propertyId
 * @param {string} opts.woId
 * @param {string} [opts.by]      - Actor name (defaults to current user)
 * @param {string} [opts.finalStatus] - Stop at this status; default 'completed'
 */
export async function progress({ ownerUid, propertyId, woId, by, finalStatus = 'completed' }) {
  const db = window.__db
  const auth = window.__auth
  if (!db || !auth?.currentUser) throw new Error('Sign in first.')
  const actor = by || auth.currentUser.displayName || auth.currentUser.email

  const ref = doc(db, 'users', ownerUid, 'properties', propertyId, 'workOrders', woId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Work order not found')
  const wo = snap.data()

  let current = wo.status || 'open'
  let history = wo.statusHistory || []

  const startIdx = CHAIN.indexOf(current)
  const endIdx = CHAIN.indexOf(finalStatus)
  if (startIdx < 0 || endIdx < 0) throw new Error(`Bad status: ${current} -> ${finalStatus}`)

  for (let i = startIdx; i < endIdx; i++) {
    const from = CHAIN[i], to = CHAIN[i + 1]
    history = [...history, { from, to, at: new Date().toISOString(), by: actor }]
    await updateDoc(ref, {
      status: to,
      statusHistory: history,
      updatedAt: serverTimestamp(),
    })
    console.log(`[progress] ${from} -> ${to}`)
    // tiny pause so timestamps aren't identical
    await new Promise(r => setTimeout(r, 250))
    current = to
  }
  return { final: current, historyCount: history.length }
}
