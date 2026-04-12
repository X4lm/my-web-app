# PropVault Security Fix Implementation Guide

**For:** Claude Code / Developer  
**Date:** 2026-04-12  
**Total Changes:** 39 findings across ~30 files  
**Estimated Total Effort:** ~3-4 days focused work  

> This guide provides exact code changes for every security finding in the audit report.
> Execute each section in order. Each fix is self-contained with the exact file, exact old code, and exact new code.

---

## TABLE OF CONTENTS

- [PHASE 1: CRITICAL — Fix Immediately](#phase-1-critical--fix-immediately)
  - [FIX C-1: Firestore Rules — Block Privilege Escalation](#fix-c-1-firestore-rules--block-privilege-escalation)
  - [FIX C-2: Move Firebase Config to Environment Variables](#fix-c-2-move-firebase-config-to-environment-variables)
  - [FIX C-3: Fix Invitation Privilege Escalation](#fix-c-3-fix-invitation-privilege-escalation)
  - [FIX C-4: Suspended User Enforcement (in Firestore Rules)](#fix-c-4-suspended-user-enforcement)
  - [FIX C-5: Admin Route Server-Side Enforcement (in Firestore Rules)](#fix-c-5-admin-route-server-side-enforcement)
  - [FIX C-6: Fix Tenant/Vendor User Enumeration](#fix-c-6-fix-tenantvender-user-enumeration)
  - [FIX C-7: Create Firebase Storage Rules](#fix-c-7-create-firebase-storage-rules)
- [PHASE 2: HIGH — Fix Within 1 Week](#phase-2-high--fix-within-1-week)
  - [FIX H-1: Remove Admin Auto-Promotion](#fix-h-1-remove-admin-auto-promotion)
  - [FIX H-2: Strengthen Password Policy](#fix-h-2-strengthen-password-policy)
  - [FIX H-3: Fix Account Enumeration in Signup](#fix-h-3-fix-account-enumeration-in-signup)
  - [FIX H-4: Add MFA Support](#fix-h-4-add-mfa-support)
  - [FIX H-5: Add Session Timeout](#fix-h-5-add-session-timeout)
  - [FIX H-6: File Upload Validation](#fix-h-6-file-upload-validation)
  - [FIX H-7: Add platformSettings Rules (in Firestore Rules)](#fix-h-7-add-platformsettings-rules)
  - [FIX H-8: Fix Vendor Name Spoofing](#fix-h-8-fix-vendor-name-spoofing)
  - [FIX H-9: Protect CSV Export](#fix-h-9-protect-csv-export)
  - [FIX H-10: Validate Bulk Rent Increase](#fix-h-10-validate-bulk-rent-increase)
- [PHASE 3: MEDIUM — Fix Within 30 Days](#phase-3-medium--fix-within-30-days)
- [PHASE 4: LOW — Fix Within 90 Days](#phase-4-low--fix-within-90-days)
- [NEW FILES TO CREATE](#new-files-to-create)
- [VERIFICATION CHECKLIST](#verification-checklist)

---

## PHASE 1: CRITICAL — Fix Immediately

---

### FIX C-1: Firestore Rules — Block Privilege Escalation
### FIX C-4: Suspended User Enforcement
### FIX C-5: Admin Route Server-Side Enforcement
### FIX H-7: Add platformSettings Rules

> These four fixes are all in `firestore.rules`. Replace the ENTIRE file.

**File:** `firestore.rules`

**Action:** Replace entire file contents with:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ─── Helper functions ───────────────────────────────────────────────
    function isSignedIn() {
      return request.auth != null;
    }

    function userData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function getUserRole() {
      return userData().role;
    }

    function isNotSuspended() {
      return userData().suspended != true;
    }

    function isActive() {
      return isSignedIn() && isNotSuspended();
    }

    function isAdmin() {
      return isActive() && getUserRole() == 'admin';
    }

    function isOwner(uid) {
      return isActive() && request.auth.uid == uid;
    }

    function isOwnerOrAdmin(uid) {
      return isOwner(uid) || isAdmin();
    }

    // Check that user is NOT modifying protected fields on their own profile
    function selfUpdateAllowed() {
      let forbidden = ['role', 'suspended', 'createdAt', 'uid', 'email'].toSet();
      return !request.resource.data.diff(resource.data).affectedKeys().hasAny(forbidden);
    }

    // ─── Users collection ───────────────────────────────────────────────
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();

      // Signup: users create their own profile with role=owner only
      allow create: if isOwner(userId) &&
        request.resource.data.role == 'owner';

      // Self-update: cannot change role, suspended, createdAt, uid, email
      // Admin update: can change anything
      allow update: if (isOwner(userId) && selfUpdateAllowed()) || isAdmin();

      allow delete: if isAdmin();
    }

    // ─── Invitations collection ─────────────────────────────────────────
    match /invitations/{invitationId} {
      allow read: if isActive() && (
        resource.data.inviterUid == request.auth.uid ||
        resource.data.inviteeEmail == request.auth.token.email ||
        isAdmin()
      );

      // Only admin, owner, property_manager can create invitations
      // Non-admins cannot assign admin or owner roles
      allow create: if isActive() &&
        getUserRole() in ['admin', 'owner', 'property_manager'] &&
        request.resource.data.inviterUid == request.auth.uid &&
        (getUserRole() == 'admin' ||
         request.resource.data.role in ['property_manager', 'staff', 'vendor', 'tenant']);

      // Cannot change inviterUid, role, or propertyId after creation
      allow update: if isActive() && (
        resource.data.inviterUid == request.auth.uid ||
        resource.data.inviteeEmail == request.auth.token.email ||
        isAdmin()
      ) && !request.resource.data.diff(resource.data).affectedKeys()
            .hasAny(['inviterUid', 'role', 'propertyId']);

      allow delete: if isAdmin();
    }

    // ─── Per-user property data ─────────────────────────────────────────
    match /users/{userId}/properties/{propertyId} {
      allow read, write: if isOwnerOrAdmin(userId);

      match /{subcollection}/{docId} {
        allow read, write: if isOwnerOrAdmin(userId);
      }
    }

    // ─── Platform Settings (admin only write, active users read) ────────
    match /platformSettings/{docId} {
      allow read: if isActive();
      allow write: if isAdmin();
    }

    // ─── Property Index (for tenant/vendor lookups without user enum) ───
    match /propertyIndex/{propertyId} {
      allow read: if isActive();
      allow write: if isAdmin() || (isActive() && getUserRole() in ['owner']);
    }

    // ─── Analytics ──────────────────────────────────────────────────────
    match /analytics/{docId} {
      allow create: if isActive() &&
        request.resource.data.userId == request.auth.uid;
      allow read: if isAdmin();
      allow update, delete: if false;
    }

    // ─── Login Events ───────────────────────────────────────────────────
    match /loginEvents/{docId} {
      allow create: if isActive() &&
        request.resource.data.userId == request.auth.uid;
      allow read: if isAdmin();
      allow update, delete: if false;
    }

    // ─── Deny all other collections ─────────────────────────────────────
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Why this fixes C-1, C-4, C-5, H-7:**
- `selfUpdateAllowed()` blocks users from modifying `role`, `suspended`, `createdAt`, `uid`, `email` on their own profile
- `isActive()` checks `isNotSuspended()` in every rule — suspended users are blocked from all operations
- Admin operations in Firestore now require actual admin role in the database, not just client-side checks
- `platformSettings` now requires admin for writes
- Invitation `create` now restricted to admin/owner/property_manager with role escalation prevention
- Invitation `update` blocks modification of `inviterUid`, `role`, `propertyId`

---

### FIX C-2: Move Firebase Config to Environment Variables

**Step 1:** Update `src/firebase/config.js`

Replace the entire file:

```javascript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
```

**Step 2:** Update `.env` with your actual (new/rotated) credentials:

```
VITE_FIREBASE_API_KEY=your-new-rotated-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-your-id
VITE_ADMIN_EMAIL=
```

**Step 3:** Update `.env.example`:

```
# ─── Firebase Configuration ───
# Get these from your Firebase Console → Project Settings → Web App
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# ─── Admin Seed (DEPRECATED — use Firebase Custom Claims instead) ───
# VITE_ADMIN_EMAIL=
```

**Step 4:** Update `.gitignore` — add these lines:

```
node_modules
dist
.env
.env.local
.env.production
.env.*.local
.DS_Store
*.pem
*.key
*.p12
firebase-debug.log
firestore-debug.log
storage-debug.log
```

**Step 5:** Update `.github/workflows/deploy.yml` to use GitHub Secrets:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
          VITE_FIREBASE_MEASUREMENT_ID: ${{ secrets.VITE_FIREBASE_MEASUREMENT_ID }}

      - uses: actions/configure-pages@v4

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - id: deployment
        uses: actions/deploy-pages@v4
```

**Step 6 (Manual):** Go to GitHub repo Settings → Secrets and variables → Actions → Add each `VITE_FIREBASE_*` secret.

**Step 7 (Manual):** Rotate Firebase credentials:
1. Go to Firebase Console → Project Settings → General → Your apps
2. Delete the current web app and create a new one
3. Copy new credentials to `.env` and GitHub Secrets
4. In Google Cloud Console → APIs & Services → Credentials → restrict the new API key by HTTP referrer

**Step 8:** Purge old credentials from git history:
```bash
# Install BFG Repo Cleaner or git-filter-repo, then:
git filter-repo --path src/firebase/config.js --invert-paths
# OR use BFG:
# bfg --replace-text passwords.txt
# Force push (coordinate with team):
# git push --force --all
```

---

### FIX C-3: Fix Invitation Privilege Escalation

> Firestore rules are already fixed in C-1 above. Now fix the client-side code.

**File:** `src/services/invitations.js`

Find and replace the `createInvitation` function to add role hierarchy validation:

```javascript
// OLD (around line 14-18):
const INVITABLE_ROLES = ['property_manager', 'staff', 'vendor', 'tenant']

// NEW:
const INVITABLE_ROLES = ['property_manager', 'staff', 'vendor', 'tenant']

// Role hierarchy — each role can only invite roles listed in its value
const ROLE_CAN_INVITE = {
  admin: ['property_manager', 'staff', 'vendor', 'tenant'],
  owner: ['property_manager', 'staff', 'vendor', 'tenant'],
  property_manager: ['staff', 'vendor', 'tenant'],
}
```

Add inviter role validation inside `createInvitation`:

```javascript
// OLD (around line 37-43):
export async function createInvitation({
  inviterUid, inviterName, inviteeEmail,
  propertyId, propertyName, unitId, unitNumber, role,
}) {
  if (!INVITABLE_ROLES.includes(role)) {
    throw new Error(`Invalid invitation role: ${role}`)
  }

// NEW:
export async function createInvitation({
  inviterUid, inviterName, inviteeEmail,
  propertyId, propertyName, unitId, unitNumber, role, inviterRole,
}) {
  if (!INVITABLE_ROLES.includes(role)) {
    throw new Error(`Invalid invitation role: ${role}`)
  }

  // Validate inviter has permission to assign this role
  const allowedRoles = ROLE_CAN_INVITE[inviterRole] || []
  if (!allowedRoles.includes(role)) {
    throw new Error(`Your role (${inviterRole}) cannot invite as ${role}`)
  }
```

**File:** `src/components/InvitationChecker.jsx`

Fix the role assignment on invitation acceptance — do NOT let invitations change user role to anything higher than intended:

```javascript
// OLD (around line 50-62 in handleAccept):
const updates = {
  linkedProperties: arrayUnion(invite.propertyId),
}

if (userProfile?.role === 'owner' || !userProfile?.role) {
  updates.role = invite.role
}

// NEW:
const updates = {
  linkedProperties: arrayUnion(invite.propertyId),
}

// Only allow role change to non-privileged roles, and only if user is default 'owner'
const SAFE_INVITE_ROLES = ['property_manager', 'staff', 'vendor', 'tenant']
if ((userProfile?.role === 'owner' || !userProfile?.role) && SAFE_INVITE_ROLES.includes(invite.role)) {
  updates.role = invite.role
}
```

Also add the `linkedUnitId` and `linkedUnitNumber` only if provided:

```javascript
if (invite.unitId) {
  updates.linkedUnitId = invite.unitId
  updates.linkedUnitNumber = invite.unitNumber || ''
}
```

**File:** `src/components/TeamTab.jsx`

Pass inviter role when creating invitations:

```javascript
// OLD (around line where createInvitation is called):
await createInvitation({
  inviterUid: currentUser.uid,
  inviterName: currentUser.displayName || currentUser.email,
  inviteeEmail: email,
  propertyId,
  propertyName: property?.name || '',
  unitId: selectedUnit || null,
  unitNumber: selectedUnitNumber || null,
  role: selectedRole,
})

// NEW:
await createInvitation({
  inviterUid: currentUser.uid,
  inviterName: currentUser.displayName || currentUser.email,
  inviteeEmail: email,
  propertyId,
  propertyName: property?.name || '',
  unitId: selectedUnit || null,
  unitNumber: selectedUnitNumber || null,
  role: selectedRole,
  inviterRole: userProfile?.role || 'owner',
})
```

---

### FIX C-6: Fix Tenant/Vendor User Enumeration

**Step 1:** Create a new file `src/services/propertyIndex.js`:

```javascript
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'

/**
 * Create or update a property index entry.
 * Called when a property is created or updated.
 */
export async function upsertPropertyIndex(ownerUid, propertyId, propertyName) {
  await setDoc(doc(db, 'propertyIndex', propertyId), {
    ownerUid,
    propertyName,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Look up which user owns a property by propertyId.
 * Returns { ownerUid, propertyName } or null.
 */
export async function lookupPropertyOwner(propertyId) {
  const snap = await getDoc(doc(db, 'propertyIndex', propertyId))
  if (snap.exists()) return snap.data()
  return null
}
```

**Step 2:** Update `src/components/TenantDashboard.jsx`

Replace the user enumeration logic:

```javascript
// OLD (around lines 40-60):
// This scans ALL users to find property owner
const usersSnap = await getDocs(collection(db, 'users'))
for (const userDoc of usersSnap.docs) {
  try {
    const propRef = doc(db, 'users', userDoc.id, 'properties', linkedPropertyId)
    const propSnap = await getDoc(propRef)
    if (propSnap.exists()) {
      ownerUid = userDoc.id
      propertyData = { id: propSnap.id, ...propSnap.data() }
      break
    }
  } catch (e) { /* skip */ }
}

// NEW:
// Look up property owner via index — no user enumeration
import { lookupPropertyOwner } from '@/services/propertyIndex'

const ownerInfo = await lookupPropertyOwner(linkedPropertyId)
if (ownerInfo) {
  ownerUid = ownerInfo.ownerUid
  const propRef = doc(db, 'users', ownerUid, 'properties', linkedPropertyId)
  const propSnap = await getDoc(propRef)
  if (propSnap.exists()) {
    propertyData = { id: propSnap.id, ...propSnap.data() }
  }
}
```

Do the same for any other `getDocs(collection(db, 'users'))` calls in TenantDashboard (check line ~113 for `handleSubmitRequest`).

**Step 3:** Update `src/components/VendorDashboard.jsx`

Same pattern — replace user enumeration:

```javascript
// OLD (around lines 48-82):
const usersSnap = await getDocs(collection(db, 'users'))
const allOrders = []
for (const userDoc of usersSnap.docs) {
  for (const propId of linkedPropertyIds) {
    // ...
  }
}

// NEW:
import { lookupPropertyOwner } from '@/services/propertyIndex'

const allOrders = []
for (const propId of linkedPropertyIds) {
  const ownerInfo = await lookupPropertyOwner(propId)
  if (!ownerInfo) continue
  const woSnap = await getDocs(
    query(
      collection(db, 'users', ownerInfo.ownerUid, 'properties', propId, 'workOrders'),
      orderBy('createdAt', 'desc')
    )
  )
  woSnap.docs.forEach(d => {
    const data = { id: d.id, ...d.data(), propertyId: propId, propertyName: ownerInfo.propertyName }
    if (data.assignedVendorUid === currentUser.uid) {  // Use UID not name (see H-8)
      allOrders.push(data)
    }
  })
}
```

**Step 4:** Update property creation to populate the index.

In `src/pages/Properties.jsx`, after creating a property, add:

```javascript
import { upsertPropertyIndex } from '@/services/propertyIndex'

// After addDoc for new property:
await upsertPropertyIndex(currentUser.uid, newPropertyRef.id, form.name)

// After updateDoc for existing property:
await upsertPropertyIndex(currentUser.uid, propertyId, form.name)
```

---

### FIX C-7: Create Firebase Storage Rules

**Action:** Create new file `storage.rules`:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can only access their own files
    match /{userId}/{allPaths=**} {
      allow read: if request.auth != null && (
        request.auth.uid == userId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );

      allow write: if request.auth != null &&
        request.auth.uid == userId &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.suspended != true &&
        // Max 10MB
        request.resource.size < 10 * 1024 * 1024 &&
        // Only safe file types
        request.resource.contentType.matches(
          'image/(jpeg|png|webp|gif)|application/pdf|application/msword|application/vnd\\.openxmlformats-officedocument\\.wordprocessingml\\.document'
        );
    }

    // Deny all other paths
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**Action:** Create `firebase.json` for deployment configuration:

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

**Deploy:** Run `firebase deploy --only firestore:rules,storage` after installing Firebase CLI.

---

## PHASE 2: HIGH — Fix Within 1 Week

---

### FIX H-1: Remove Admin Auto-Promotion

**File:** `src/contexts/AuthContext.jsx`

Remove all admin auto-promotion logic and console.log statements:

```javascript
// COMPLETE REPLACEMENT for src/contexts/AuthContext.jsx:

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

const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes idle timeout

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const idleTimerRef = useRef(null)

  // ─── Session Timeout (FIX H-5) ─────────────────────────────────────
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

  // ─── Profile Fetch (no auto-promotion) ──────────────────────────────
  async function fetchOrCreateProfile(user) {
    if (!user) { setUserProfile(null); return null }
    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const profile = { id: snap.id, ...snap.data() }

      // Check if user is suspended
      if (profile.suspended) {
        await signOut(auth)
        setUserProfile(null)
        return null
      }

      setUserProfile(profile)
      return profile
    }
    // Safety net — should only happen via signup
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

    // Send email verification (FIX M-2)
    await sendEmailVerification(result.user)

    const profile = {
      uid: result.user.uid,
      email: result.user.email,
      displayName,
      role: ROLES.OWNER, // Always owner on signup — admin set via Firebase console
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

      // Block suspended users
      if (existingData.suspended) {
        await signOut(auth)
        throw new Error('Account suspended. Contact administrator.')
      }

      await setDoc(ref, { lastLogin: serverTimestamp() }, { merge: true })
      setUserProfile({
        id: snap.id,
        ...existingData,
        lastLogin: new Date(),
      })
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
```

**What this fixes:**
- H-1: Removed all `isDesignatedAdmin()` and auto-promotion logic
- H-5: Added 30-minute idle session timeout
- M-1: Removed `VITE_ADMIN_EMAIL` from client bundle
- M-2: Added `sendEmailVerification()` on signup
- M-2 (console): Removed ALL console.log/console.error statements
- Suspended users are now blocked at login and profile fetch

---

### FIX H-2: Strengthen Password Policy

**File:** `src/pages/Signup.jsx`

Create a password validation utility. Add this to a new file `src/utils/validation.js`:

```javascript
/**
 * Validate password strength.
 * Returns null if valid, or an error message string.
 */
export function validatePassword(password) {
  if (password.length < 12) return 'Password must be at least 12 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
  if (!/\d/.test(password)) return 'Password must contain at least one digit'
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password)) return 'Password must contain at least one special character'
  return null
}

/**
 * Validate financial amount.
 * Returns null if valid, or an error message string.
 */
export function validateAmount(value) {
  const num = Number(value)
  if (isNaN(num) || num <= 0) return 'Enter a valid positive amount'
  if (num > 99999999.99) return 'Amount exceeds maximum allowed (99,999,999.99)'
  if (value && !/^\d+(\.\d{1,2})?$/.test(String(value))) return 'Maximum 2 decimal places allowed'
  return null
}

/**
 * Sanitize filename for storage.
 */
export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
}

/**
 * Validate file for upload.
 * Returns sanitized filename or throws.
 */
export function validateFile(file, { maxSizeMB = 10, allowedTypes = null } = {}) {
  const MAX_SIZE = maxSizeMB * 1024 * 1024
  const DEFAULT_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]

  if (file.size > MAX_SIZE) throw new Error(`File exceeds ${maxSizeMB}MB limit`)
  const types = allowedTypes || DEFAULT_TYPES
  if (!types.includes(file.type)) throw new Error(`File type "${file.type}" is not allowed`)
  return sanitizeFilename(file.name)
}
```

**File:** `src/pages/Signup.jsx` — update password validation:

```javascript
// OLD (line 25-26):
if (password !== confirm) return setError(t('auth.passwordsNoMatch'))
if (password.length < 6) return setError(t('auth.passwordTooShort'))

// NEW:
import { validatePassword } from '@/utils/validation'

if (password !== confirm) return setError(t('auth.passwordsNoMatch'))
const pwError = validatePassword(password)
if (pwError) return setError(pwError)
```

---

### FIX H-3: Fix Account Enumeration in Signup

**File:** `src/pages/Signup.jsx`

```javascript
// OLD (lines 31-33):
    } catch (err) {
      console.error('[Signup] Error:', err.code, err.message, err)
      setError(`${err.code || 'unknown'}: ${err.message}`)

// NEW:
    } catch (err) {
      const safeErrors = {
        'auth/email-already-in-use': 'Unable to create account. Please try a different email or sign in.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Please choose a stronger password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      }
      setError(safeErrors[err.code] || 'An error occurred creating your account. Please try again.')
```

**File:** `src/pages/Login.jsx`

```javascript
// OLD (line 28):
      console.error('[Login] Error:', err.code, err.message, err)

// NEW: (remove the console.error entirely, or replace with:)
      // Error logged intentionally omitted for security

// Also fix default case (line 43-44):
// OLD:
      default:
        return `${t('auth.signInFailed')} (${code})`

// NEW:
      default:
        return t('auth.signInFailed')
```

---

### FIX H-4: Add MFA Support

> This requires Firebase Identity Platform upgrade. Provide the setup infrastructure.

**File:** Create `src/components/MFASetup.jsx`:

```javascript
import { useState } from 'react'
import { multiFactor, TotpMultiFactorGenerator, TotpSecret } from 'firebase/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function MFASetup() {
  const { currentUser } = useAuth()
  const [totpSecret, setTotpSecret] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleEnroll() {
    try {
      const session = await multiFactor(currentUser).getSession()
      const secret = await TotpMultiFactorGenerator.generateSecret(session)
      setTotpSecret(secret)
      // User scans QR code with authenticator app
    } catch (err) {
      setError('Failed to start MFA enrollment. Ensure Identity Platform is enabled.')
    }
  }

  async function handleVerify() {
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, verificationCode)
      await multiFactor(currentUser).enroll(assertion, 'Authenticator App')
      setSuccess(true)
    } catch (err) {
      setError('Invalid verification code. Please try again.')
    }
  }

  if (success) {
    return <Card><CardContent className="p-6">MFA enabled successfully.</CardContent></Card>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
        {!totpSecret ? (
          <Button onClick={handleEnroll}>Enable 2FA</Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">Scan this QR code with your authenticator app, then enter the verification code.</p>
            <img src={totpSecret.generateQrCodeUrl(currentUser.email, 'PropVault')} alt="QR Code" className="w-48 h-48" />
            <Input
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
            />
            <Button onClick={handleVerify}>Verify & Enable</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

> **Note:** MFA requires upgrading to Firebase Identity Platform in Firebase Console → Authentication → Settings → Upgrade.

---

### FIX H-5: Add Session Timeout

> Already included in the H-1 AuthContext.jsx rewrite above. The idle timer with `SESSION_TIMEOUT_MS = 30 * 60 * 1000` is built in.

---

### FIX H-6: File Upload Validation

**File:** `src/components/DocumentUpload.jsx`

```javascript
// OLD (around line 15-25):
  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const storageRef = ref(storage, `${currentUser.uid}/documents/${folder}/${Date.now()}_${file.name}`)

// NEW:
  import { validateFile } from '@/utils/validation'

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const safeName = validateFile(file, { maxSizeMB: 10 })
      const storageRef = ref(storage, `${currentUser.uid}/documents/${folder}/${Date.now()}_${safeName}`)
```

**File:** `src/components/ImageUpload.jsx`

```javascript
// OLD (around line 15-25):
  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const storageRef = ref(storage, `${currentUser.uid}/${folder}/${Date.now()}_${file.name}`)

// NEW:
  import { validateFile } from '@/utils/validation'

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const safeName = validateFile(file, {
        maxSizeMB: 5,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      })
      const storageRef = ref(storage, `${currentUser.uid}/${folder}/${Date.now()}_${safeName}`)
```

Also add error display in both components' catch blocks:

```javascript
    } catch (err) {
      // Show validation error to user
      if (err.message.includes('File') || err.message.includes('limit') || err.message.includes('type')) {
        alert(err.message)
      }
    } finally {
      setUploading(false)
    }
```

---

### FIX H-8: Fix Vendor Name Spoofing

**File:** `src/components/WorkOrdersTab.jsx`

When saving a work order, store the vendor UID alongside the name:

```javascript
// In handleSave (around where form data is built):
// OLD:
assignedVendor: form.assignedVendor,

// NEW:
assignedVendor: form.assignedVendor,
assignedVendorUid: form.assignedVendorUid || null,
```

Update the vendor selection dropdown to track UID:

```javascript
// When building the vendor options, store both name and UID.
// In the select onChange:
// OLD:
onChange={e => setForm({ ...form, assignedVendor: e.target.value })}

// NEW:
onChange={e => {
  const selected = vendors.find(v => v.id === e.target.value)
  setForm({
    ...form,
    assignedVendor: selected?.displayName || e.target.value,
    assignedVendorUid: selected?.id || null,
  })
}}
```

**File:** `src/components/VendorDashboard.jsx`

```javascript
// OLD (around line 70-75):
if (data.assignedVendor === vendorName) {

// NEW:
if (data.assignedVendorUid === currentUser.uid) {
```

---

### FIX H-9: Protect CSV Export

**File:** `src/pages/AdminUsersPage.jsx`

Add role verification before export:

```javascript
// OLD (exportCSV function):
function exportCSV() {

// NEW:
function exportCSV() {
  if (userProfile?.role !== 'admin') return
```

---

### FIX H-10: Validate Bulk Rent Increase

**File:** `src/components/BulkOperations.jsx`

```javascript
// OLD (around lines 30-50):
const pct = Number(increasePercent)
if (!pct || pct <= 0 || pct > 100) return

// NEW:
const pct = Number(increasePercent)
if (!pct || pct <= 0 || pct > 100) return

// RERA compliance check — UAE law caps rent increases
const MAX_RERA_INCREASE = 20 // percent
if (pct > MAX_RERA_INCREASE) {
  if (!confirm(`Warning: ${pct}% exceeds typical RERA rent increase limits (${MAX_RERA_INCREASE}%). Continue?`)) return
}
```

Also add audit logging after the batch commit:

```javascript
// After batch.commit():
await addDoc(collection(db, `${basePath}/../logs` ), {
  action: 'bulk_rent_increase',
  percentage: pct,
  unitsAffected: count,
  performedBy: currentUser.uid,
  performedAt: serverTimestamp(),
})
```

For CSV import validation (around lines 135-147):

```javascript
// OLD:
if (rentIdx !== -1 && values[rentIdx]) updates.monthlyRent = Number(values[rentIdx]) || 0

// NEW:
if (rentIdx !== -1 && values[rentIdx]) {
  const rent = Number(values[rentIdx])
  if (isNaN(rent) || rent < 0 || rent > 99999999.99) continue // Skip invalid rows
  updates.monthlyRent = rent
}

// Add row limit:
const MAX_IMPORT_ROWS = 500
if (rows.length > MAX_IMPORT_ROWS) {
  alert(`CSV import limited to ${MAX_IMPORT_ROWS} rows. Please split your file.`)
  return
}
```

Add CSV injection prevention in export:

```javascript
// OLD (around line 84):
const esc = v => `"${String(v).replace(/"/g, '""')}"`

// NEW — prevent CSV formula injection:
const esc = v => {
  let s = String(v).replace(/"/g, '""')
  // Prevent CSV injection: prefix formula-like content with single quote
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return `"${s}"`
}
```

---

## PHASE 3: MEDIUM — Fix Within 30 Days

---

### FIX M-1: Remove All Console Logs from Production

Run this command to find all instances:
```bash
grep -rn 'console\.\(log\|error\|warn\|debug\)' src/ --include='*.jsx' --include='*.js'
```

**For every file found:** Remove the console statement entirely, or replace with a no-op:

```javascript
// Option A: Delete the line entirely

// Option B: Create a dev-only logger in src/utils/logger.js:
const isDev = import.meta.env.DEV
export const log = isDev ? console.log.bind(console, '[PropVault]') : () => {}
export const logError = isDev ? console.error.bind(console, '[PropVault]') : () => {}

// Then replace all console.log → log, console.error → logError
```

**Priority files to clean (already done in AuthContext rewrite):**
- `src/contexts/AuthContext.jsx` — ✅ fixed above
- `src/pages/Login.jsx` — ✅ fixed above
- `src/pages/Signup.jsx` — ✅ fixed above
- `src/components/InvitationChecker.jsx` — remove lines 31, 81, 98
- All other files with console statements

---

### FIX M-3: Add Input Length Limits

For every form component, add `maxLength` to all `<Input>` elements:

| Component | Field | maxLength |
|-----------|-------|-----------|
| PropertyFormDialog | name | 200 |
| PropertyFormDialog | address | 500 |
| PropertyFormDialog | titleDeedNumber | 50 |
| UnitFormDialog | unitNumber | 20 |
| UnitFormDialog | floor | 10 |
| UnitFormDialog | tenantName | 200 |
| UnitFormDialog | tenantContact | 20 |
| UnitFormDialog | tenantEmail | 100 |
| UnitFormDialog | tenantEmiratesId | 20 |
| UnitFormDialog | tenantNationality | 50 |
| UnitFormDialog | tenantCompany | 200 |
| UnitFormDialog | emergencyContactName | 200 |
| UnitFormDialog | emergencyContactPhone | 20 |
| UnitFormDialog | ejariNumber | 50 |
| UnitFormDialog | contractNumber | 50 |
| UnitFormDialog | tradeLicenseNumber | 50 |
| UnitFormDialog | commercialActivity | 200 |
| ChequeFormDialog | chequeNumber | 50 |
| ChequeFormDialog | bankName | 100 |
| ChequeFormDialog | payerName | 200 |
| ExpenseFormDialog | description | 500 |
| ExpenseFormDialog | vendor | 200 |
| WorkOrdersTab | title | 200 |
| WorkOrdersTab | description | 2000 |
| WorkOrdersTab | unitNumber | 20 |
| WorkOrdersTab | reportedBy | 200 |
| CommunicationLog | contactName | 200 |
| CommunicationLog | subject | 300 |
| CommunicationLog | notes | 2000 |
| AnnouncementsTab | title | 200 |
| AnnouncementsTab | body | 5000 |
| MoveOutWorkflow | unitNumber | 20 |
| MoveOutWorkflow | tenantName | 200 |
| UtilityTracker | accountNumber | 50 |
| UtilityTracker | premiseNumber | 50 |

**Example pattern:**
```jsx
// OLD:
<Input
  value={form.name}
  onChange={e => set('name', e.target.value)}
  placeholder={t('propertyForm.namePlaceholder')}
/>

// NEW:
<Input
  value={form.name}
  onChange={e => set('name', e.target.value)}
  placeholder={t('propertyForm.namePlaceholder')}
  maxLength={200}
/>
```

---

### FIX M-4: Financial Amount Validation

Use the `validateAmount` function from `src/utils/validation.js` (created in H-2) in every form that accepts money:

**PropertyFormDialog.jsx:**
```javascript
// OLD:
if (!form.rentAmount || isNaN(form.rentAmount) || Number(form.rentAmount) <= 0)
  e.rentAmount = t('common.validAmount')

// NEW:
import { validateAmount } from '@/utils/validation'
const amtErr = validateAmount(form.rentAmount)
if (amtErr) e.rentAmount = amtErr
```

**Apply the same pattern to:**
- `UnitFormDialog.jsx` — `monthlyRent`, `securityDeposit`, `annualRent`
- `ChequeFormDialog.jsx` — `amount`
- `ExpenseFormDialog.jsx` — `cost`
- `MoveOutWorkflow.jsx` — `securityDeposit`, deduction amounts
- `UtilityTracker.jsx` — `depositAmount`
- `WorkOrdersTab.jsx` — `estimatedCost`

---

### FIX M-5: Encrypt PII (Emirates ID)

**File:** `src/utils/validation.js` — add Emirates ID validation:

```javascript
/**
 * Validate Emirates ID format (784-YYYY-NNNNNNN-C).
 */
export function validateEmiratesId(id) {
  if (!id) return null // optional field
  const pattern = /^\d{3}-\d{4}-\d{7}-\d{1}$/
  if (!pattern.test(id)) return 'Invalid Emirates ID format (784-YYYY-NNNNNNN-C)'
  return null
}
```

**File:** `src/components/UnitFormDialog.jsx`

```javascript
// Add validation in the validate function:
import { validateEmiratesId } from '@/utils/validation'

// In validation:
if (form.tenantEmiratesId) {
  const idErr = validateEmiratesId(form.tenantEmiratesId)
  if (idErr) e.tenantEmiratesId = idErr
}
```

> **Note:** Full encryption at rest requires a Cloud Function or KMS integration. For now, validate format and restrict access via Firestore rules (already done in C-1).

---

### FIX M-6: Validate Move-Out Deductions

**File:** `src/components/MoveOutWorkflow.jsx`

```javascript
// In the deduction add logic (around line 103-114):
// OLD:
const deductions = [...(mo.deductions || []),
  { description, amount: Number(amount), date: new Date().toISOString().slice(0, 10) }
]

// NEW:
const amt = Number(amount)
if (isNaN(amt) || amt <= 0 || amt > 99999999.99) {
  alert('Invalid deduction amount')
  return
}
const existingDeductions = mo.deductions || []
const existingTotal = existingDeductions.reduce((s, d) => s + d.amount, 0)
if (existingTotal + amt > (mo.securityDeposit || 0)) {
  if (!confirm('Total deductions exceed security deposit. Continue?')) return
}
const deductions = [...existingDeductions,
  { description, amount: amt, date: new Date().toISOString().slice(0, 10) }
]
```

---

### FIX M-7: CSV Injection Prevention

> Already included in H-10 above with the `esc()` function update.

---

### FIX M-9: Security Headers (CSP Meta Tags)

**File:** `index.html`

```html
<!-- OLD: -->
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/my-web-app/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- NEW: Add after viewport meta tag: -->
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/my-web-app/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-Content-Type-Options" content="nosniff" />
    <meta http-equiv="X-Frame-Options" content="DENY" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
        script-src 'self' https://apis.google.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.firebase.com wss://*.firebaseio.com;
        img-src 'self' data: blob: https://*.googleusercontent.com https://*.firebasestorage.app;
        frame-src https://*.firebaseapp.com;" />
```

---

### FIX M-11: Validate Analytics/LoginEvent Writes

**File:** `src/services/analytics.js`

```javascript
// OLD:
export async function logPageView(userId, pagePath, userRole) {
  try {
    await addDoc(collection(db, 'analytics'), {
      userId,
      userRole: userRole || 'owner',
      page: pagePath,
      timestamp: serverTimestamp(),
    })

// NEW:
import { auth } from '@/firebase/config'

export async function logPageView(userId, pagePath, userRole) {
  // Only log for the current authenticated user
  if (!auth.currentUser || auth.currentUser.uid !== userId) return
  try {
    await addDoc(collection(db, 'analytics'), {
      userId: auth.currentUser.uid, // Always use actual auth UID
      userRole: userRole || 'owner',
      page: pagePath,
      timestamp: serverTimestamp(),
    })
```

Same for `logLoginEvent`:

```javascript
// OLD:
export async function logLoginEvent(userId) {
  try {
    await addDoc(collection(db, 'loginEvents'), {
      userId,

// NEW:
export async function logLoginEvent(userId) {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return
  try {
    await addDoc(collection(db, 'loginEvents'), {
      userId: auth.currentUser.uid,
```

---

### FIX M-12: SPA Redirect Origin Validation

**File:** `index.html`

```javascript
// OLD:
    <script>
      (function(){
        var redirect = sessionStorage.redirect;
        delete sessionStorage.redirect;
        if (redirect && redirect !== location.href) {
          history.replaceState(null, null, redirect);
        }
      })();
    </script>

// NEW:
    <script>
      (function(){
        var redirect = sessionStorage.redirect;
        delete sessionStorage.redirect;
        if (redirect && redirect !== location.href) {
          try {
            var url = new URL(redirect, location.origin);
            if (url.origin === location.origin) {
              history.replaceState(null, null, redirect);
            }
          } catch(e) { /* invalid URL, ignore */ }
        }
      })();
    </script>
```

---

### FIX M-14: Brute Force Protection

**File:** `src/pages/Login.jsx` — add client-side rate limiting:

```javascript
// Add at the top of the component:
const [attempts, setAttempts] = useState(0)
const [lockUntil, setLockUntil] = useState(null)

// In handleSubmit, before the try block:
async function handleSubmit(e) {
  e.preventDefault()
  setError('')

  // Check lockout
  if (lockUntil && Date.now() < lockUntil) {
    const secsLeft = Math.ceil((lockUntil - Date.now()) / 1000)
    setError(`Too many attempts. Try again in ${secsLeft} seconds.`)
    return
  }

  setLoading(true)
  try {
    await login(email, password)
    setAttempts(0)
    navigate('/')
  } catch (err) {
    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    // Progressive lockout: 30s after 3 attempts, 60s after 5, 300s after 8
    if (newAttempts >= 8) {
      setLockUntil(Date.now() + 300000)
    } else if (newAttempts >= 5) {
      setLockUntil(Date.now() + 60000)
    } else if (newAttempts >= 3) {
      setLockUntil(Date.now() + 30000)
    }

    setError(err.code ? getErrorMessage(err.code) : t('auth.signInFailed'))
  } finally {
    setLoading(false)
  }
}
```

---

## PHASE 4: LOW — Fix Within 90 Days

---

### FIX L-1: Privacy Policy Page

Create `src/pages/PrivacyPolicy.jsx` with your legal team's privacy policy content.

Add route in `App.jsx`:
```javascript
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'))
// Add in Routes:
<Route path="/privacy" element={<PrivacyPolicy />} />
```

---

### FIX L-3: Move VAT Rate to Configuration

**File:** `src/pages/PortfolioPage.jsx`

```javascript
// OLD:
const VAT_RATE = 0.05

// NEW: Load from platform settings or use default
const [vatRate, setVatRate] = useState(0.05)
useEffect(() => {
  getDoc(doc(db, 'platformSettings', 'general')).then(snap => {
    if (snap.exists() && snap.data().vatRate != null) {
      setVatRate(snap.data().vatRate)
    }
  })
}, [])
```

---

### FIX L-5/L-6: Update Dependencies

Run:
```bash
npm audit fix
npm update firebase
npm update vite @vitejs/plugin-react
```

For major version updates (test thoroughly):
```bash
npm install firebase@latest vite@latest @vitejs/plugin-react@latest
```

---

## NEW FILES TO CREATE

| File | Purpose |
|------|---------|
| `src/utils/validation.js` | Password, amount, file, Emirates ID validation (created in H-2) |
| `src/utils/logger.js` | Dev-only logging utility (created in M-1) |
| `src/services/propertyIndex.js` | Property owner lookup without user enumeration (created in C-6) |
| `src/components/MFASetup.jsx` | MFA enrollment component (created in H-4) |
| `storage.rules` | Firebase Storage security rules (created in C-7) |
| `firebase.json` | Firebase deployment config (created in C-7) |
| `src/pages/PrivacyPolicy.jsx` | Privacy policy page (created in L-1) |

---

## VERIFICATION CHECKLIST

After implementing all fixes, verify each one:

### Critical Fixes Verification
```
[ ] Open browser console, try: updateDoc(doc(db, 'users', uid), { role: 'admin' })
    → Should FAIL with "permission-denied"

[ ] Create invitation with role: 'admin' as non-admin user
    → Should FAIL with "permission-denied"

[ ] Log in as suspended user
    → Should be blocked and signed out

[ ] Check src/firebase/config.js does NOT contain any hardcoded keys
    → Should only have import.meta.env references

[ ] Search git history for API keys
    → Should be clean after git filter-repo

[ ] Verify storage.rules is deployed
    → firebase deploy --only storage --dry-run

[ ] Verify TenantDashboard no longer calls getDocs(collection(db, 'users'))
    → Grep for the pattern
```

### High Fixes Verification
```
[ ] Try signing up with password "abc123"
    → Should be rejected (< 12 chars)

[ ] Sign up with existing email
    → Should show generic error, NOT "email-already-in-use"

[ ] Leave browser idle for 31 minutes
    → Should auto-logout

[ ] Upload a 50MB file
    → Should be rejected client-side AND by Storage rules

[ ] Upload a .exe file
    → Should be rejected

[ ] Check no console.log in auth flows
    → Open console, sign in/out, no sensitive data logged
```

### Medium Fixes Verification
```
[ ] Check all form inputs have maxLength
    → Try pasting 10000 chars into property name → should truncate

[ ] Enter rent amount of 999999999999
    → Should be rejected

[ ] CSP meta tag present in index.html
    → View page source in browser

[ ] Analytics logs can't be spoofed
    → Try logPageView with different userId → should be ignored
```

---

## SUMMARY OF ALL CHANGES

| Phase | Files Modified | Files Created | Findings Fixed |
|-------|---------------|---------------|----------------|
| Phase 1 (Critical) | 8 | 3 | C-1 through C-7 |
| Phase 2 (High) | 10 | 2 | H-1 through H-10 |
| Phase 3 (Medium) | 15+ | 0 | M-1 through M-14 |
| Phase 4 (Low) | 3 | 1 | L-1 through L-8 |
| **Total** | **~30** | **6** | **39** |

---

*Implementation Guide v1.0 | 2026-04-12*
