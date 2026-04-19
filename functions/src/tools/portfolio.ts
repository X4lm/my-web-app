import { getFirestore } from 'firebase-admin/firestore'

// Tool registry for the advisor agent. Each tool is scoped to the caller's
// own data (passes uid from the callable context). Writes are NOT exposed
// in v1 — only reads.

export interface ToolContext {
  uid: string
}

export const portfolioTools = [
  {
    name: 'get_portfolio_summary',
    description:
      'Portfolio-wide totals for the current user: property count, unit count, occupancy %, monthly rent, active alerts. Call this first for any "overview" question.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_properties',
    description:
      "Return a compact list of the user's properties (id, name, address, type, status, emirate, monthly rent). Use when the user references properties by name or asks to compare.",
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_property',
    description:
      'Full details for one property by ID, including any units. Use after list_properties when the user asks about a specific property.',
    input_schema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: "The property's Firestore document ID" },
      },
      required: ['propertyId'],
    },
  },
  {
    name: 'list_alerts',
    description:
      'Active alerts across the entire portfolio (overdue maintenance, expiring insurance/permits, late cheques). Use when the user asks "what needs my attention".',
    input_schema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          enum: ['overdue', 'upcoming', 'all'],
          description: 'Filter by urgency. Default: all',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_expiring_documents',
    description:
      'Documents expiring within N days (insurance, permits, Ejari, visas). Default: 30 days.',
    input_schema: {
      type: 'object',
      properties: {
        withinDays: { type: 'integer', description: 'Lookahead window. Default: 30' },
      },
      required: [],
    },
  },
] as const

// ──────────────────────────────────────────────────────────────────────
// Tool executors — each returns a plain object the model sees as JSON.
// Keep return shapes compact; big responses burn tokens.
// ──────────────────────────────────────────────────────────────────────

type ToolResult = Record<string, unknown>

export async function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const db = getFirestore()

  switch (name) {
    case 'get_portfolio_summary':
      return getPortfolioSummary(db, ctx.uid)
    case 'list_properties':
      return listProperties(db, ctx.uid)
    case 'get_property':
      return getProperty(db, ctx.uid, String(input.propertyId || ''))
    case 'list_alerts':
      return listAlerts(db, ctx.uid, (input.level as string) || 'all')
    case 'list_expiring_documents':
      return listExpiringDocuments(db, ctx.uid, Number(input.withinDays) || 30)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

async function getPortfolioSummary(db: FirebaseFirestore.Firestore, uid: string): Promise<ToolResult> {
  const propsSnap = await db.collection('users').doc(uid).collection('properties').get()
  const properties = propsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))
  const totalProps = properties.length
  const available = properties.filter(p => p.status === 'available').length
  const occupied = properties.filter(p => p.status === 'occupied').length

  // Unit rollup
  let totalUnits = 0
  let occupiedUnits = 0
  let monthlyRent = 0
  const MULTI_UNIT_TYPES = new Set(['residential_building', 'commercial_building', 'mixed_use'])
  for (const p of properties) {
    if (MULTI_UNIT_TYPES.has(p.type)) {
      const unitsSnap = await db
        .collection('users').doc(uid)
        .collection('properties').doc(p.id)
        .collection('units')
        .get()
      for (const u of unitsSnap.docs) {
        const ud: any = u.data()
        totalUnits++
        if (ud.tenantName && String(ud.tenantName).trim()) {
          occupiedUnits++
          monthlyRent += Number(ud.monthlyRent || 0)
        }
      }
    } else {
      totalUnits++
      if (p.status === 'occupied') {
        occupiedUnits++
        monthlyRent += Number(p.rentAmount || 0)
      }
    }
  }

  return {
    totalProperties: totalProps,
    availableProperties: available,
    occupiedProperties: occupied,
    totalUnits,
    occupiedUnits,
    occupancyRatePct: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
    monthlyIncomeAED: monthlyRent,
  }
}

async function listProperties(db: FirebaseFirestore.Firestore, uid: string): Promise<ToolResult> {
  const snap = await db.collection('users').doc(uid).collection('properties').get()
  return {
    properties: snap.docs.map(d => {
      const x: any = d.data()
      return {
        id: d.id,
        name: x.name,
        address: x.address,
        type: x.type,
        status: x.status,
        emirate: inferEmirate(x.address),
        monthlyRentAED: Number(x.rentAmount || 0),
      }
    }),
  }
}

async function getProperty(db: FirebaseFirestore.Firestore, uid: string, propertyId: string): Promise<ToolResult> {
  if (!propertyId) return { error: 'propertyId is required' }
  const snap = await db.collection('users').doc(uid).collection('properties').doc(propertyId).get()
  if (!snap.exists) return { error: 'Property not found or not accessible.' }
  const p: any = { id: snap.id, ...snap.data() }

  // Scrub private-looking fields; keep only what the model needs.
  const result: Record<string, unknown> = {
    id: p.id,
    name: p.name,
    address: p.address,
    type: p.type,
    status: p.status,
    emirate: inferEmirate(p.address),
    monthlyRentAED: Number(p.rentAmount || 0),
    yearBuilt: p.yearBuilt,
    insuranceExpiry: p.insuranceExpiry,
    municipalityPermitExpiry: p.municipalityPermitExpiry,
  }

  // Pull units if building.
  const MULTI_UNIT_TYPES = new Set(['residential_building', 'commercial_building', 'mixed_use'])
  if (MULTI_UNIT_TYPES.has(p.type)) {
    const unitsSnap = await db
      .collection('users').doc(uid)
      .collection('properties').doc(propertyId)
      .collection('units').get()
    result.units = unitsSnap.docs.map(u => {
      const ud: any = u.data()
      return {
        id: u.id,
        unitNumber: ud.unitNumber,
        floor: ud.floor,
        type: ud.type,
        tenantName: ud.tenantName || null,
        monthlyRentAED: Number(ud.monthlyRent || 0),
        leaseStart: ud.leaseStart,
        leaseEnd: ud.leaseEnd,
        paymentStatus: ud.paymentStatus,
      }
    })
  }

  return result
}

async function listAlerts(db: FirebaseFirestore.Firestore, uid: string, level: string): Promise<ToolResult> {
  const propsSnap = await db.collection('users').doc(uid).collection('properties').get()
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const in30 = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10)

  const alerts: any[] = []
  for (const p of propsSnap.docs) {
    const pd: any = p.data()
    const pushIfDate = (dateStr: string, type: string, descr: string) => {
      if (!dateStr) return
      if (dateStr < todayStr) alerts.push({ property: pd.name, propertyId: p.id, type, description: descr, level: 'overdue', date: dateStr })
      else if (dateStr <= in30) alerts.push({ property: pd.name, propertyId: p.id, type, description: descr, level: 'upcoming', date: dateStr })
    }
    pushIfDate(pd.insuranceExpiry, 'insurance', 'Insurance expiry')
    pushIfDate(pd.municipalityPermitExpiry, 'permit', 'Municipality permit expiry')
  }

  const filtered = level === 'all' ? alerts : alerts.filter(a => a.level === level)
  return { count: filtered.length, alerts: filtered.slice(0, 30) }
}

async function listExpiringDocuments(db: FirebaseFirestore.Firestore, uid: string, withinDays: number): Promise<ToolResult> {
  const propsSnap = await db.collection('users').doc(uid).collection('properties').get()
  const threshold = new Date(Date.now() + withinDays * 86400000).toISOString().slice(0, 10)
  const todayStr = new Date().toISOString().slice(0, 10)

  const expiring: any[] = []
  for (const p of propsSnap.docs) {
    const docsSnap = await db
      .collection('users').doc(uid)
      .collection('properties').doc(p.id)
      .collection('documents').get()
    for (const d of docsSnap.docs) {
      const dd: any = d.data()
      if (!dd.expiryDate) continue
      if (dd.expiryDate <= threshold) {
        expiring.push({
          property: (p.data() as any).name,
          name: dd.name,
          category: dd.category,
          expiryDate: dd.expiryDate,
          status: dd.expiryDate < todayStr ? 'expired' : 'expiring',
        })
      }
    }
  }
  expiring.sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''))
  return { count: expiring.length, documents: expiring.slice(0, 40) }
}

function inferEmirate(address: string | undefined): string {
  if (!address) return 'UAE'
  const a = address.toLowerCase()
  if (a.includes('dubai')) return 'Dubai'
  if (a.includes('abu dhabi') || a.includes('abudhabi')) return 'Abu Dhabi'
  if (a.includes('sharjah')) return 'Sharjah'
  if (a.includes('ajman')) return 'Ajman'
  if (a.includes('ras al khaimah') || a.includes('rak')) return 'Ras Al Khaimah'
  if (a.includes('fujairah')) return 'Fujairah'
  if (a.includes('umm al quwain') || a.includes('uaq')) return 'Umm Al Quwain'
  return 'UAE'
}
