import {
  doc, collection, addDoc, getDoc, setDoc, updateDoc,
  query, orderBy, onSnapshot, serverTimestamp, increment,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'

/**
 * Data model
 *
 * supportChats/{userId}                   — one thread per non-admin user
 *   userId, userEmail, userName, userRole
 *   lastMessage, lastMessageAt, lastMessageFrom ('user' | 'admin')
 *   unreadForUser, unreadForAdmin
 *   createdAt
 *
 * supportChats/{userId}/messages/{msgId}
 *   text, from ('user' | 'admin')
 *   senderUid, senderName
 *   createdAt
 */

// ─── User-side ────────────────────────────────────────────────────────────────

/** Subscribe to the user's own thread doc (for unread badge + metadata). */
export function listenToMyThread(uid, onData) {
  return onSnapshot(
    doc(db, 'supportChats', uid),
    snap => onData(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    err => logError('[supportChat] listenToMyThread:', err)
  )
}

/** Subscribe to messages in a thread (asc by createdAt). */
export function listenToMessages(uid, onData) {
  return onSnapshot(
    query(collection(db, 'supportChats', uid, 'messages'), orderBy('createdAt', 'asc')),
    snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => logError('[supportChat] listenToMessages:', err)
  )
}

/** Send a message from a non-admin user. Creates the thread doc on first message. */
export async function sendUserMessage({ uid, email, displayName, role, text }) {
  const trimmed = text.trim()
  if (!trimmed) return

  // Write the message first — if this fails we don't leave a stale thread header.
  await addDoc(collection(db, 'supportChats', uid, 'messages'), {
    text: trimmed,
    from: 'user',
    senderUid: uid,
    senderName: displayName || email || '',
    createdAt: serverTimestamp(),
  })

  const threadRef = doc(db, 'supportChats', uid)
  const existing = await getDoc(threadRef)

  if (!existing.exists()) {
    await setDoc(threadRef, {
      userId: uid,
      userEmail: email || '',
      userName: displayName || '',
      userRole: role || 'owner',
      lastMessage: trimmed,
      lastMessageAt: serverTimestamp(),
      lastMessageFrom: 'user',
      unreadForUser: 0,
      unreadForAdmin: 1,
      createdAt: serverTimestamp(),
    })
  } else {
    await updateDoc(threadRef, {
      lastMessage: trimmed,
      lastMessageAt: serverTimestamp(),
      lastMessageFrom: 'user',
      unreadForAdmin: increment(1),
      unreadForUser: 0,
    })
  }
}

/** User marks their thread as read (call when chat dropdown opens or new msg arrives while open). */
export async function markReadByUser(uid) {
  const threadRef = doc(db, 'supportChats', uid)
  const snap = await getDoc(threadRef)
  if (!snap.exists()) return
  if (snap.data().unreadForUser === 0) return
  await updateDoc(threadRef, { unreadForUser: 0 })
}

// ─── Admin-side ───────────────────────────────────────────────────────────────

/** Subscribe to all threads (admin only). */
export function listenToAllThreads(onData) {
  return onSnapshot(
    query(collection(db, 'supportChats'), orderBy('lastMessageAt', 'desc')),
    snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => logError('[supportChat] listenToAllThreads:', err)
  )
}

/** Admin sends a reply into a specific user's thread. */
export async function sendAdminMessage({ userId, adminUid, adminName, text }) {
  const trimmed = text.trim()
  if (!trimmed) return

  await addDoc(collection(db, 'supportChats', userId, 'messages'), {
    text: trimmed,
    from: 'admin',
    senderUid: adminUid,
    senderName: adminName || 'Support',
    createdAt: serverTimestamp(),
  })

  const threadRef = doc(db, 'supportChats', userId)
  await updateDoc(threadRef, {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
    lastMessageFrom: 'admin',
    unreadForUser: increment(1),
    unreadForAdmin: 0,
  })
}

/** Admin marks a thread as read. */
export async function markReadByAdmin(userId) {
  const threadRef = doc(db, 'supportChats', userId)
  const snap = await getDoc(threadRef)
  if (!snap.exists()) return
  if (snap.data().unreadForAdmin === 0) return
  await updateDoc(threadRef, { unreadForAdmin: 0 })
}
