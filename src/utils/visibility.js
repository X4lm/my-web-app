/**
 * Visibility utilities — shared calculation helpers for property-manager
 * visibility features (priority queue, health score, cashflow forecast,
 * financial anomalies, document expiry).
 *
 * Pure functions. No React. No Firestore reads. Callers pass already-loaded
 * data (properties, units, cheques, expenses, work orders, documents).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / MS_PER_DAY)
}

/** Classify an "days until" value into an urgency bucket. */
export function urgencyBucket(days) {
  if (days === null || days === undefined) return 'none'
  if (days < 0) return 'overdue'
  if (days <= 7) return 'critical'
  if (days <= 30) return 'upcoming'
  if (days <= 90) return 'later'
  return 'future'
}

const URGENCY_WEIGHT = {
  overdue: 0,
  critical: 1,
  upcoming: 2,
  later: 3,
  future: 4,
  none: 5,
}

/** ─── Priority Queue ──────────────────────────────────────────────────────
 *  Aggregate a flat list of action items across all loaded data.
 *  Each item: { id, kind, level, title, subtitle, date, days, propertyId,
 *               propertyName, href, icon, accent }
 */
export function buildPriorityQueue({
  properties = [],
  cheques = [],      // [{ id, propertyId, propertyName, date, amount, status, chequeNumber }]
  workOrders = [],   // [{ id, propertyId, propertyName, title, status, priority, dueDate }]
  documents = [],    // [{ id, propertyId, propertyName, name, category, expiryDate }]
  alerts = [],       // already-computed alerts from usePropertyAlerts
}) {
  const items = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ─── Property insurance + municipality permit expiry ──────────────────
  for (const p of properties) {
    if (p.insuranceExpiry) {
      const d = daysUntil(p.insuranceExpiry)
      if (d !== null && d <= 60) {
        items.push({
          id: `${p.id}-ins`,
          kind: 'insurance',
          level: d < 0 ? 'overdue' : d <= 7 ? 'critical' : 'upcoming',
          title: 'Insurance renewal',
          subtitle: p.name,
          date: p.insuranceExpiry,
          days: d,
          propertyId: p.id,
          propertyName: p.name,
          href: `/properties/${p.id}`,
          accent: 'amber',
        })
      }
    }
    if (p.municipalityPermitExpiry) {
      const d = daysUntil(p.municipalityPermitExpiry)
      if (d !== null && d <= 60) {
        items.push({
          id: `${p.id}-permit`,
          kind: 'permit',
          level: d < 0 ? 'overdue' : d <= 7 ? 'critical' : 'upcoming',
          title: 'Municipality permit',
          subtitle: p.name,
          date: p.municipalityPermitExpiry,
          days: d,
          propertyId: p.id,
          propertyName: p.name,
          href: `/properties/${p.id}`,
          accent: 'amber',
        })
      }
    }
  }

  // ─── Cheques due / overdue ────────────────────────────────────────────
  for (const c of cheques) {
    if (c.status !== 'pending') continue
    const d = daysUntil(c.date)
    if (d === null) continue
    if (d > 30) continue
    items.push({
      id: `${c.propertyId}-chq-${c.id}`,
      kind: 'cheque',
      level: d < 0 ? 'overdue' : d <= 3 ? 'critical' : d <= 7 ? 'upcoming' : 'later',
      title: `Cheque ${c.chequeNumber ? '#' + c.chequeNumber : ''} · AED ${Number(c.amount || 0).toLocaleString()}`,
      subtitle: c.propertyName || 'Property',
      date: c.date,
      days: d,
      propertyId: c.propertyId,
      propertyName: c.propertyName,
      href: `/cheques`,
      accent: 'blue',
    })
  }

  // ─── Work orders — open / overdue ──────────────────────────────────────
  for (const wo of workOrders) {
    const openStatuses = new Set(['open', 'attended', 'in_progress', 'on_hold'])
    if (!openStatuses.has(wo.status)) continue
    const d = wo.dueDate ? daysUntil(wo.dueDate) : null
    const isHighPriority = wo.priority === 'urgent' || wo.priority === 'high'
    // include if due soon OR high priority and open
    if (d === null ? !isHighPriority : d > 30) continue
    items.push({
      id: `${wo.propertyId}-wo-${wo.id}`,
      kind: 'work_order',
      level: d !== null && d < 0 ? 'overdue' : wo.priority === 'urgent' ? 'critical' : d !== null && d <= 3 ? 'critical' : 'upcoming',
      title: wo.title || 'Work order',
      subtitle: `${wo.propertyName || ''}${wo.unitNumber ? ' · Unit ' + wo.unitNumber : ''} · ${wo.priority || 'medium'}`,
      date: wo.dueDate,
      days: d,
      propertyId: wo.propertyId,
      propertyName: wo.propertyName,
      href: `/properties/${wo.propertyId}`,
      accent: wo.priority === 'urgent' ? 'red' : 'amber',
    })
  }

  // ─── Documents expiring ────────────────────────────────────────────────
  for (const doc of documents) {
    if (!doc.expiryDate) continue
    const d = daysUntil(doc.expiryDate)
    if (d === null || d > 60) continue
    items.push({
      id: `${doc.propertyId}-doc-${doc.id}`,
      kind: 'document',
      level: d < 0 ? 'overdue' : d <= 7 ? 'critical' : d <= 30 ? 'upcoming' : 'later',
      title: doc.name || doc.category || 'Document',
      subtitle: `${doc.propertyName || ''} · ${doc.category || ''}`,
      date: doc.expiryDate,
      days: d,
      propertyId: doc.propertyId,
      propertyName: doc.propertyName,
      href: `/properties/${doc.propertyId}`,
      accent: 'amber',
    })
  }

  // ─── Lease / maintenance alerts from usePropertyAlerts ─────────────────
  // Skip section==='Property' (insurance / permit) — those are already added
  // from the property scan above; otherwise we get duplicate rows in the UI.
  for (const a of alerts) {
    if (a.section === 'Property') continue
    const d = daysUntil(a.date)
    if (d === null) continue
    if (d > 60) continue
    items.push({
      id: `${a.propertyId}-${a.section}-${a.field}`,
      kind: a.section === 'Lease' ? 'lease' : 'maintenance',
      level: a.level === 'overdue' ? 'overdue' : d <= 7 ? 'critical' : 'upcoming',
      title: a.field,
      subtitle: `${a.propertyName} · ${a.section}`,
      date: a.date,
      days: d,
      propertyId: a.propertyId,
      propertyName: a.propertyName,
      href: `/properties/${a.propertyId}`,
      accent: a.section === 'Lease' ? 'blue' : 'amber',
    })
  }

  // ─── Sort: urgency, then earliest date ─────────────────────────────────
  items.sort((a, b) => {
    const wa = URGENCY_WEIGHT[a.level] ?? 99
    const wb = URGENCY_WEIGHT[b.level] ?? 99
    if (wa !== wb) return wa - wb
    return (a.days ?? 999) - (b.days ?? 999)
  })

  return items
}

/** ─── Property Health Score ───────────────────────────────────────────────
 *  Returns 0–100 + breakdown. Higher is healthier.
 *
 *  Weights (total 100):
 *    occupancy 25, on-time-rent 25, maintenance compliance 20,
 *    document expiry 10, tenant turnover 10, alert-free-days 10.
 *
 *  Missing data collapses to neutral (partial credit) rather than 0.
 */
export function computeHealthScore({
  property,
  units = [],
  alerts = [],     // alerts FOR THIS PROPERTY
  cheques = [],    // cheques FOR THIS PROPERTY
  documents = [],  // docs FOR THIS PROPERTY
}) {
  const breakdown = {}

  // Occupancy
  if (units.length > 0) {
    const occupied = units.filter(u => u.status === 'occupied' || !!u.tenantName).length
    const rate = occupied / units.length
    breakdown.occupancy = Math.round(rate * 25)
  } else {
    // Villas / single units — treat property.status
    breakdown.occupancy = property?.status === 'occupied' ? 25 : 12
  }

  // On-time rent (cheques cleared vs bounced in last 90 days)
  const recentCheques = cheques.filter(c => {
    const d = daysUntil(c.date)
    return d !== null && d <= 0 && d >= -90
  })
  if (recentCheques.length > 0) {
    const bounced = recentCheques.filter(c => c.status === 'bounced' || c.status === 'cancelled').length
    const onTimeRate = 1 - (bounced / recentCheques.length)
    breakdown.rent = Math.round(onTimeRate * 25)
  } else {
    breakdown.rent = 18 // neutral
  }

  // Maintenance compliance (no overdue maintenance alerts)
  const maintAlerts = alerts.filter(a => a.section === 'Maintenance')
  const overdueM = maintAlerts.filter(a => a.level === 'overdue').length
  if (overdueM === 0) breakdown.maintenance = 20
  else if (overdueM === 1) breakdown.maintenance = 10
  else if (overdueM === 2) breakdown.maintenance = 4
  else breakdown.maintenance = 0

  // Document expiry — Property-level docs (insurance / permit) hit HARD when
  // overdue because losing a trade license or insurance is operationally severe.
  const propertyDocsOverdue = alerts.filter(a => a.section === 'Property' && a.level === 'overdue').length
  const expiredDocs = documents.filter(d => {
    const days = daysUntil(d.expiryDate)
    return days !== null && days < 0
  }).length
  const totalOverdueDocs = propertyDocsOverdue + expiredDocs
  if (totalOverdueDocs === 0) breakdown.documents = 10
  else if (totalOverdueDocs === 1) breakdown.documents = 3
  else breakdown.documents = 0

  // Tenant turnover — low turnover = higher score (approximated via lease overdue count)
  const overdueLease = alerts.filter(a => a.section === 'Lease' && a.level === 'overdue').length
  if (overdueLease === 0) breakdown.turnover = 10
  else if (overdueLease <= 1) breakdown.turnover = 6
  else breakdown.turnover = 2

  // Alert-free — heavier deduction per open alert (was too forgiving)
  const openAlerts = alerts.filter(a => a.level === 'overdue').length
  if (openAlerts === 0) breakdown.alerts = 10
  else if (openAlerts === 1) breakdown.alerts = 5
  else if (openAlerts === 2) breakdown.alerts = 2
  else breakdown.alerts = 0

  const score = Object.values(breakdown).reduce((s, n) => s + n, 0)
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'
  const tone = score >= 75 ? 'green' : score >= 55 ? 'amber' : 'red'

  return { score, grade, tone, breakdown }
}

/** ─── Financial anomaly detection ────────────────────────────────────────
 *  Flags expenses that exceed 2× the 90-day rolling average for their
 *  (property, category) pair. Returns array of flagged expenses enriched
 *  with `baseline` (avg) and `multiplier` (how many × normal).
 */
export function detectExpenseAnomalies(expenses = []) {
  if (expenses.length < 3) return []

  // Group by (propertyId + category)
  const groups = new Map()
  for (const e of expenses) {
    const key = `${e.propertyId}|${e.category || 'other'}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(e)
  }

  const flagged = []
  const today = new Date()
  const ninetyAgo = new Date(today.getTime() - 90 * MS_PER_DAY)

  for (const [, group] of groups) {
    if (group.length < 3) continue
    // Sort by date desc
    const sorted = [...group].sort((a, b) => (b.date > a.date ? 1 : -1))

    const recent = sorted[0]
    const recentDate = new Date(recent.date)
    if (recentDate < ninetyAgo) continue // recent-most is stale

    const prior = sorted.slice(1).filter(e => {
      const d = new Date(e.date)
      return d >= ninetyAgo && d < recentDate
    })
    if (prior.length < 2) continue

    const avg = prior.reduce((s, e) => s + Number(e.cost || 0), 0) / prior.length
    if (avg <= 0) continue
    const multiplier = Number(recent.cost || 0) / avg
    if (multiplier >= 2) {
      flagged.push({
        ...recent,
        baseline: avg,
        multiplier,
        priorCount: prior.length,
      })
    }
  }
  return flagged.sort((a, b) => b.multiplier - a.multiplier)
}

/** ─── Cashflow Timeline data ─────────────────────────────────────────────
 *  Groups cheques + expenses by month for next-6 / past-6 months.
 *  Returns array of { monthKey, monthLabel, inflow, outflow, net }.
 */
export function buildCashflowTimeline({ cheques = [], expenses = [], monthsBack = 3, monthsForward = 6 }) {
  const buckets = new Map()
  const now = new Date()
  const base = new Date(now.getFullYear(), now.getMonth(), 1)

  for (let i = -monthsBack; i <= monthsForward; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.set(key, {
      monthKey: key,
      monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      inflow: 0,
      outflow: 0,
      net: 0,
      offset: i,
    })
  }

  for (const c of cheques) {
    if (!c.date) continue
    if (c.status === 'bounced' || c.status === 'cancelled') continue
    const [y, m] = c.date.split('-')
    const key = `${y}-${m}`
    const b = buckets.get(key)
    if (b) b.inflow += Number(c.amount || 0)
  }

  for (const e of expenses) {
    if (!e.date) continue
    const [y, m] = e.date.split('-')
    const key = `${y}-${m}`
    const b = buckets.get(key)
    if (b) b.outflow += Number(e.cost || 0)
  }

  const arr = Array.from(buckets.values())
  for (const b of arr) b.net = b.inflow - b.outflow
  return arr
}

/** ─── Occupancy forecast ─────────────────────────────────────────────────
 *  Projects occupancy % over next N months based on unit.leaseEnd.
 */
export function buildOccupancyForecast({ units = [], monthsForward = 6 }) {
  const totalUnits = units.length
  if (totalUnits === 0) return []
  const now = new Date()
  const base = new Date(now.getFullYear(), now.getMonth(), 1)
  const forecast = []

  for (let i = 0; i <= monthsForward; i++) {
    const end = new Date(base.getFullYear(), base.getMonth() + i + 1, 0) // last day of month
    const occupied = units.filter(u => {
      if (!u.tenantName) return false
      if (!u.leaseEnd) return true // tenant with no explicit end → still occupied
      const leaseEnd = new Date(u.leaseEnd)
      return leaseEnd > end
    }).length
    forecast.push({
      monthKey: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`,
      monthLabel: end.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      occupied,
      total: totalUnits,
      rate: occupied / totalUnits,
    })
  }
  return forecast
}

/** ─── Emirate extraction for Atlas grouping ─────────────────────────────
 *  Best-effort keyword match on the address string.
 */
const EMIRATE_KEYWORDS = [
  { key: 'dubai',      match: /dubai|دبي/i },
  { key: 'abu_dhabi',  match: /abu\s?dhabi|أبوظبي|أبو ظبي/i },
  { key: 'sharjah',    match: /sharjah|الشارقة/i },
  { key: 'ajman',      match: /ajman|عجمان/i },
  { key: 'rak',        match: /ras\s?al\s?khaim|رأس الخيمة|ras al khaimah/i },
  { key: 'fujairah',   match: /fujairah|الفجيرة/i },
  { key: 'uaq',        match: /umm\s?al\s?quwain|أم القيوين/i },
]

export function emirateOf(property) {
  const addr = (property?.address || '') + ' ' + (property?.name || '')
  for (const e of EMIRATE_KEYWORDS) {
    if (e.match.test(addr)) return e.key
  }
  return 'other'
}

export const EMIRATE_LABELS = {
  dubai: 'Dubai',
  abu_dhabi: 'Abu Dhabi',
  sharjah: 'Sharjah',
  ajman: 'Ajman',
  rak: 'Ras Al Khaimah',
  fujairah: 'Fujairah',
  uaq: 'Umm Al Quwain',
  other: 'Other',
}

export const EMIRATE_LABELS_AR = {
  dubai: 'دبي',
  abu_dhabi: 'أبوظبي',
  sharjah: 'الشارقة',
  ajman: 'عجمان',
  rak: 'رأس الخيمة',
  fujairah: 'الفجيرة',
  uaq: 'أم القيوين',
  other: 'أخرى',
}
