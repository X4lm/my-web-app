import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Property type config ──
export const TYPE_LABELS = {
  villa: 'Villa',
  townhouse: 'Townhouse',
  apartment: 'Apartment',
  residential_building: 'Residential Building',
  commercial_building: 'Commercial Building',
  mixed_use: 'Mixed Use',
  office: 'Office',
  retail: 'Retail',
  warehouse: 'Warehouse',
}

// Property types that have a units sub-collection
export const MULTI_UNIT_TYPES = new Set([
  'residential_building',
  'commercial_building',
  'mixed_use',
])

export function hasUnits(propertyType) {
  return MULTI_UNIT_TYPES.has(propertyType)
}

// Unit type labels
export const UNIT_TYPE_LABELS = {
  studio: 'Studio',
  '1br': '1 BR',
  '2br': '2 BR',
  '3br': '3 BR',
  office: 'Office',
  retail: 'Retail',
  warehouse: 'Warehouse',
  showroom: 'Showroom',
}

// Compare two flat objects and return an array of { field, from, to }
export function diffFields(oldObj, newObj, labelMap = {}) {
  const changes = []
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])
  for (const key of allKeys) {
    if (key.startsWith('_') || key === 'updatedAt' || key === 'createdAt' || key === 'updatedBy' || key === 'createdBy') continue
    const oldVal = oldObj?.[key] ?? ''
    const newVal = newObj?.[key] ?? ''
    if (String(oldVal) !== String(newVal)) {
      changes.push({
        field: labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
        from: oldVal === '' ? '(empty)' : String(oldVal),
        to: newVal === '' ? '(empty)' : String(newVal),
      })
    }
  }
  return changes
}
