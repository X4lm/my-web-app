import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * StarRating — 5-star picker. Read-only when onChange is not passed.
 */
export default function StarRating({ value = 0, onChange, size = 'md', className = '' }) {
  const stars = [1, 2, 3, 4, 5]
  const dim = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
  const readonly = !onChange
  return (
    <div className={cn('inline-flex items-center gap-0.5', className)} role={readonly ? 'img' : 'radiogroup'} aria-label={`${value} of 5 stars`}>
      {stars.map(n => {
        const filled = n <= value
        const Icon = Star
        const inner = (
          <Icon className={cn(dim, 'transition-colors', filled ? 'fill-[#D4A853] text-[#D4A853]' : 'text-muted-foreground/40')} />
        )
        if (readonly) return <span key={n}>{inner}</span>
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n === value ? 0 : n)}
            className="cursor-pointer p-0.5 hover:scale-110 transition-transform"
            aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
          >
            {inner}
          </button>
        )
      })}
    </div>
  )
}
