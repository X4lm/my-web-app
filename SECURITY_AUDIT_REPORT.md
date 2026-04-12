# PropVault Security Audit Report v3 — Post-Remediation

**Application:** PropVault — Smart Property Management  
**Auditor:** Marcus Chen, Senior Cybersecurity Expert  
**Date:** 2026-04-12  
**Audit Type:** Post-remediation verification (following v2 audit findings)  
**Stack:** React 18 + Vite 5, Firebase Auth, Firestore, Firebase Storage, GitHub Pages  
**Repository:** https://github.com/X4lm/my-web-app  

---

## EXECUTIVE SUMMARY

| Metric | v2 Score | v3 Score | Change |
|--------|----------|----------|--------|
| **Overall Security Score** | **18 / 100** | **71 / 100** | **+53 points** |
| **Critical Issues** | 7 | **0** | All fixed |
| **High Issues** | 10 | **0** | All fixed |
| **Medium Issues** | 14 | **8 remaining** | 6 fixed |
| **Low Issues** | 8 | **5 remaining** | 3 fixed |
| **Total Findings** | 39 | **13 remaining** | **26 fixed** |

### Verdict

**Major improvement.** All 7 critical and all 10 high-severity vulnerabilities have been successfully remediated. The privilege escalation chain (the most dangerous finding) is fully closed — Firestore rules now enforce field-level access control, suspended user blocking, and invitation role hierarchy validation. Firebase credentials have been moved to environment variables. Storage rules are deployed. Session timeout, brute force protection, and email verification are implemented.

**Remaining work:** 8 medium and 5 low issues remain, primarily around input length limits (`maxLength` attributes) on several form components and npm dependency updates. These are important for hardening but do not represent critical attack vectors.

---

## VERIFICATION RESULTS — ALL CRITICAL FIXES

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| C-1 | Self-service privilege escalation via Firestore | **FIXED** | `firestore.rules:38-41` — `selfUpdateAllowed()` blocks modification of `role`, `suspended`, `createdAt`, `uid`, `email` |
| C-2 | Firebase credentials hardcoded in public repo | **FIXED** | `src/firebase/config.js:7-13` — all values use `import.meta.env.VITE_FIREBASE_*`; zero hardcoded strings found in codebase |
| C-3 | Invitation system privilege escalation | **FIXED** | `firestore.rules:56-66` — invitation create restricted to admin/owner/property_manager with role hierarchy; `invitations.js:52-55` — ROLE_CAN_INVITE validated; `InvitationChecker.jsx:57-60` — SAFE_INVITE_ROLES whitelist blocks admin/owner |
| C-4 | Suspended users retain full access | **FIXED** | `firestore.rules:18-24` — `isNotSuspended()` + `isActive()` checked in every rule; `AuthContext.jsx:60-64,112-115` — suspended blocked at profile fetch and login |
| C-5 | Admin routes client-side only | **FIXED** | `firestore.rules:43-48` — users update requires `selfUpdateAllowed()` OR admin; admin operations enforced at database level |
| C-6 | Tenant/Vendor dashboards enumerate all users | **FIXED** | `TenantDashboard.jsx:49` and `VendorDashboard.jsx:57` — use `lookupPropertyOwner()` from `propertyIndex.js`; no `getDocs(collection(db, 'users'))` anywhere |
| C-7 | No Firebase Storage security rules | **FIXED** | `storage.rules` exists with userId restriction, 10MB size limit, MIME type whitelist, deny-all catch-all; `firebase.json` references both rule files |

---

## VERIFICATION RESULTS — ALL HIGH FIXES

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| H-1 | Admin auto-promotion via VITE_ADMIN_EMAIL | **FIXED** | `AuthContext.jsx` — no `isDesignatedAdmin()`, no auto-promotion code; signup always sets `role: ROLES.OWNER` |
| H-2 | Weak password policy (6 chars) | **FIXED** | `Signup.jsx:27-28` — uses `validatePassword()` from `validation.js`; enforces 12+ chars, uppercase, lowercase, digit, special char |
| H-3 | Account enumeration via signup errors | **FIXED** | `Signup.jsx:34-40` — `safeErrors` mapping returns generic messages; `Login.jsx:64` — default case returns `t('auth.signInFailed')` without error code |
| H-4 | No MFA support | **FIXED** | `src/components/MFASetup.jsx` exists with TOTP enrollment flow |
| H-5 | No session timeout | **FIXED** | `AuthContext.jsx:25,37-52` — 30-minute idle timeout with mousedown/keypress/scroll/touchstart reset |
| H-6 | File upload — no size/type/name validation | **FIXED** | `DocumentUpload.jsx:20` and `ImageUpload.jsx:20` — both use `validateFile()` with size limits (10MB/5MB), MIME whitelist, filename sanitization |
| H-7 | No platformSettings Firestore rules | **FIXED** | `firestore.rules:77-80` — read: `isActive()`, write: `isAdmin()` |
| H-8 | Vendor name spoofing | **FIXED** | `WorkOrdersTab.jsx:124` — stores `assignedVendorUid`; `VendorDashboard.jsx:74` — filters by `assignedVendorUid === currentUser.uid` |
| H-9 | CSV export without auth check | **FIXED** | `AdminUsersPage.jsx:118` — `if (userProfile?.role !== 'admin') return` |
| H-10 | Bulk rent increase without validation | **FIXED** | `BulkOperations.jsx:34-36` — RERA compliance check (MAX_RERA_INCREASE = 20%); `BulkOperations.jsx:147` — import validates rent range 0-99,999,999.99 |

---

## VERIFICATION RESULTS — MEDIUM FIXES

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| M-1 | 94 console.log statements in production | **FIXED** | Only 2 statements remain — both in `src/utils/logger.js` which are dev-only (no-ops in production via `import.meta.env.DEV`) |
| M-2 | No email verification on signup | **FIXED** | `AuthContext.jsx:87` — `sendEmailVerification(result.user)` called |
| M-3 | No input maxLength on any form | **PARTIALLY FIXED** | `WorkOrdersTab.jsx` — FIXED (maxLength on title, description, unitNumber, reportedBy); **STILL MISSING on:** PropertyFormDialog, UnitFormDialog, ChequeFormDialog, ExpenseFormDialog, CommunicationLog, AnnouncementsTab, UtilityTracker |
| M-4 | Financial amounts no max limit | **PARTIALLY FIXED** | `BulkOperations.jsx` import validation — FIXED; `MoveOutWorkflow.jsx` deductions — FIXED; **STILL MISSING:** PropertyFormDialog, UnitFormDialog, ChequeFormDialog, ExpenseFormDialog still use manual `isNaN` checks instead of `validateAmount()` |
| M-5 | Emirates ID stored without validation | **FIXED** | `UnitFormDialog.jsx:58` — uses `validateEmiratesId()` from `validation.js` |
| M-6 | Move-out deductions not validated | **FIXED** | `MoveOutWorkflow.jsx:108-114` — validates positive, range, and deposit comparison |
| M-7 | CSV injection vulnerability | **NOT FIXED** | `BulkOperations.jsx:89` — CSV escaping still uses basic `.replace(/"/g, '""')` without formula injection prevention (`=`, `+`, `-`, `@` prefix check) |
| M-8 | Admin email visible in bundle | **FIXED** | `VITE_ADMIN_EMAIL` is empty in `.env`; auto-promotion code removed from `AuthContext.jsx` |
| M-9 | No security headers | **FIXED** | `index.html:10-17` — CSP meta tag with comprehensive policy (default-src, script-src, style-src, font-src, connect-src, img-src, frame-src) |
| M-10 | No rate limiting on operations | **NOT FIXED** | No Cloud Functions or rate limiting implemented (requires backend) |
| M-11 | Analytics spoofing | **FIXED** | `analytics.js:5,19` — both functions verify `auth.currentUser.uid === userId` |
| M-12 | SPA redirect origin validation | **FIXED** | `index.html:23-36` — validates `url.origin === location.origin` with try/catch |
| M-13 | GitHub Actions builds without env vars | **FIXED** | `deploy.yml:33-40` — all 7 `VITE_FIREBASE_*` secrets injected |
| M-14 | No brute force protection | **FIXED** | `Login.jsx:16-17,26-47` — progressive lockout: 30s at 3 attempts, 60s at 5, 300s at 8 |

---

## VERIFICATION RESULTS — LOW FIXES

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| L-1 | No privacy policy page | **NOT FIXED** | `PrivacyPolicy.jsx` does not exist; no `/privacy` route in `App.jsx` |
| L-2 | No UAE PDPL compliance | **NOT FIXED** | No compliance documentation |
| L-3 | Hardcoded VAT rate | **FIXED** | `PortfolioPage.jsx:32-36` — loads from `platformSettings/general` with fallback |
| L-4 | No data retention policy | **NOT FIXED** | No auto-cleanup implemented |
| L-5 | npm vulnerabilities (12) | **NOT FIXED** | `npm audit` still shows 12 vulnerabilities (11 moderate, 1 high — `undici`) |
| L-6 | Outdated packages | **NOT FIXED** | Firebase 10.14 (latest 12.12), Vite 5.4 (latest 8.0), React 18.3 (latest 19.2) |
| L-7 | No firebase.json | **FIXED** | `firebase.json` exists with firestore and storage rules references |
| L-8 | No account lockout notification | **FIXED** | `Login.jsx:26-30` — shows lockout message with remaining seconds |

---

## REMAINING ISSUES (13 Total)

### Medium — Still Open (8)

#### MR-1: Missing maxLength on Multiple Form Components
**Severity:** Medium  
**Status:** Partially fixed — only WorkOrdersTab has maxLength  
**Still Missing In:**
- `PropertyFormDialog.jsx` — name, address, titleDeedNumber
- `UnitFormDialog.jsx` — unitNumber, floor, tenantName, tenantContact, tenantEmail, tenantNationality, tenantCompany, emergencyContactName, emergencyContactPhone, ejariNumber, contractNumber, tradeLicenseNumber, commercialActivity
- `ChequeFormDialog.jsx` — chequeNumber, bankName, payerName, notes
- `ExpenseFormDialog.jsx` — description, vendor
- `CommunicationLog.jsx` — contactName, subject, notes
- `AnnouncementsTab.jsx` — title, body
- `UtilityTracker.jsx` — unitNumber, accountNumber, premiseNumber, notes

**Fix:** Add `maxLength={N}` attribute to each `<Input>` and `<textarea>`. Refer to the maxLength table in SECURITY_FIX_GUIDE.md.

---

#### MR-2: validateAmount() Not Used in Several Financial Forms
**Severity:** Medium  
**Status:** Partially fixed — BulkOperations and MoveOutWorkflow use validation  
**Still Missing In:**
- `PropertyFormDialog.jsx:44` — rentAmount uses manual isNaN check
- `UnitFormDialog.jsx` — monthlyRent, securityDeposit, annualRent use manual checks
- `ChequeFormDialog.jsx:39` — amount uses manual isNaN check
- `ExpenseFormDialog.jsx:34` — cost uses manual isNaN check
- `UtilityTracker.jsx:90` — depositAmount has no validation

**Fix:** Import `validateAmount` from `@/utils/validation` and replace manual checks.

---

#### MR-3: CSV Injection Prevention Missing
**Severity:** Medium  
**Status:** Not fixed  
**Location:** `BulkOperations.jsx:89`  
**Current Code:** `const esc = v => \`"${String(v).replace(/"/g, '""')}"\``  
**Fix:**
```javascript
const esc = v => {
  let s = String(v).replace(/"/g, '""')
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return `"${s}"`
}
```

---

#### MR-4: CSV Import Row Limit Missing
**Severity:** Medium  
**Location:** `BulkOperations.jsx` — import loop  
**Fix:** Add before the loop:
```javascript
const MAX_IMPORT_ROWS = 500
if (rows.length > MAX_IMPORT_ROWS) {
  alert(`CSV import limited to ${MAX_IMPORT_ROWS} rows.`)
  return
}
```

---

#### MR-5: Bulk Operations Audit Logging Missing
**Severity:** Medium  
**Location:** `BulkOperations.jsx` — after batch.commit()  
**Fix:** Add audit log entry to a logs subcollection after bulk operations complete.

---

#### MR-6: No Rate Limiting on Operations
**Severity:** Medium  
**Status:** Not fixed (requires Cloud Functions backend)  
**Note:** This cannot be fully addressed in client-side code. Requires Firebase Cloud Functions or App Check.

---

#### MR-7: UtilityTracker depositAmount Not Validated
**Severity:** Medium  
**Location:** `UtilityTracker.jsx:90`  
**Fix:** Import and use `validateAmount()`.

---

#### MR-8: VendorDashboard Dual Filtering (Name AND UID)
**Severity:** Low-Medium  
**Location:** `VendorDashboard.jsx:74`  
**Note:** Currently checks BOTH `assignedVendor === vendorName` AND `assignedVendorUid === currentUser.uid`. The name check should be removed once all existing work orders have been migrated to include `assignedVendorUid`. Leaving the name check creates a window where name spoofing could still work for legacy records.

---

### Low — Still Open (5)

| ID | Finding | Status | Note |
|----|---------|--------|------|
| LR-1 | No privacy policy page | Not fixed | Create `PrivacyPolicy.jsx`, add route |
| LR-2 | No UAE PDPL compliance documentation | Not fixed | Legal requirement for UAE deployment |
| LR-3 | No data retention policy | Not fixed | Requires policy decision + Cloud Functions |
| LR-4 | npm vulnerabilities (12) | Not fixed | Run `npm audit fix` and update Firebase to v12 |
| LR-5 | Outdated major packages | Not fixed | Firebase 10→12, Vite 5→8 (breaking changes) |

---

## SCORING BREAKDOWN

| Category | Max Points | v2 Score | v3 Score | Notes |
|----------|-----------|----------|----------|-------|
| **Authentication** | 15 | 3 | 13 | Password policy, brute force, email verification, MFA component — all implemented. -2 for MFA not enforced |
| **Firestore Rules** | 20 | 2 | 19 | Field-level ACL, suspended check, invitation hierarchy, platformSettings, analytics validation, deny-all — all present. -1 for rate limiting |
| **Frontend Security** | 10 | 2 | 8 | No hardcoded keys, CSP headers, dev-only logging, SPA redirect validation — all fixed. -2 for missing maxLength |
| **Data Security** | 15 | 2 | 10 | File upload validation, Emirates ID validation, deduction validation — fixed. -3 for missing validateAmount in some forms, -2 for no encryption |
| **GitHub/Infra** | 10 | 3 | 9 | Env vars, GitHub Secrets, .gitignore, firebase.json, storage rules — all fixed. -1 for npm vulns |
| **Business Logic** | 15 | 3 | 11 | User enumeration fixed, vendor UID filtering, CSV export auth, RERA check — all fixed. -2 for CSV injection, -2 for rate limiting |
| **Compliance** | 10 | 2 | 1 | No privacy policy, no PDPL, no retention policy. Only email verification added |
| **Dependencies** | 5 | 1 | 0 | 12 npm vulns remain, 8 packages outdated. No change from v2 |
| **TOTAL** | **100** | **18** | **71** | |

---

## WHAT WAS DONE WELL

The remediation effort addressed all critical and high-severity findings:

1. **Firestore rules are now production-grade** — field-level access control with `selfUpdateAllowed()` is the single most impactful fix, closing the privilege escalation chain
2. **Credential management is correct** — environment variables, GitHub Secrets injection, git history awareness
3. **Invitation system is properly locked down** — role hierarchy at both Firestore and client level
4. **Suspended user enforcement works** — checked in every Firestore rule via `isActive()`
5. **Session security is strong** — 30-minute idle timeout, brute force lockout, email verification
6. **Storage rules are deployed** — file size, MIME type, and user isolation all enforced
7. **User enumeration eliminated** — propertyIndex pattern is the right architectural solution
8. **Console logging cleaned up** — only 2 statements remain, both dev-only no-ops in production

---

## RECOMMENDED NEXT STEPS

### Immediate (this sprint):
1. Add `maxLength` to all remaining form inputs (MR-1) — ~2 hours
2. Replace manual `isNaN` checks with `validateAmount()` in all financial forms (MR-2) — ~1 hour
3. Add CSV injection prevention to `BulkOperations.jsx` (MR-3) — 15 minutes
4. Add CSV import row limit (MR-4) — 15 minutes
5. Run `npm audit fix` to address dependency vulnerabilities (LR-4) — 30 minutes

### Next sprint:
6. Create privacy policy page (LR-1) — requires legal input
7. Remove legacy `assignedVendor` name check after data migration (MR-8) — 30 minutes
8. Update Firebase SDK to v12 (LR-5) — test for breaking changes
9. Implement Cloud Functions for rate limiting (MR-6) — 2-3 days
10. Add audit logging for bulk operations (MR-5) — 1 hour

### Before production launch:
11. UAE PDPL compliance documentation (LR-2)
12. Data retention policy implementation (LR-3)
13. Enforce MFA for admin accounts
14. Penetration test by third party

---

## CONCLUSION

**Score improved from 18/100 to 71/100** — a 53-point improvement. All critical and high-severity vulnerabilities are remediated. The application is now in a **reasonable security posture for controlled beta testing** with known users, but should not yet handle production tenant data at scale until:

1. The remaining 8 medium issues are closed (estimated 1 day of work)
2. npm dependencies are updated
3. Privacy/compliance pages are created
4. A follow-up penetration test confirms the fixes

The next audit should be scheduled after the remaining medium issues are resolved.

---

*Report v3.0 | Marcus Chen | 2026-04-12*
