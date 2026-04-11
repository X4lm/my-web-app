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
