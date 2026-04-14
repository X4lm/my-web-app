/**
 * Role-Based Access Control (RBAC) Permission System
 *
 * Roles (highest to lowest privilege):
 *   admin > owner > property_manager > staff > vendor > tenant
 *
 * Features are grouped by area. Each role has a set of features it can access/edit.
 */

// ─── Feature keys ──────────────────────────────────────────────────────────────

export const FEATURES = {
  // Navigation / pages
  DASHBOARD:        'dashboard',
  PROPERTIES:       'properties',
  PROPERTY_DETAIL:  'property_detail',
  ALERTS:           'alerts',
  LOGS:             'logs',
  TEAM:             'team',
  TENANTS:          'tenants',
  MESSAGES:         'messages',
  CHEQUES:          'cheques',
  PORTFOLIO:        'portfolio',
  SETTINGS:         'settings',
  ADMIN:            'admin',
  ADMIN_USERS:      'admin_users',
  ADMIN_ANALYTICS:  'admin_analytics',
  ADMIN_SETTINGS:   'admin_settings',
  ADMIN_SUPPORT_CHAT: 'admin_support_chat',

  // Property detail tabs
  TAB_OVERVIEW:       'tab_overview',
  TAB_UNITS:          'tab_units',
  TAB_MAINTENANCE:    'tab_maintenance',
  TAB_WORK_ORDERS:    'tab_work_orders',
  TAB_FINANCIALS:     'tab_financials',
  TAB_INSPECTION:     'tab_inspection',
  TAB_COMMS:          'tab_comms',
  TAB_ANNOUNCEMENTS:  'tab_announcements',
  TAB_DOCUMENTS:      'tab_documents',
  TAB_UTILITIES:      'tab_utilities',
  TAB_MOVE_OUT:       'tab_move_out',
  TAB_BULK_OPS:       'tab_bulk_ops',
  TAB_REPORTS:        'tab_reports',
  TAB_TEAM:           'tab_team',
  TAB_LOGS:           'tab_logs',
  TAB_3D_MODEL:       'tab_3d_model',

  // Actions
  ADD_PROPERTY:       'add_property',
  EDIT_PROPERTY:      'edit_property',
  DELETE_PROPERTY:    'delete_property',
  ADD_UNIT:           'add_unit',
  EDIT_UNIT:          'edit_unit',
  DELETE_UNIT:        'delete_unit',
  ADD_EXPENSE:        'add_expense',
  ADD_CHEQUE:         'add_cheque',
  ADD_WORK_ORDER:     'add_work_order',
  EDIT_WORK_ORDER:    'edit_work_order',
  CONDUCT_INSPECTION: 'conduct_inspection',
  ADD_COMM:           'add_comm',
  ADD_ANNOUNCEMENT:   'add_announcement',
  UPLOAD_DOCUMENT:    'upload_document',
  EDIT_DOCUMENT:      'edit_document',
  BULK_OPERATIONS:    'bulk_operations',
  GENERATE_REPORT:    'generate_report',
  INVITE_MEMBER:      'invite_member',
  REMOVE_MEMBER:      'remove_member',
  SUBMIT_MAINTENANCE: 'submit_maintenance',
  VIEW_OWN_UNIT:      'view_own_unit',
  VIEW_ANNOUNCEMENTS: 'view_announcements',
  VIEW_LEASE_INFO:    'view_lease_info',
  UPDATE_WO_STATUS:   'update_wo_status',
  UPLOAD_WO_PHOTO:    'upload_wo_photo',
  EXPORT_DATA:        'export_data',
}

// ─── Access permissions per role ────────────────────────────────────────────────
// canAccess: can the role SEE this feature/page/tab?

const ACCESS = {
  admin: new Set(Object.values(FEATURES)), // everything

  owner: new Set([
    FEATURES.DASHBOARD, FEATURES.PROPERTIES, FEATURES.PROPERTY_DETAIL,
    FEATURES.ALERTS, FEATURES.LOGS, FEATURES.TEAM, FEATURES.TENANTS, FEATURES.MESSAGES,
    FEATURES.CHEQUES, FEATURES.PORTFOLIO, FEATURES.SETTINGS,
    // All tabs
    FEATURES.TAB_OVERVIEW, FEATURES.TAB_UNITS, FEATURES.TAB_MAINTENANCE,
    FEATURES.TAB_WORK_ORDERS, FEATURES.TAB_FINANCIALS, FEATURES.TAB_INSPECTION,
    FEATURES.TAB_COMMS, FEATURES.TAB_ANNOUNCEMENTS, FEATURES.TAB_DOCUMENTS,
    FEATURES.TAB_UTILITIES, FEATURES.TAB_MOVE_OUT, FEATURES.TAB_BULK_OPS,
    FEATURES.TAB_REPORTS, FEATURES.TAB_TEAM, FEATURES.TAB_LOGS, FEATURES.TAB_3D_MODEL,
    // All actions
    FEATURES.ADD_PROPERTY, FEATURES.EDIT_PROPERTY, FEATURES.DELETE_PROPERTY,
    FEATURES.ADD_UNIT, FEATURES.EDIT_UNIT, FEATURES.DELETE_UNIT,
    FEATURES.ADD_EXPENSE, FEATURES.ADD_CHEQUE, FEATURES.ADD_WORK_ORDER,
    FEATURES.EDIT_WORK_ORDER, FEATURES.CONDUCT_INSPECTION, FEATURES.ADD_COMM,
    FEATURES.ADD_ANNOUNCEMENT, FEATURES.UPLOAD_DOCUMENT, FEATURES.EDIT_DOCUMENT,
    FEATURES.BULK_OPERATIONS, FEATURES.GENERATE_REPORT,
    FEATURES.INVITE_MEMBER, FEATURES.REMOVE_MEMBER, FEATURES.EXPORT_DATA,
  ]),

  property_manager: new Set([
    FEATURES.DASHBOARD, FEATURES.PROPERTIES, FEATURES.PROPERTY_DETAIL,
    FEATURES.ALERTS, FEATURES.LOGS, FEATURES.TEAM, FEATURES.TENANTS, FEATURES.MESSAGES,
    FEATURES.CHEQUES, FEATURES.SETTINGS,
    // All tabs except bulk ops
    FEATURES.TAB_OVERVIEW, FEATURES.TAB_UNITS, FEATURES.TAB_MAINTENANCE,
    FEATURES.TAB_WORK_ORDERS, FEATURES.TAB_FINANCIALS, FEATURES.TAB_INSPECTION,
    FEATURES.TAB_COMMS, FEATURES.TAB_ANNOUNCEMENTS, FEATURES.TAB_DOCUMENTS,
    FEATURES.TAB_UTILITIES, FEATURES.TAB_MOVE_OUT,
    FEATURES.TAB_REPORTS, FEATURES.TAB_TEAM, FEATURES.TAB_LOGS, FEATURES.TAB_3D_MODEL,
    // Actions — no delete property, no remove owner
    FEATURES.ADD_UNIT, FEATURES.EDIT_UNIT, FEATURES.DELETE_UNIT,
    FEATURES.EDIT_PROPERTY,
    FEATURES.ADD_EXPENSE, FEATURES.ADD_CHEQUE, FEATURES.ADD_WORK_ORDER,
    FEATURES.EDIT_WORK_ORDER, FEATURES.CONDUCT_INSPECTION, FEATURES.ADD_COMM,
    FEATURES.ADD_ANNOUNCEMENT, FEATURES.UPLOAD_DOCUMENT, FEATURES.EDIT_DOCUMENT,
    FEATURES.GENERATE_REPORT, FEATURES.INVITE_MEMBER, FEATURES.EXPORT_DATA,
  ]),

  staff: new Set([
    FEATURES.DASHBOARD, FEATURES.PROPERTIES, FEATURES.PROPERTY_DETAIL,
    FEATURES.ALERTS, FEATURES.SETTINGS,
    // Limited tabs
    FEATURES.TAB_OVERVIEW, FEATURES.TAB_UNITS, FEATURES.TAB_MAINTENANCE,
    FEATURES.TAB_WORK_ORDERS, FEATURES.TAB_INSPECTION, FEATURES.TAB_COMMS,
    FEATURES.TAB_ANNOUNCEMENTS, FEATURES.TAB_LOGS,
    // Limited actions
    FEATURES.ADD_WORK_ORDER, FEATURES.EDIT_WORK_ORDER,
    FEATURES.CONDUCT_INSPECTION, FEATURES.ADD_COMM,
  ]),

  vendor: new Set([
    FEATURES.DASHBOARD, FEATURES.SETTINGS,
    // Only work orders
    FEATURES.TAB_WORK_ORDERS,
    FEATURES.UPDATE_WO_STATUS, FEATURES.UPLOAD_WO_PHOTO,
  ]),

  tenant: new Set([
    FEATURES.DASHBOARD, FEATURES.SETTINGS,
    // Tenant-specific
    FEATURES.VIEW_OWN_UNIT, FEATURES.VIEW_LEASE_INFO,
    FEATURES.VIEW_ANNOUNCEMENTS, FEATURES.SUBMIT_MAINTENANCE,
    FEATURES.TAB_ANNOUNCEMENTS,
  ]),
}

// ─── Edit permissions per role ──────────────────────────────────────────────────
// canEdit: can the role MODIFY/CREATE/DELETE this feature?
// (A subset of access — you might be able to see but not edit)

const EDIT = {
  admin: new Set(Object.values(FEATURES)),

  owner: new Set([
    FEATURES.ADD_PROPERTY, FEATURES.EDIT_PROPERTY, FEATURES.DELETE_PROPERTY,
    FEATURES.ADD_UNIT, FEATURES.EDIT_UNIT, FEATURES.DELETE_UNIT,
    FEATURES.ADD_EXPENSE, FEATURES.ADD_CHEQUE, FEATURES.ADD_WORK_ORDER,
    FEATURES.EDIT_WORK_ORDER, FEATURES.CONDUCT_INSPECTION, FEATURES.ADD_COMM,
    FEATURES.ADD_ANNOUNCEMENT, FEATURES.UPLOAD_DOCUMENT, FEATURES.EDIT_DOCUMENT,
    FEATURES.BULK_OPERATIONS, FEATURES.GENERATE_REPORT,
    FEATURES.INVITE_MEMBER, FEATURES.REMOVE_MEMBER, FEATURES.EXPORT_DATA,
    FEATURES.TENANTS, FEATURES.TAB_MAINTENANCE, FEATURES.TAB_FINANCIALS,
  ]),

  property_manager: new Set([
    FEATURES.EDIT_PROPERTY,
    FEATURES.ADD_UNIT, FEATURES.EDIT_UNIT, FEATURES.DELETE_UNIT,
    FEATURES.ADD_EXPENSE, FEATURES.ADD_CHEQUE, FEATURES.ADD_WORK_ORDER,
    FEATURES.EDIT_WORK_ORDER, FEATURES.CONDUCT_INSPECTION, FEATURES.ADD_COMM,
    FEATURES.ADD_ANNOUNCEMENT, FEATURES.UPLOAD_DOCUMENT, FEATURES.EDIT_DOCUMENT,
    FEATURES.GENERATE_REPORT, FEATURES.INVITE_MEMBER, FEATURES.EXPORT_DATA,
    FEATURES.TENANTS, FEATURES.TAB_MAINTENANCE, FEATURES.TAB_FINANCIALS,
  ]),

  staff: new Set([
    FEATURES.ADD_WORK_ORDER, FEATURES.EDIT_WORK_ORDER,
    FEATURES.CONDUCT_INSPECTION, FEATURES.ADD_COMM,
    FEATURES.TAB_MAINTENANCE,
  ]),

  vendor: new Set([
    FEATURES.UPDATE_WO_STATUS, FEATURES.UPLOAD_WO_PHOTO,
  ]),

  tenant: new Set([
    FEATURES.SUBMIT_MAINTENANCE,
  ]),
}

// ─── Invitation permissions ─────────────────────────────────────────────────────
// Which roles can an inviter invite?

const INVITE_MAP = {
  admin:            ['property_manager', 'staff', 'vendor', 'tenant'],
  owner:            ['property_manager', 'staff', 'vendor', 'tenant'],
  property_manager: ['staff', 'vendor', 'tenant'],
  staff:            [],
  vendor:           [],
  tenant:           [],
}

// ─── Sidebar navigation items per role ──────────────────────────────────────────

export const SIDEBAR_ITEMS = {
  admin: [
    'dashboard', 'properties', 'alerts', 'logs', 'team', 'tenants',
    'messages', 'cheques', 'portfolio', 'settings',
    // Admin section
    'admin', 'admin_users', 'admin_analytics', 'admin_settings', 'admin_support_chat',
  ],
  owner: [
    'dashboard', 'properties', 'alerts', 'logs', 'team', 'tenants',
    'messages', 'cheques', 'portfolio', 'settings',
  ],
  property_manager: [
    'dashboard', 'properties', 'alerts', 'logs', 'team', 'tenants',
    'messages', 'cheques', 'settings',
  ],
  staff: [
    'dashboard', 'properties', 'alerts', 'settings',
  ],
  vendor: [
    'dashboard', 'settings',
  ],
  tenant: [
    'dashboard', 'settings',
  ],
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Check if a role can ACCESS (view) a feature
 * @param {string} role - User role
 * @param {string} feature - Feature key from FEATURES
 * @returns {boolean}
 */
export function canAccess(role, feature) {
  const perms = ACCESS[role]
  if (!perms) return false
  return perms.has(feature)
}

/**
 * Check if a role can EDIT (create/modify/delete) a feature
 * @param {string} role - User role
 * @param {string} feature - Feature key from FEATURES
 * @returns {boolean}
 */
export function canEdit(role, feature) {
  const perms = EDIT[role]
  if (!perms) return false
  return perms.has(feature)
}

/**
 * Check if an inviter role can invite a target role
 * @param {string} inviterRole - Role of the person sending the invite
 * @param {string} targetRole - Role being invited
 * @returns {boolean}
 */
export function canInvite(inviterRole, targetRole) {
  const allowed = INVITE_MAP[inviterRole]
  if (!allowed) return false
  return allowed.includes(targetRole)
}

/**
 * Get the list of roles an inviter can invite
 * @param {string} inviterRole
 * @returns {string[]}
 */
export function getInvitableRoles(inviterRole) {
  return INVITE_MAP[inviterRole] || []
}

/**
 * Get visible sidebar nav keys for a role
 * @param {string} role
 * @returns {string[]}
 */
export function getSidebarItems(role) {
  return SIDEBAR_ITEMS[role] || SIDEBAR_ITEMS.tenant
}

/**
 * Check if user can access a specific property
 * (admin = all, owner = own, others = linkedProperties)
 * @param {object} userProfile - User profile from Firestore
 * @param {string} propertyId - Property ID to check
 * @returns {boolean}
 */
export function canAccessProperty(userProfile, propertyId) {
  if (!userProfile) return false
  if (userProfile.role === 'admin') return true
  if (userProfile.role === 'owner') return true // owners access through their own Firestore path
  const linked = userProfile.linkedProperties || []
  return linked.includes(propertyId)
}

/**
 * Check if user can remove a specific team member
 * @param {string} removerRole - Role of the person trying to remove
 * @param {string} removerUid - UID of the person trying to remove
 * @param {object} invitation - The invitation document
 * @returns {boolean}
 */
export function canRemoveMember(removerRole, removerUid, invitation) {
  if (removerRole === 'admin') return true
  if (removerRole === 'owner') return true
  if (invitation.inviterUid === removerUid) return true
  return false
}
