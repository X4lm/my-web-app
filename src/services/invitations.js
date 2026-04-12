import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'

/**
 * Invitation statuses
 */
export const INVITE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  REVOKED: 'revoked',
}

/**
 * Roles that can be invited (excludes admin & owner — those are set at signup)
 */
export const INVITABLE_ROLES = ['property_manager', 'staff', 'vendor', 'tenant']

const ROLE_CAN_INVITE = {
  admin: ['property_manager', 'staff', 'vendor', 'tenant'],
  owner: ['property_manager', 'staff', 'vendor', 'tenant'],
  property_manager: ['staff', 'vendor', 'tenant'],
}

// ─── Create ────────────────────────────────────────────────────────────────────

/**
 * Create a new invitation
 * @param {Object} params
 * @param {string} params.inviterUid - UID of the person sending the invite
 * @param {string} params.inviterName - Display name of inviter
 * @param {string} params.inviteeEmail - Email of person being invited
 * @param {string} params.propertyId - Property ID
 * @param {string} params.propertyName - Property name (denormalized for display)
 * @param {string} [params.unitId] - Unit ID (only for tenant invites)
 * @param {string} [params.unitNumber] - Unit number label (denormalized)
 * @param {string} params.role - Role to assign (property_manager/staff/vendor/tenant)
 * @param {string} params.inviterRole - Role of the person sending the invite
 * @returns {Promise<string>} - The new invitation document ID
 */
export async function createInvitation({
  inviterUid, inviterName, inviteeEmail,
  propertyId, propertyName, unitId, unitNumber, role, inviterRole,
}) {
  if (!INVITABLE_ROLES.includes(role)) {
    throw new Error(`Invalid invitation role: ${role}`)
  }

  const allowedRoles = ROLE_CAN_INVITE[inviterRole] || []
  if (!allowedRoles.includes(role)) {
    throw new Error(`Your role (${inviterRole}) cannot invite as ${role}`)
  }

  // Check for existing pending invitation for same email + property + role
  const existing = await getDocs(
    query(
      collection(db, 'invitations'),
      where('inviteeEmail', '==', inviteeEmail.toLowerCase()),
      where('propertyId', '==', propertyId),
      where('role', '==', role),
      where('status', '==', INVITE_STATUS.PENDING),
    )
  )
  if (!existing.empty) {
    throw new Error('DUPLICATE_INVITE')
  }

  const invitation = {
    inviterUid,
    inviterName,
    inviteeEmail: inviteeEmail.toLowerCase(),
    propertyId,
    propertyName,
    unitId: unitId || null,
    unitNumber: unitNumber || null,
    role,
    status: INVITE_STATUS.PENDING,
    createdAt: serverTimestamp(),
    acceptedAt: null,
    declinedAt: null,
  }

  const docRef = await addDoc(collection(db, 'invitations'), invitation)
  return docRef.id
}

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Get all invitations for a specific property
 */
export async function getPropertyInvitations(propertyId) {
  const q = query(
    collection(db, 'invitations'),
    where('propertyId', '==', propertyId),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Get all pending invitations for a given email
 */
export async function getPendingInvitationsForEmail(email) {
  const q = query(
    collection(db, 'invitations'),
    where('inviteeEmail', '==', email.toLowerCase()),
    where('status', '==', INVITE_STATUS.PENDING),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Get all invitations sent by a specific user
 */
export async function getInvitationsBySender(uid) {
  const q = query(
    collection(db, 'invitations'),
    where('inviterUid', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Get a single invitation by ID
 */
export async function getInvitation(invitationId) {
  const snap = await getDoc(doc(db, 'invitations', invitationId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

// ─── Update ────────────────────────────────────────────────────────────────────

/**
 * Accept an invitation — updates status + timestamps
 * Caller is responsible for updating user profile (role, linkedProperties)
 */
export async function acceptInvitation(invitationId) {
  const ref = doc(db, 'invitations', invitationId)
  await updateDoc(ref, {
    status: INVITE_STATUS.ACCEPTED,
    acceptedAt: serverTimestamp(),
  })
}

/**
 * Decline an invitation
 */
export async function declineInvitation(invitationId) {
  const ref = doc(db, 'invitations', invitationId)
  await updateDoc(ref, {
    status: INVITE_STATUS.DECLINED,
    declinedAt: serverTimestamp(),
  })
}

/**
 * Revoke an invitation (by inviter, owner, or admin)
 */
export async function revokeInvitation(invitationId) {
  const ref = doc(db, 'invitations', invitationId)
  await updateDoc(ref, {
    status: INVITE_STATUS.REVOKED,
  })
}

// ─── Admin ─────────────────────────────────────────────────────────────────────

/**
 * Get ALL invitations platform-wide (admin only — no server-side enforcement in client SDK)
 */
export async function getAllInvitations() {
  const q = query(
    collection(db, 'invitations'),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
